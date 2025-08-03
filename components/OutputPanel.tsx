
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { MealPlan, dayOrder, dayLabels, MealOption, ExerciseOption, HealthData } from '../types';
import { generateDailyRationale } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import SectionCard from './SectionCard';
import { AppleIcon, CalendarDaysIcon, ClipboardListIcon, SparklesIcon, DumbbellIcon, MoonIcon, BookmarkIcon, DownloadIcon, RefreshCwIcon, CoffeeIcon, SoupIcon, UtensilsIcon } from './icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface OutputPanelProps {
  plan: MealPlan | null;
  isLoading: boolean;
  error: string | null;
  onSavePlan: () => void;
  isPlanSaved: boolean;
  healthData: HealthData;
}

type SelectionType = 'breakfast' | 'lunch' | 'dinner' | 'exercise';
type Selections = { [day: string]: { [type in SelectionType]?: number } };


const MealSelect: React.FC<{ options: MealOption[]; selectedIndex: number; onChange: (index: number) => void; }> = ({ options, selectedIndex, onChange }) => {
    if (!options || options.length === 0) return <p className="text-slate-500 italic">ไม่มีข้อมูล</p>;
    
    return (
        <select 
            value={selectedIndex} 
            onChange={e => onChange(parseInt(e.target.value))}
            className="w-full rounded-md border-slate-300 bg-white py-1.5 px-2 text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
            {options.map((option, index) => (
                <option key={index} value={index}>{`${option.name} (~${option.calories} kcal, ${option.cost})`}</option>
            ))}
        </select>
    );
};

const ExerciseSelect: React.FC<{ options: ExerciseOption[]; selectedIndex: number; onChange: (index: number) => void; }> = ({ options, selectedIndex, onChange }) => {
    if (!options || options.length === 0) return <p className="text-slate-500 italic">ไม่มีข้อมูล</p>;
    
    if (options.length === 1 && options[0].caloriesBurned === 0) {
        return <span className="text-slate-600 dark:text-slate-300 text-right w-full">{`${options[0].name} (${options[0].target})`}</span>;
    }
    
    return (
        <select 
            value={selectedIndex}
            onChange={e => onChange(parseInt(e.target.value))}
            className="w-full text-right rounded-md border-slate-300 bg-white py-1.5 px-2 text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
            {options.map((option, index) => (
                <option key={index} value={index}>{`${option.name} (${option.target}) ~${option.caloriesBurned} kcal`}</option>
            ))}
        </select>
    );
};

const WelcomeScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 p-4 rounded-full mb-6">
        <AppleIcon className="w-12 h-12" />
    </div>
    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
      ผู้วางแผนสุขภาพและอาหาร
    </h2>
    <p className="mt-2 max-w-xl text-slate-500 dark:text-slate-400">
      เริ่มต้นมีสุขภาพที่ดีขึ้นได้แล้ววันนี้! เพียงกรอกข้อมูลของคุณในแผงด้านซ้าย หรือโหลดแผนที่เคยบันทึกไว้ เพื่อให้ AI สร้างสรรค์แผนสุขภาพที่เหมาะสมที่สุดสำหรับคุณ
    </p>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-50 dark:bg-red-900/50 rounded-lg">
        <h3 className="text-xl font-bold text-red-700 dark:text-red-300">เกิดข้อผิดพลาด</h3>
        <p className="mt-2 text-red-600 dark:text-red-400">{message}</p>
    </div>
);

