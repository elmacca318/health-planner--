
import { GoogleGenAI, Type } from "@google/genai";
import { MealPlan, HealthData, MealOption } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("Missing API_KEY environment variable.");
}

export const ai = new GoogleGenAI({ apiKey: API_KEY });

const mealOptionSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "ชื่อเมนูอาหาร" },
        calories: { type: Type.NUMBER, description: "ปริมาณแคลอรี่โดยประมาณของเมนูนี้" },
        cost: { type: Type.STRING, description: "ประมาณการราคาของเมนูนี้ (บาท) เช่น '40-50 บาท'" }
    },
    required: ["name", "calories", "cost"]
};

const mealSchema = {
    type: Type.OBJECT,
    properties: {
        dailyCost: { type: Type.STRING, description: "ประมาณการค่าใช้จ่ายรวมสำหรับทั้ง 3 มื้อในวันนี้ (บาท) เช่น '150-200 บาท'" },
        breakfast: { 
            type: Type.ARRAY, 
            description: "รายการเมนูอาหารเช้า (2-3 ตัวเลือก) พร้อมแคลอรี่และราคา",
            items: mealOptionSchema 
        },
        breakfastCost: { type: Type.STRING, description: "ประมาณการค่าใช้จ่ายสำหรับมื้อเช้า (บาท) เช่น '40-50 บาท'" },
        lunch: { 
            type: Type.ARRAY, 
            description: "รายการเมนูอาหารกลางวัน (2-3 ตัวเลือก) พร้อมแคลอรี่และราคา",
            items: mealOptionSchema 
        },
        lunchCost: { type: Type.STRING, description: "ประมาณการค่าใช้จ่ายสำหรับมื้อกลางวัน (บาท) เช่น '60-80 บาท'" },
        dinner: { 
            type: Type.ARRAY, 
            description: "รายการเมนูอาหารเย็น (2-3 ตัวเลือก) พร้อมแคลอรี่และราคา",
            items: mealOptionSchema 
        },
        dinnerCost: { type: Type.STRING, description: "ประมาณการค่าใช้จ่ายสำหรับมื้อเย็น (บาท) เช่น '60-80 บาท'" },
        rationale: { type: Type.STRING, description: "คำอธิบายสั้นๆ (2-3 ประโยค) ว่าทำไมชุดอาหารสำหรับวันนี้ (ตามตัวเลือกแรกที่ให้) จึงดีต่อสุขภาพของผู้ใช้ และให้สารอาหารหลักอะไรบ้าง" },
    },
    required: ["dailyCost", "breakfast", "breakfastCost", "lunch", "lunchCost", "dinner", "dinnerCost", "rationale"],
};

const exerciseOptionSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "ชื่อกิจกรรมการออกกำลังกาย" },
        target: { type: Type.STRING, description: "เป้าหมายของกิจกรรม เช่น '30 นาที', '2 กิโลเมตร', หรือ '3 เซต x 10 ครั้ง'" },
        caloriesBurned: { type: Type.NUMBER, description: "ปริมาณแคลอรี่ที่เผาผลาญโดยประมาณจากกิจกรรมนี้" }
    },
    required: ["name", "target", "caloriesBurned"]
};

