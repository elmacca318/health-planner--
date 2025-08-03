export interface Medication {
  id: number;
  name: string;
  dosage: string;
  time: string;
}

export interface HealthData {
  age: string;
  height: string;
  weight: string;
  diseases: string;
  exercise: string[];
  customExercise: string; // เพิ่มช่องสำหรับกิจกรรมที่ผู้ใช้กรอกเอง
  budget: string;
  takesMedication: boolean;
  medications: Medication[];
  favoriteFoods: string;
}

export interface MealOption {
    name: string;
    calories: number;
    cost: string; // เพิ่มราคาสำหรับแต่ละเมนู
}

export interface ExerciseOption {
    name: string;
    target: string; // e.g., "30 นาที", "2 กม.", "3 เซต"
    caloriesBurned: number;
}

export interface DailyMeals {
  dailyCost: string;
  breakfast: MealOption[];
  breakfastCost: string;
  lunch: MealOption[];
  lunchCost: string;
  dinner: MealOption[];
  dinnerCost: string;
  rationale: string;
}

export interface MealPlan {
  summary: string;
  estimatedCost: string;
  weeklyPlan: {
    monday: DailyMeals;
    tuesday: DailyMeals;
    wednesday: DailyMeals;
    thursday: DailyMeals;
    friday: DailyMeals;
    saturday: DailyMeals;
    sunday: DailyMeals;
  };
  weeklyExercisePlan: {
    monday: ExerciseOption[];
    tuesday: ExerciseOption[];
    wednesday: ExerciseOption[];
    thursday: ExerciseOption[];
    friday: ExerciseOption[];
    saturday: ExerciseOption[];
    sunday: ExerciseOption[];
  };
  totalCaloriesBurned: number;
  recommendedSleep: string;
}

// เพิ่ม interface สำหรับข้อความในแชท
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    proposedPlan?: MealPlan | null; // ทำให้ข้อความสามารถแนบแผนใหม่มาได้
}


export const dayOrder: (keyof MealPlan['weeklyPlan'])[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];

export const dayLabels: Record<keyof MealPlan['weeklyPlan'], string> = {
    monday: 'วันจันทร์',
    tuesday: 'วันอังคาร',
    wednesday: 'วันพุธ',
    thursday: 'วันพฤหัสบดี',
    friday: 'วันศุกร์',
    saturday: 'วันเสาร์',
    sunday: 'วันอาทิตย์',
};

// อัปเดตและจัดเรียงรายการการออกกำลังกายใหม่
export const exerciseOptions = [
    // คาร์ดิโอ (Cardio)
    "เดิน",
    "วิ่ง",
    "วิ่งในลู่วิ่ง", // เปลี่ยนจาก "รำไทเก็ก"
    "ปั่นจักรยาน",
    "ว่ายน้ำ",
    "เต้นแอโรบิกเบาๆ",
    // ความแข็งแรง (Strength)
    "ยกน้ำหนัก",
    "กายบริหารเบาๆ",
    // ความยืดหยุ่นและการทรงตัว (Flexibility & Balance)
    "โยคะ",
    "ยืดเหยียดกล้ามเนื้อ",
    "แกว่งแขน",
    // อื่นๆ (Other)
    "ทำงานบ้าน",
    // "ทำสวน" ถูกลบออกไป
];