const ActionToolbar: React.FC<{ onSave: () => void; onExport: (format: 'jpeg' | 'pdf') => void; isSaved: boolean }> = ({ onSave, onExport, isSaved }) => (
    <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10 p-2 mb-6 rounded-lg border dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-end gap-2">
            <button onClick={onSave} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${isSaved ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                <BookmarkIcon className="w-4 h-4" />
                <span>{isSaved ? 'บันทึกแล้ว' : 'บันทึกแผน'}</span>
            </button>
            <button onClick={() => onExport('jpeg')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <DownloadIcon className="w-4 h-4" />
                <span>JPEG</span>
            </button>
            <button onClick={() => onExport('pdf')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <DownloadIcon className="w-4 h-4" />
                <span>PDF</span>
            </button>
        </div>
    </div>
);

const PrintableView: React.FC<{ plan: MealPlan; selections: Selections; healthData: HealthData; dailyCosts: Record<string, string>, weeklyCaloriesBurned: number }> = ({ plan, selections, healthData, dailyCosts, weeklyCaloriesBurned }) => {
    const bmi = useMemo(() => {
        const height = parseFloat(healthData.height);
        const weight = parseFloat(healthData.weight);
        if (height > 0 && weight > 0) {
            const heightInMeters = height / 100;
            return (weight / (heightInMeters * heightInMeters)).toFixed(2);
        }
        return 'N/A';
    }, [healthData.height, healthData.weight]);

    const weeklyCost = useMemo(() => {
        let minCost = 0;
        let maxCost = 0;
        Object.values(dailyCosts).forEach(costStr => {
            const costs = costStr.match(/\d+/g)?.map(Number) ?? [0,0];
            minCost += costs[0] ?? 0;
            maxCost += costs[1] ?? costs[0] ?? 0;
        });
        if(minCost === maxCost && minCost > 0) return `${minCost} บาท`;
        if(minCost > 0) return `${minCost}-${maxCost} บาท`;
        return 'N/A';
    }, [dailyCosts]);

    return (
        <div className="font-sans bg-white" style={{ width: '420mm', height: '297mm', color: '#1f2937', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header className="flex justify-between items-start pb-4 border-b-2 border-slate-800">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900">แผนสุขภาพรายสัปดาห์</h1>
                    <p className="text-lg text-slate-600">จัดทำโดย AI Health Planner เมื่อ {new Date().toLocaleDateString('th-TH')}</p>
                </div>
                <div className="text-right text-sm text-slate-700 bg-slate-100 p-3 rounded-lg">
                    <p><strong>ผู้ใช้:</strong> {healthData.age} ปี, {healthData.weight} กก., {healthData.height} ซม.</p>
                    <p><strong>BMI:</strong> {bmi} ({healthData.diseases || 'ไม่มีโรคประจำตัว'})</p>
                </div>
            </header>
            
            {/* Summary */}
            <section className="my-4">
                <p className="text-slate-800 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 text-base">{plan.summary}</p>
            </section>

            {/* Main Calendar Grid */}
            <main className="flex-grow grid grid-cols-7 gap-3">
                {dayOrder.map(day => {
                    const dayPlan = plan.weeklyPlan[day];
                    const daySelections = selections[day];
                    if (!dayPlan || !daySelections) return <div key={day}></div>;

                    const breakfast = dayPlan.breakfast[daySelections.breakfast ?? 0];
                    const lunch = dayPlan.lunch[daySelections.lunch ?? 0];
                    const dinner = dayPlan.dinner[daySelections.dinner ?? 0];
                    const exercise = plan.weeklyExercisePlan[day][daySelections.exercise ?? 0];
                    
                    return (
                        <div key={day} className="bg-slate-50 rounded-lg p-3 flex flex-col gap-3">
                            <h3 className="font-bold text-center text-lg text-slate-800 border-b border-slate-200 pb-2">{dayLabels[day]}</h3>
                            
                            {/* Meals */}
                            <div className="flex flex-col gap-2 flex-grow">
                                <div className="bg-white p-2 rounded-md shadow-sm">
                                    <p className="font-semibold text-sm text-sky-600 flex items-center gap-2"><CoffeeIcon className="w-4 h-4"/>มื้อเช้า</p>
                                    <p className="text-xs text-slate-700">{breakfast ? `${breakfast.name} (~${breakfast.calories} kcal, ${breakfast.cost})` : 'N/A'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-md shadow-sm">
                                    <p className="font-semibold text-sm text-amber-600 flex items-center gap-2"><SoupIcon className="w-4 h-4"/>มื้อกลางวัน</p>
                                    <p className="text-xs text-slate-700">{lunch ? `${lunch.name} (~${lunch.calories} kcal, ${lunch.cost})` : 'N/A'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-md shadow-sm">
                                    <p className="font-semibold text-sm text-rose-600 flex items-center gap-2"><UtensilsIcon className="w-4 h-4"/>มื้อเย็น</p>
                                    <p className="text-xs text-slate-700">{dinner ? `${dinner.name} (~${dinner.calories} kcal, ${dinner.cost})` : 'N/A'}</p>
                                </div>
                            </div>

                             {/* Exercise */}
                            <div className="mt-auto bg-green-50 p-2 rounded-md border-t-2 border-green-200">
                                <p className="font-semibold text-sm text-green-700 flex items-center gap-2"><DumbbellIcon className="w-4 h-4"/>ออกกำลังกาย</p>
                                <p className="text-xs text-slate-700">{exercise.name} ({exercise.target})</p>
                                <p className="text-xs text-right font-bold text-green-800">~{exercise.caloriesBurned} kcal</p>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Footer */}
            <footer className="mt-4 pt-4 border-t-2 border-slate-800 text-center grid grid-cols-3 gap-4">
                <div>
                    <p className="font-bold text-lg text-slate-800">ค่าใช้จ่ายสัปดาห์นี้</p>
                    <p className="text-xl font-bold text-green-700">{weeklyCost}</p>
                </div>
                 <div>
                    <p className="font-bold text-lg text-slate-800">เผาผลาญแคลอรี่</p>
                    <p className="text-xl font-bold text-orange-600">~{weeklyCaloriesBurned} kcal</p>
                </div>
                <div>
                    <p className="font-bold text-lg text-slate-800">คำแนะนำการนอน</p>
                    <p className="text-base text-slate-700">{plan.recommendedSleep}</p>
                </div>
            </footer>
        </div>
    );
};


const OutputPanel: React.FC<OutputPanelProps> = ({ plan, isLoading, error, onSavePlan, isPlanSaved, healthData }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [selections, setSelections] = useState<Selections>({});
  const [isExporting, setIsExporting] = useState(false);
  const [dailyRationales, setDailyRationales] = useState<Record<string, string>>({});
  const [staleRationales, setStaleRationales] = useState<Record<string, boolean>>({});
  const [rationaleLoading, setRationaleLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (plan) {
      const initialSelections: Selections = {};
      const initialRationales: Record<string, string> = {};
      dayOrder.forEach(day => {
        initialSelections[day] = { breakfast: 0, lunch: 0, dinner: 0, exercise: 0 };
        initialRationales[day] = plan.weeklyPlan[day]?.rationale ?? "ไม่มีคำอธิบาย";
      });
      setSelections(initialSelections);
      setDailyRationales(initialRationales);
      setStaleRationales({});
      setRationaleLoading({});
    }
  }, [plan]);

  const weeklyCaloriesBurned = useMemo(() => {
    if (!plan || !Object.keys(selections).length) return plan?.totalCaloriesBurned ?? 0;
    return dayOrder.reduce((total, day) => {
      const dayExercisePlan = plan.weeklyExercisePlan[day];
      const selectedIndex = selections[day]?.exercise ?? 0;
      if (dayExercisePlan && dayExercisePlan[selectedIndex]) {
        return total + dayExercisePlan[selectedIndex].caloriesBurned;
      }
      return total;
    }, 0);
  }, [plan, selections]);
    
  const getDailyTotalCalories = (day: keyof MealPlan['weeklyPlan']) => {
    if (!plan) return 0;
    const dayPlan = plan.weeklyPlan[day];
    const daySelections = selections[day];
    if (!dayPlan || !daySelections) return 0;
    
    const breakfastCals = dayPlan.breakfast[daySelections.breakfast ?? 0]?.calories ?? 0;
    const lunchCals = dayPlan.lunch[daySelections.lunch ?? 0]?.calories ?? 0;
    const dinnerCals = dayPlan.dinner[daySelections.dinner ?? 0]?.calories ?? 0;
    
    return breakfastCals + lunchCals + dinnerCals;
  };

  const parseCost = (costString: string): [number, number] => {
    if (!costString) return [0, 0];
    const numbers = costString.match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length === 0) return [0, 0];
    if (numbers.length === 1) return [numbers[0], numbers[0]];
    return [Math.min(...numbers), Math.max(...numbers)];
  };

  const dailyCosts = useMemo(() => {
    if (!plan || !Object.keys(selections).length) return {};

    const calculatedCosts: Record<string, string> = {};
    dayOrder.forEach(day => {
        const dayPlan = plan.weeklyPlan[day];
        const daySelections = selections[day];
        if (!dayPlan || !daySelections) {
            calculatedCosts[day] = "N/A";
            return;
        }

        const breakfastCost = dayPlan.breakfast[daySelections.breakfast ?? 0]?.cost ?? "0";
        const lunchCost = dayPlan.lunch[daySelections.lunch ?? 0]?.cost ?? "0";
        const dinnerCost = dayPlan.dinner[daySelections.dinner ?? 0]?.cost ?? "0";

        const [minB, maxB] = parseCost(breakfastCost);
        const [minL, maxL] = parseCost(lunchCost);
        const [minD, maxD] = parseCost(dinnerCost);

        const totalMin = minB + minL + minD;
        const totalMax = maxB + maxL + maxD;

        if (totalMin === totalMax && totalMin > 0) {
            calculatedCosts[day] = `${totalMin} บาท`;
        } else if (totalMin > 0) {
            calculatedCosts[day] = `${totalMin}-${totalMax} บาท`;
        } else {
            calculatedCosts[day] = "N/A";
        }
    });
    return calculatedCosts;
  }, [plan, selections]);

  const handleSelectionChange = (day: keyof MealPlan['weeklyPlan'], type: SelectionType, index: number) => {
    setSelections(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: index },
    }));
    if (type === 'breakfast' || type === 'lunch' || type === 'dinner') {
        setStaleRationales(prev => ({ ...prev, [day]: true }));
    }
  };

  const handleRationaleUpdate = async (day: keyof MealPlan['weeklyPlan']) => {
    if (!plan) return;
    setRationaleLoading(prev => ({ ...prev, [day]: true }));
    setStaleRationales(prev => ({...prev, [day]: false}));
    
    const currentSelections = selections[day];
    const dayPlan = plan.weeklyPlan[day];

    const selectedMeals = {
        breakfast: dayPlan.breakfast[currentSelections?.breakfast ?? 0],
        lunch: dayPlan.lunch[currentSelections?.lunch ?? 0],
        dinner: dayPlan.dinner[currentSelections?.dinner ?? 0],
    };

    try {
        const result = await generateDailyRationale(dayLabels[day], selectedMeals, healthData);
        setDailyRationales(prev => ({ ...prev, [day]: result.rationale }));
    } catch(err) {
        console.error("Failed to update rationale:", err);
        setDailyRationales(prev => ({ ...prev, [day]: "เกิดข้อผิดพลาดในการอัปเดตคำอธิบาย" }));
    } finally {
        setRationaleLoading(prev => ({ ...prev, [day]: false }));
    }
  };
  
  const handleExport = async (format: 'jpeg' | 'pdf') => {
      // The initial check `if (!printRef.current)` was incorrect because the printable
      // element is only rendered after setting `isExporting` to true.
      // This check has been removed to allow the export process to start.
      
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for state to update and for React to render the printable view.

      if (!printRef.current) {
        console.error("Export failed: Printable element could not be found in the DOM after rendering.");
        setIsExporting(false);
        return;
      }

      const elementToCapture = printRef.current.querySelector('.font-sans');
      if (!elementToCapture) {
          console.error("Export failed: The inner .font-sans element was not found.");
          setIsExporting(false);
          return;
      }

      const canvas = await html2canvas(elementToCapture as HTMLElement, { 
          scale: 3, // Higher scale for better A3 resolution
          useCORS: true,
          backgroundColor: '#ffffff',
          width: 1587, // A3 width in pixels at 96 DPI
          height: 1123, // A3 height in pixels at 96 DPI
          windowWidth: 1587,
          windowHeight: 1123,
      });

      setIsExporting(false);

      if (format === 'jpeg') {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = 'health-plan.jpg';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else {
          const imgData = canvas.toDataURL('image/png');
          // Use A3 landscape dimensions: 420mm x 297mm
          const pdf = new jsPDF({
              orientation: 'landscape',
              unit: 'mm',
              format: 'a3'
          });
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save('health-plan.pdf');
      }
  };


  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorDisplay message={error} /></div>;
  if (!plan) return <WelcomeScreen />;
  
  // Render the printable view off-screen when exporting
  if (isExporting) {
    return <div ref={printRef} className="absolute -left-[9999px] top-0"><PrintableView plan={plan} selections={selections} healthData={healthData} dailyCosts={dailyCosts} weeklyCaloriesBurned={weeklyCaloriesBurned} /></div>;
  }

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto relative">
       <ActionToolbar onSave={onSavePlan} onExport={handleExport} isSaved={isPlanSaved} />
       
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-50 mb-8 flex items-center gap-3">
            <ClipboardListIcon className="w-10 h-10 text-blue-600 dark:text-blue-400"/>
            <span>แผนสุขภาพสำหรับคุณ</span>
        </h1>

        <div className="space-y-8">
            <SectionCard title="สรุปแผนและคำแนะนำ" icon={<SparklesIcon className="w-6 h-6"/>}>
                <p className="text-base mb-4">{plan.summary}</p>
                 <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg text-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">ประมาณการค่าใช้จ่ายรายสัปดาห์: </span>
                    <span className="font-bold text-green-700 dark:text-green-400">{plan.estimatedCost}</span>
                 </div>
            </SectionCard>
            
            <SectionCard title="การนอนหลับและการพักผ่อน" icon={<MoonIcon className="w-6 h-6"/>}>
                 <p className="text-base text-center font-medium">{plan.recommendedSleep}</p>
            </SectionCard>

            <SectionCard title="แผนการออกกำลังกายรายสัปดาห์" icon={<DumbbellIcon className="w-6 h-6"/>}>
                <div className="space-y-2">
                    {dayOrder.map(day => (
                       <div key={day} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-md gap-4">
                           <span className="font-semibold text-slate-700 dark:text-slate-200 w-1/3">{dayLabels[day]}</span>
                           <div className="w-2/3">
                              <ExerciseSelect 
                                options={plan.weeklyExercisePlan[day]} 
                                selectedIndex={selections[day]?.exercise ?? 0}
                                onChange={(index) => handleSelectionChange(day, 'exercise', index)}
                              />
                           </div>
                       </div>
                    ))}
                </div>
                <div className="mt-4 bg-slate-100 dark:bg-slate-700 p-3 rounded-lg text-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">ยอดรวมแคลอรี่เผาผลาญต่อสัปดาห์: </span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">~{weeklyCaloriesBurned} kcal</span>
                 </div>
            </SectionCard>

            <SectionCard title="แผนอาหารรายสัปดาห์" icon={<CalendarDaysIcon className="w-6 h-6"/>}>
                <div className="space-y-6">
                    {dayOrder.map(day => (
                        <div key={day} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                            <div className="grid grid-cols-2 items-start mb-4 gap-4">
                               <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{dayLabels[day]}</h4>
                               <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                      ประมาณการ: <span className="font-bold text-green-600 dark:text-green-500">{dailyCosts[day]}</span>
                                  </p>
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-500">~{getDailyTotalCalories(day)} kcal</p>
                               </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-md">
                                    <p className="font-semibold text-sky-600 dark:text-sky-400 mb-2">มื้อเช้า</p>
                                    <MealSelect 
                                      options={plan.weeklyPlan[day].breakfast} 
                                      selectedIndex={selections[day]?.breakfast ?? 0}
                                      onChange={(index) => handleSelectionChange(day, 'breakfast', index)}
                                    />
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-md">
                                     <p className="font-semibold text-amber-600 dark:text-amber-400 mb-2">มื้อกลางวัน</p>
                                     <MealSelect 
                                      options={plan.weeklyPlan[day].lunch} 
                                      selectedIndex={selections[day]?.lunch ?? 0}
                                      onChange={(index) => handleSelectionChange(day, 'lunch', index)}
                                    />
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-md">
                                    <p className="font-semibold text-rose-600 dark:text-rose-400 mb-2">มื้อเย็น</p>
                                    <MealSelect 
                                      options={plan.weeklyPlan[day].dinner} 
                                      selectedIndex={selections[day]?.dinner ?? 0}
                                      onChange={(index) => handleSelectionChange(day, 'dinner', index)}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <h5 className="font-semibold text-slate-700 dark:text-slate-200">คำแนะนำสำหรับวันนี้</h5>
                                    {staleRationales[day] && !rationaleLoading[day] && (
                                        <button onClick={() => handleRationaleUpdate(day as keyof MealPlan['weeklyPlan'])} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
                                            <RefreshCwIcon className="w-3 h-3"/> อัปเดต
                                        </button>
                                    )}
                                     {rationaleLoading[day] && (
                                        <div className="flex gap-1 items-center">
                                            <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-sm mt-2 text-slate-600 dark:text-slate-300 transition-opacity ${staleRationales[day] ? 'opacity-60' : 'opacity-100'}`}>
                                    {dailyRationales[day]}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    </div>
  );
};

export default OutputPanel;