const exercisePlanSchema = {
    type: Type.OBJECT,
    properties: {
        monday: { type: Type.ARRAY, items: exerciseOptionSchema, description: "รายการกิจกรรมการออกกำลังกายสำหรับวันจันทร์" },
        tuesday: { type: Type.ARRAY, items: exerciseOptionSchema, description: "รายการกิจกรรมการออกกำลังกายสำหรับวันอังคาร" },
        wednesday: { type: Type.ARRAY, items: exerciseOptionSchema, description: "รายการกิจกรรมการออกกำลังกายสำหรับวันพุธ" },
        thursday: { type: Type.ARRAY, items: exerciseOptionSchema, description: "รายการกิจกรรมการออกกำลังกายสำหรับวันพฤหัสบดี" },
        friday: { type: Type.ARRAY, items: exerciseOptionSchema, description: "รายการกิจกรรมการออกกำลังกายสำหรับวันศุกร์" },
        saturday: { type: Type.ARRAY, items: exerciseOptionSchema, description: "รายการกิจกรรมการออกกำลังกายสำหรับวันเสาร์" },
        sunday: { type: Type.ARRAY, items: exerciseOptionSchema, description: "รายการกิจกรรมการออกกำลังกายสำหรับวันอาทิตย์ หรือ 'พักผ่อน'" },
    },
    required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "บทสรุปภาพรวมและคำแนะนำว่าทำไมแผนสุขภาพนี้จึงเหมาะสมกับผู้ใช้ โดยอ้างอิงจากข้อมูลที่ได้รับ" },
        estimatedCost: { type: Type.STRING, description: "ประมาณการค่าใช้จ่ายสำหรับอาหารทั้งสัปดาห์ เป็นสกุลเงินบาท เช่น '1,200 - 1,500 บาท'" },
        weeklyPlan: {
            type: Type.OBJECT,
            properties: {
                monday: mealSchema,
                tuesday: mealSchema,
                wednesday: mealSchema,
                thursday: mealSchema,
                friday: mealSchema,
                saturday: mealSchema,
                sunday: mealSchema,
            },
            required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        },
        weeklyExercisePlan: { ...exercisePlanSchema, description: "แผนการออกกำลังกายรายสัปดาห์ที่เหมาะสมพร้อมตัวเลือก,เป้าหมาย และแคลอรี่ที่เผาผลาญ" },
        totalCaloriesBurned: { type: Type.NUMBER, description: "ผลรวมแคลอรี่ที่เผาผลาญโดยประมาณจากการออกกำลังกายตลอดทั้งสัปดาห์ (ใช้ค่าเฉลี่ยจากตัวเลือกแรกของแต่ละวัน)"},
        recommendedSleep: { type: Type.STRING, description: "คำแนะนำเรื่องการนอนหลับพักผ่อนที่เหมาะสม เช่น 'ควรนอนหลับ 7-8 ชั่วโมงต่อคืน โดยเข้านอนเวลา 22:00 น. และตื่นนอนเวลา 6:00 น.'" },
    },
     required: ["summary", "estimatedCost", "weeklyPlan", "weeklyExercisePlan", "totalCaloriesBurned", "recommendedSleep"],
};

