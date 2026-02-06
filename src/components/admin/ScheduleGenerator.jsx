
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WeeklySchedule } from '@/entities/WeeklySchedule';
import { Loader2, Wand2, Info, AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, addDays, isWithinInterval, startOfDay, endOfDay, parse } from 'date-fns';

const DAYS_HE = {
    sunday: 'יום א׳', monday: 'יום ב׳', tuesday: 'יום ג׳', wednesday: 'יום ד׳',
    thursday: 'יום ה׳', friday: 'יום ו׳', saturday: 'שבת',
};
const JOBS_HE = { doctor: "רופא/ה", assistant: "אסיסטנט/ית", receptionist: "קבלה" };

// This is now ignored by the main logic but kept for reference/future use
const CORE_REQUIREMENTS = {
    doctor: 1,
    receptionist: 1,
    assistant: 2,
};

export default function ScheduleGenerator({ currentWeek, schedule, constraints, employees, shiftTemplates, vacationRequests, onScheduleGenerated }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [schedulingErrors, setSchedulingErrors] = useState([]);
    const [generatedData, setGeneratedData] = useState(null);

    // This function is now partially used again
    const isEmployeeAvailable = (employee, dayKey, shiftKey, currentDate, approvedVacations, activeConstraints) => {
        // Re-introducing constraint check for personal unavailability requests
        const isConstrained = activeConstraints.some(c => c.employee_id === employee.id && c.unavailable_day === dayKey && c.unavailable_shift === shiftKey);
        if (isConstrained) return false;

        // Vacation check
        const isOnVacation = approvedVacations.some(req => 
            req.employee_id === employee.id &&
            isWithinInterval(currentDate, { 
                start: startOfDay(parse(req.start_date, 'yyyy-MM-dd', new Date())), 
                end: endOfDay(parse(req.end_date, 'yyyy-MM-dd', new Date())) 
            })
        );
        if (isOnVacation) return false;
        
        // Double shifts on the same day are still IGNORED in this logic.
        
        return true; 
    };

    const saveSchedule = async (dataToSave, errors) => {
        setIsLoading(true);
        try {
            const weekStartDateStr = format(currentWeek, 'yyyy-MM-dd');
            let savedSchedule;
            
            const { schedule_data, locked_shifts, reception_coverage } = dataToSave;

            if (schedule && schedule.id) {
                // We update the existing schedule record with the newly generated data
                savedSchedule = await WeeklySchedule.update(schedule.id, { schedule_data, locked_shifts, reception_coverage, is_published: false });
            } else {
                // Or create a new one if it doesn't exist for the week
                savedSchedule = await WeeklySchedule.create({
                    week_start_date: weekStartDateStr,
                    schedule_data,
                    locked_shifts,
                    reception_coverage,
                    is_published: false,
                });
            }
            // After saving, we call the callback which will trigger a full data reload in the parent
            onScheduleGenerated(savedSchedule, errors);
        } catch (error) {
            console.error("Error saving schedule:", error);
            onScheduleGenerated(schedule, [...errors, "שגיאה קריטית בשמירת הסידור: " + error.message]);
        } finally {
            setIsLoading(false);
        }
    }

    const generateSchedule = async () => {
        setIsLoading(true);

        const existingLockedShifts = schedule?.locked_shifts || {}; 
        const weekStartDateStr = format(currentWeek, 'yyyy-MM-dd');

        // Filter for active constraints for the current week only - these will now be considered
        const activeConstraints = constraints.filter(c => c.week_start_date === weekStartDateStr);
        const approvedVacations = vacationRequests; // Now used for availability checks

        let localSchedulingErrors = [];
        let newScheduleData = {};
        
        const employeeCounters = {
            doctor: 0,
            assistant: 0,
            receptionist: 0,
        };

        // Pre-populate newScheduleData with existing locked shifts to preserve them
        for (const dayKey of Object.keys(DAYS_HE).slice(0, 6)) { // Sunday to Friday
            for (const shiftKey of ['morning', 'evening']) {
                 const lockId = `${dayKey}-${shiftKey}`;
                 if (existingLockedShifts[lockId]) {
                    if (!newScheduleData[dayKey]) newScheduleData[dayKey] = {};
                    newScheduleData[dayKey][shiftKey] = schedule?.schedule_data?.[dayKey]?.[shiftKey] || [];
                 }
            }
        }
        
        // Main scheduling loop
        for (const dayKey of Object.keys(DAYS_HE).slice(0, 6)) { // Sunday to Friday
            const dayDate = addDays(currentWeek, Object.keys(DAYS_HE).indexOf(dayKey));
            
            // Find templates for the day
            const morningTemplate = shiftTemplates.find(t => t.shift_type === 'morning');
            const eveningTemplate = shiftTemplates.find(t => t.shift_type === 'evening');

            for (const shiftDetails of [{key: 'morning', template: morningTemplate}, {key: 'evening', template: eveningTemplate}]) {
                const { key: shiftKey, template } = shiftDetails;

                const lockId = `${dayKey}-${shiftKey}`;
                if (existingLockedShifts[lockId]) {
                    continue; // Skip generation for locked shifts, they were pre-populated
                }

                // Initialize this specific shift as empty before generation
                if (!newScheduleData[dayKey]) newScheduleData[dayKey] = {};
                newScheduleData[dayKey][shiftKey] = [];
                
                // Specific rule for Friday evening or if template is missing: always empty
                if (!template || (dayKey === 'friday' && shiftKey === 'evening')) {
                    continue;
                }

                const requirements = template.staffing_requirements || {};

                for (const role of ['doctor', 'receptionist', 'assistant']) {
                    const requiredCount = requirements[role]?.min || 0;
                    if (requiredCount === 0) continue; // No requirement for this role

                    const employeesInRole = employees.filter(e => e.job === role && e.is_active);
                    if (employeesInRole.length === 0) {
                        localSchedulingErrors.push(`${DAYS_HE[dayKey]}, ${template.name}: לא נמצאו עובדים פעילים כלל לתפקיד ${JOBS_HE[role]} כדי למלא דרישה של ${requiredCount}.`);
                        continue; // Cannot fulfill if no employees
                    }

                    const assignedInThisShift = new Set(); // Track employees assigned to *this specific shift* to prevent duplicates
                    let actualAssignedCount = 0;

                    for (let i = 0; i < requiredCount; i++) {
                        let employeeFoundForSlot = false;
                        // Attempt to find a unique employee for this slot in a round-robin manner
                        for (let attempt = 0; attempt < employeesInRole.length; attempt++) {
                            const employeeIndex = (employeeCounters[role] + attempt) % employeesInRole.length;
                            const candidateEmployee = employeesInRole[employeeIndex];
                            const candidateName = candidateEmployee.display_name || candidateEmployee.full_name;
                            
                            // Check for duplication within the same shift AND personal unavailability constraints.
                            // Vacations and double shifts on the same day are still intentionally ignored.
                            const isAlreadyInThisShift = assignedInThisShift.has(candidateName);
                            const isCurrentlyAvailable = isEmployeeAvailable(candidateEmployee, dayKey, shiftKey, dayDate, approvedVacations, activeConstraints);

                            if (!isAlreadyInThisShift && isCurrentlyAvailable) {
                                newScheduleData[dayKey][shiftKey].push(candidateName);
                                assignedInThisShift.add(candidateName); // Add to set for current shift
                                actualAssignedCount++;
                                
                                // Advance the global counter for this role for the *next* assignment in the sequence
                                employeeCounters[role] = (employeeCounters[role] + 1) % employeesInRole.length;
                                employeeFoundForSlot = true;
                                break; // Found an employee for this slot, move to the next required slot
                            }
                        }
                        if (!employeeFoundForSlot && actualAssignedCount < requiredCount) {
                            // This means even after checking all employees, we couldn't fill this specific slot
                            // because either all available employees were already assigned to *this specific shift*
                            // OR all remaining candidates are unavailable due to personal constraints or vacations.
                            // The error will be reported below.
                        }
                    }
                    
                    if (actualAssignedCount < requiredCount) {
                        const missingCount = requiredCount - actualAssignedCount;
                        let reason = "";
                        if (employeesInRole.length === 0) { // This case should theoretically be caught earlier, but kept for robustness
                            reason = ` (אין עובדים פעילים לתפקיד ${JOBS_HE[role] || role} כלל)`;
                        } else if (employeesInRole.length < requiredCount) {
                            reason = ` (לא קיימים מספיק עובדים פעילים בתפקיד זה למילוי הדרישה)`;
                        } else {
                             reason = ` (כל העובדים הפנויים חסומים עקב אילוצים אישיים או חופשות מאושרות)`;
                        }
                         localSchedulingErrors.push(`${DAYS_HE[dayKey]}, ${template.name} (${shiftKey === 'morning' ? 'בוקר' : 'ערב'}): שובצו ${actualAssignedCount} מתוך ${requiredCount} עובדי ${JOBS_HE[role]} נדרשים.${reason}`);
                    }
                }
            }
        }
        
        setIsLoading(false);
        const finalGeneratedData = { 
            schedule_data: newScheduleData, 
            locked_shifts: existingLockedShifts,
            reception_coverage: {} // Reset reception coverage as it's not part of this logic anymore
        };

        if (localSchedulingErrors.length > 0) {
            setSchedulingErrors(localSchedulingErrors);
            setGeneratedData(finalGeneratedData);
            setShowErrorDialog(true);
        } else {
            await saveSchedule(finalGeneratedData, []);
        }
    };

    const confirmAndGenerate = () => {
        setShowConfirmDialog(true);
    };
    
    const handleConfirmErrorsAndSave = async () => {
        setShowErrorDialog(false);
        if (generatedData) {
            await saveSchedule(generatedData, schedulingErrors);
        }
        setGeneratedData(null);
        setSchedulingErrors([]);
    };

    return (
        <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <div className='flex items-start gap-3'>
                    <Info className="w-6 h-5 text-blue-600 flex-shrink-0" />
                    <div className='space-y-1'>
                        <h3 className="font-semibold text-blue-800">כיצד פועל הסידור האוטומטי?</h3>
                        <p className="text-sm text-blue-700">
                           המערכת תתחשב באילוצים אישיים ובחופשות מאושרות, אך תתעלם משיבוצים כפולים באותו היום. המערכת תנסה למלא את כל המשמרות שאינן נעולות על בסיס דרישות האיוש שהוגדרו. עובדים ישובצו בשיטת "ראונד-רובין" (סיבוב) כדי לפזר את העומס.
                        </p>
                    </div>
                </div>

                <Button onClick={confirmAndGenerate} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                    {isLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Wand2 className="w-4 h-4 ml-2" />}
                    {isLoading ? "מחשב סידור..." : "הפעל סידור אוטומטי"}
                </Button>
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>אישור הפעלת סידור אוטומטי</AlertDialogTitle>
                        <AlertDialogDescription>
                           אזהרה: פעולה זו תתחשב באילוצים אישיים ובחופשות מאושרות, אך תתעלם משיבוצים כפולים באותו היום. המערכת תנסה למלא את הסידור על בסיס דרישות איוש בלבד. האם להמשיך?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setShowConfirmDialog(false); generateSchedule(); }}>
                            כן, הפעל סידור
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
                <AlertDialogContent dir="rtl" className="max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                           <AlertTriangle className="w-6 h-6 text-yellow-500" />
                           אזהרה - חוסר באיוש משמרות
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            הסידור האוטומטי הושלם, אך לא נמצאו מספיק עובדים זמינים למשמרות הבאות:
                            <ul className="list-disc pr-5 mt-3 space-y-1 text-sm text-gray-700 max-h-60 overflow-y-auto">
                                {schedulingErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                            <br />
                            האם ברצונך לשמור את הסידור החלקי ולהשלים אותו ידנית?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setGeneratedData(null); setSchedulingErrors([]); setShowErrorDialog(false); }}>ביטול (אל תשמור)</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmErrorsAndSave}>
                            כן, שמור סידור חלקי
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