export const generateMealPlan = async (data: HealthData): Promise<MealPlan> => {
    
    const heightInMeters = parseFloat(data.height) / 100;
    const weight = parseFloat(data.weight);
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);
    
    const medicationInfo = data.takesMedication && data.medications.length > 0
        ? `\n- ยาที่ใช้ประจำ: ${data.medications.map(m => `${m.name} (ขนาด ${m.dosage}, เวลา ${m.time})`).join(', ')} (โปรดพิจารณาอาหารที่อาจมีผลกับยาเหล่านี้)`
        : '\n- ยาที่ใช้ประจำ: ไม่มี';

    const favoriteFoodsInfo = data.favoriteFoods ? `\n- เมนูโปรดของผู้ใช้ (พยายามแทรกในแผนถ้าเหมาะสม): ${data.favoriteFoods}` : '';
    const customExerciseInfo = data.customExercise ? `\n- กิจกรรมอื่นๆ ที่ผู้ใช้ระบุเอง: ${data.customExercise}` : '';

    const prompt = `
        คุณคือสุดยอดนักโภชนาการ นักกายภาพบำบัด และผู้เชี่ยวชาญด้านการนอน ที่เชี่ยวชาญด้านการวางแผนสุขภาพองค์รวมสำหรับผู้สูงอายุในประเทศไทย

        โปรดสร้าง **แผนสุขภาพแบบองค์รวม 7 วัน** (วันจันทร์ถึงวันอาทิตย์) โดยพิจารณาจากข้อมูลของผู้ใช้ดังต่อไปนี้:
        - อายุ: ${data.age} ปี
        - น้ำหนัก: ${data.weight} กก.
        - ส่วนสูง: ${data.height} ซม.
        - ดัชนีมวลกาย (BMI): ${bmi}
        - โรคประจำตัว: ${data.diseases || 'ไม่มี'}
        - กิจกรรมการออกกำลังกายที่สนใจ: ${data.exercise.join(', ') || 'ไม่ระบุ'}
        ${customExerciseInfo}
        - งบประมาณอาหารต่อสัปดาห์: ${data.budget || 'ไม่จำกัด'} บาท
        ${medicationInfo}
        ${favoriteFoodsInfo}

        คำแนะนำในการสร้างแผน:
        1.  **แผนอาหาร**:
            -   **สุขภาพต้องมาก่อน**: ออกแบบเมนูอาหารที่เหมาะสมกับวัย ภาวะสุขภาพ และยาที่ผู้ใช้ทาน หลีกเลี่ยงอาหารที่อาจเป็นอันตรายต่อโรคประจำตัวที่ระบุ
            -   **ความหลากหลาย**: สร้างสรรค์เมนูที่หลากหลาย ไม่ซ้ำซากจำเจในแต่ละวันและตลอดทั้งสัปดาห์
            -   **เมนูทางเลือกพร้อมแคลอรี่และราคา**: สำหรับแต่ละมื้อ (เช้า, กลางวัน, เย็น) ของทุกวัน โปรดเสนอเมนูอาหาร 2-3 อย่างเป็นตัวเลือก และ **ต้องระบุปริมาณแคลอรี่และราคาโดยประมาณสำหรับทุกเมนู**
            -   **คุมงบประมาณ**: ประเมินค่าใช้จ่ายรายมื้อ (breakfastCost, lunchCost, dinnerCost), รายวัน (dailyCost), และภาพรวมรายสัปดาห์ (estimatedCost) ให้ใกล้เคียงกับงบที่กำหนด
            -   **วัตถุดิบท้องถิ่น**: ใช้ส่วนผสมที่หาซื้อง่ายในตลาดหรือซูเปอร์มาร์เก็ตทั่วไปในประเทศไทย
            -   **คำอธิบายรายวัน (Rationale)**: สำหรับแต่ละวัน ให้เขียนคำอธิบายสั้นๆ (2-3 ประโยค) ว่าทำไมชุดอาหาร (ตามตัวเลือกแรกที่ให้) จึงดีต่อสุขภาพของผู้ใช้ และให้สารอาหารหลักอะไรบ้าง

        2.  **แผนการออกกำลังกาย (สำคัญมาก!):**
            -   **ยึดตามความสนใจของผู้ใช้เป็นหลัก**: แผนการออกกำลังกายในแต่ละวัน **ต้อง** สร้างขึ้นโดยอิงจากกิจกรรมที่ผู้ใช้เลือกไว้เท่านั้น (${data.exercise.join(', ') || 'ไม่ระบุ'}${customExerciseInfo}).
            -   **ออกแบบโปรแกรมที่เกี่ยวข้อง**: สำหรับแต่ละวัน ให้สร้างสรรค์โปรแกรมการออกกำลังกายที่แตกต่างกันประมาณ **3-5 รูปแบบ** เป็นตัวเลือก โดยแต่ละรูปแบบต้องเป็น **รูปแบบย่อยหรือมีความเกี่ยวข้องโดยตรง** กับกิจกรรมหลักที่ผู้ใช้เลือกไว้.
            -   **ตัวอย่าง**: หากผู้ใช้เลือก 'วิ่งในลู่วิ่ง', ตัวเลือกในวันนั้นอาจเป็น: 'วิ่งเหยาะๆ 30 นาที', 'เดินเร็วชัน 20 นาที', 'วิ่งสลับความเร็ว 15 นาที'. หากผู้ใช้เลือก 'โยคะ', ตัวเลือกอาจเป็น 'โยคะยืดเหยียด', 'โยคะสร้างความแข็งแรง', 'โยคะเพื่อการทรงตัว'. **ห้าม** เสนอการออกกำลังกายที่ผู้ใช้ไม่ได้เลือก เช่น หากผู้ใช้เลือก 'วิ่ง' ก็ห้ามเสนอ 'ว่ายน้ำ' ในแผน.
            -   **เป้าหมายและแคลอรี่**: แต่ละตัวเลือกต้องระบุ **เป้าหมายที่ชัดเจน (target)** (เช่น '30 นาที', '2 กม.') และ **ปริมาณแคลอรี่ที่เผาผลาญ (caloriesBurned)** ซึ่งต้องคำนวณอย่างแม่นยำตามข้อมูลส่วนตัวของผู้ใช้.
            -   กำหนดวันพักผ่อนที่เหมาะสม (อย่างน้อย 1-2 วัน) โดยอาจให้เป็น 'พักผ่อน' หรือ 'ยืดเส้นยืดสายเบาๆ'.

        3.  **การนอนหลับ**:
            -   ให้คำแนะนำเรื่องการนอนหลับที่เหมาะสมกับวัยของผู้ใช้ ทั้งจำนวนชั่วโมงและช่วงเวลาที่แนะนำ

        4.  **ภาพรวม**:
            -   เขียนบทสรุปสั้นๆ ว่าทำไมแผนนี้ถึงดีต่อสุขภาพของผู้ใช้
            -   เนื้อหาทั้งหมดต้องเป็นภาษาไทย

        โปรดสร้างผลลัพธ์ตามโครงสร้าง JSON ที่กำหนดอย่างเคร่งครัด
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.6,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText.startsWith('{')) {
             throw new Error("AI response is not in the expected JSON format.");
        }
       
        return JSON.parse(jsonText) as MealPlan;

    } catch (e) {
        console.error("Error generating meal plan:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI generation.";
        throw new Error(`ไม่สามารถสร้างแผนสุขภาพได้ โปรดลองอีกครั้งในภายหลัง หรือปรับข้อมูลที่กรอก: ${errorMessage}`);
    }
};


export const generateDailyRationale = async (
    day: string, 
    meals: { breakfast?: MealOption; lunch?: MealOption; dinner?: MealOption },
    healthData: HealthData
): Promise<{ rationale: string }> => {
    
    const prompt = `
        ผู้ใช้รายนี้มีข้อมูลสุขภาพดังนี้:
        - อายุ: ${healthData.age} ปี
        - โรคประจำตัว: ${healthData.diseases || 'ไม่มี'}
        - ยาที่ใช้: ${healthData.takesMedication ? healthData.medications.map(m => m.name).join(', ') : 'ไม่มี'}

        สำหรับ **${day}** ผู้ใช้ได้เลือกเมนูอาหารดังนี้:
        - มื้อเช้า: ${meals.breakfast?.name ?? 'ไม่ได้เลือก'} (ราคา ${meals.breakfast?.cost ?? 'N/A'})
        - มื้อกลางวัน: ${meals.lunch?.name ?? 'ไม่ได้เลือก'} (ราคา ${meals.lunch?.cost ?? 'N/A'})
        - มื้อเย็น: ${meals.dinner?.name ?? 'ไม่ได้เลือก'} (ราคา ${meals.dinner?.cost ?? 'N/A'})
        
        จากข้อมูลข้างต้น โปรดวิเคราะห์และให้ **คำอธิบายทางโภชนาการสั้นๆ (2-3 ประโยค)** ว่าชุดอาหารที่ผู้ใช้เลือกในวันนี้เหมาะสมกับสุขภาพของเขาอย่างไร และให้สารอาหารที่สำคัญอะไรบ้าง
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rationale: { type: Type.STRING }
                    },
                    required: ["rationale"]
                },
                temperature: 0.3
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as { rationale: string };

    } catch (e) {
        console.error("Error generating daily rationale:", e);
        const errorMessage = e instanceof Error ? e.message : "Unknown error.";
        throw new Error(`Failed to generate rationale: ${errorMessage}`);
    }
};
