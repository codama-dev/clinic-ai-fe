import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GripVertical, User, X, Trash2, Plane, Lock, Unlock, Zap, PhoneCall, Keyboard, AlertTriangle } from 'lucide-react';
import { format, addDays, isWithinInterval, startOfDay, endOfDay, parse } from "date-fns";
import { getHolidayForDate } from '@/components/utils/holidays';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const JOB_NAMES = { doctor: "רופא/ה", assistant: "אסיסטנט/ית", receptionist: "קבלה" };
const JOB_COLORS = { doctor: "bg-purple-100 text-purple-800", assistant: "bg-blue-100 text-blue-800", receptionist: "bg-orange-100 text-orange-800" };

const EmployeeItem = ({ employee, index }) => {
  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };
  
  const displayName = employee.display_name || employee.full_name;

  return (
    <Draggable draggableId={`employee-${employee.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`flex items-center gap-2 p-2 bg-white border rounded-md shadow-sm ${
            snapshot.isDragging ? 'opacity-50 shadow-lg' : ''
          }`}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
          <Avatar className="w-6 h-6">
            <AvatarImage src={employee.profile_image} />
            <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <span className="text-sm font-medium">{displayName}</span>
            {employee.job && (
              <Badge className={`${JOB_COLORS[employee.job] || 'bg-gray-100 text-gray-800'} text-xs font-normal ml-2`}>
                {JOB_NAMES[employee.job] || employee.job}
              </Badge>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

const ShiftDropZone = ({ dayKey, shiftType, shiftName, allEmployees, assignedNames, onRemove, onToggleLock, isLocked, receptionCoverage, onReceptionCoverageChange, previousScheduleData }) => {
  const assignedEmployees = assignedNames.map(name => allEmployees.find(e => (e.display_name || e.full_name) === name)).filter(Boolean);
  const hasReceptionist = assignedEmployees.some(emp => emp.job === 'receptionist');

  // Get previous shift data for comparison
  const previousShiftEmployees = previousScheduleData?.[dayKey]?.[shiftType] || [];

  const handleToggleReceptionCoverage = (employeeName) => {
    const shiftId = `${dayKey}-${shiftType}`;
    const newCoverage = JSON.parse(JSON.stringify(receptionCoverage || {}));
    if (!newCoverage[shiftId]) {
      newCoverage[shiftId] = [];
    }

    const isCurrentlyCovering = newCoverage[shiftId].includes(employeeName);
    if (isCurrentlyCovering) {
      newCoverage[shiftId] = newCoverage[shiftId].filter(name => name !== employeeName);
    } else {
      // If allowing only one assistant to cover reception per shift:
      // newCoverage[shiftId] = [employeeName];
      // If allowing multiple (as implied by array):
      newCoverage[shiftId].push(employeeName);
    }
    onReceptionCoverageChange(newCoverage);
  };

  return (
    <Droppable droppableId={`${dayKey}-${shiftType}`} isDropDisabled={isLocked}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-3 border rounded-lg min-h-[120px] transition-colors ${
            snapshot.isDraggingOver && !isLocked ? 'bg-purple-50' : (isLocked ? 'bg-gray-100' : 'bg-gray-50')
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <h5 className="font-semibold text-gray-600">{shiftName}</h5>
            <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${isLocked ? 'text-orange-500 hover:text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
                title={isLocked ? "שחרר נעילה" : "נעל משמרת"}
                onClick={() => onToggleLock(dayKey, shiftType)}
            >
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
          </div>
          <div className="space-y-2">
            {isLocked ? (
              <div className="flex items-center justify-center gap-2 text-sm text-orange-600 py-2">
                <Lock className="w-3.5 h-3.5" />
                <span>משמרת נעולה</span>
              </div>
            ) : assignedEmployees.map((emp) => {
              const employeeName = emp.display_name || emp.full_name;
              const isCoveringReception = receptionCoverage?.[`${dayKey}-${shiftType}`]?.includes(employeeName);
              
              // Check if this is a new addition
              const isNewAddition = previousScheduleData && !previousShiftEmployees.includes(employeeName);

              return (
              <div 
                key={emp.id} 
                className={`flex items-center justify-between p-1 rounded border ${
                  isNewAddition ? 'bg-green-50 border-green-300' : 'bg-white'
                }`}
              >
                <span className={`text-sm flex items-center gap-2 ${isNewAddition ? 'text-green-800 font-semibold' : ''}`}>
                  <User className="w-3 h-3"/>
                  {employeeName}
                  {isNewAddition && <Badge className="text-xs bg-green-200 text-green-800">חדש</Badge>}
                </span>
                <div className="flex items-center">
                  {!hasReceptionist && emp.job === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 ${isCoveringReception ? 'text-purple-600 bg-purple-100' : 'text-gray-400'}`}
                      onClick={() => handleToggleReceptionCoverage(employeeName)}
                      title={isCoveringReception ? "הסר כיסוי קבלה" : "סמן ככיסוי קבלה"}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => onRemove(dayKey, shiftType, employeeName)}
                    disabled={isLocked}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              )
            })}
            
            {/* Show removed employees */}
            {previousScheduleData && previousShiftEmployees.filter(name => !assignedNames.includes(name)).map((removedName, idx) => (
              <div key={`removed-${idx}`} className="flex items-center justify-between p-1 bg-red-50 rounded border border-red-300">
                <span className="text-sm flex items-center gap-2 text-red-800 line-through">
                  <User className="w-3 h-3"/>
                  {removedName}
                  <Badge className="text-xs bg-red-200 text-red-800">הוסר</Badge>
                </span>
              </div>
            ))}
            
            {!isLocked && assignedEmployees.length === 0 && previousShiftEmployees.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-4">גרור עובד לכאן</p>
            )}
          </div>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};


const DAYS_HE = {
  sunday: "יום א'", monday: "יום ב'", tuesday: "יום ג'", wednesday: "יום ד'",
  thursday: "יום ה'", friday: "יום ו'", saturday: "שבת"
};

const getShiftType = (startTime) => {
    if (!startTime) return 'morning'; // Default for safety
    const hour = parseInt(startTime.split(':')[0]);
    return hour < 14 ? 'morning' : 'evening';
};

export default function ManualScheduler({ currentWeek, scheduleData, lockedShifts, employees, shiftTemplates, receptionCoverage, onScheduleDataChange, onLockedShiftsChange, onReceptionCoverageChange, approvedVacations, constraints, previousApprovedScheduleData }) {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [schedulingErrors, setSchedulingErrors] = useState([]);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    
    // Handle drop into weekend on-call slot
    if (destination.droppableId === 'weekend_oncall') {
      const employeeId = draggableId.replace('employee-', '');
      const employee = employees.find(emp => emp.id === employeeId);
      if (employee) {
        const displayName = employee.display_name || employee.full_name;
        
        const newSchedule = JSON.parse(JSON.stringify(scheduleData));
        if (!newSchedule.weekend_oncall) {
            newSchedule.weekend_oncall = [];
        }
        
        if (!newSchedule.weekend_oncall.includes(displayName)) {
          newSchedule.weekend_oncall = [...newSchedule.weekend_oncall, displayName];
          onScheduleDataChange(newSchedule);
          toast.success(`${displayName} שובץ לכוננות סופ"ש.`);
        } else {
            toast.info(`${displayName} כבר משובץ לכוננות.`);
        }
      }
      return; // Stop execution here
    }

    const [dayKey, shiftType] = destination.droppableId.split('-');
    if (lockedShifts[`${dayKey}-${shiftType}`]) {
        toast.warning("לא ניתן לשבץ עובד למשמרת נעולה.");
        return; // Prevent dropping on locked shifts
    }

    // Employee dragged from the list to a shift
    if (source.droppableId === 'employees' && destination.droppableId !== 'employees') {
      const employeeId = draggableId.replace('employee-', '');
      const employee = employees.find(emp => emp.id === employeeId);
      
      if (employee) {
        // --- VALIDATION LOGIC ---
        const dayIndex = Object.keys(DAYS_HE).indexOf(dayKey);
        const shiftDate = addDays(currentWeek, dayIndex);

        // 1. Check for personal constraints
        const hasConstraint = constraints.some(c => 
            c.employee_id === employee.id && 
            c.week_start_date === format(currentWeek, 'yyyy-MM-dd') &&
            c.unavailable_day === dayKey && 
            c.unavailable_shift === shiftType
        );

        if (hasConstraint) {
            toast.error(`לא ניתן לשבץ את ${employee.display_name || employee.full_name}. יש לו אילוץ על משמרת זו.`);
            return;
        }

        // 2. Check for approved vacations
        const isOnVacation = approvedVacations.some(req => 
            req.employee_id === employee.id &&
            isWithinInterval(shiftDate, { 
                start: startOfDay(parse(req.start_date, 'yyyy-MM-dd', new Date())), 
                end: endOfDay(parse(req.end_date, 'yyyy-MM-dd', new Date())) 
            })
        );

        if (isOnVacation) {
            toast.error(`לא ניתן לשבץ את ${employee.display_name || employee.full_name}. הוא בחופשה בתאריך זה.`);
            return;
        }

        // 3. Check if employee is already scheduled for another shift on the same day, and ask for confirmation.
        const isAlreadyScheduledToday = (
          (scheduleData[dayKey]?.morning || []).includes(employee.display_name || employee.full_name) ||
          (scheduleData[dayKey]?.evening || []).includes(employee.display_name || employee.full_name)
        );

        // Check if the employee is already scheduled today BUT not in the target shift (to prevent duplicates in the same shift)
        if (isAlreadyScheduledToday && !scheduleData[dayKey]?.[shiftType]?.includes(employee.display_name || employee.full_name)) {
             const confirmed = window.confirm(
                `${employee.display_name || employee.full_name} כבר משובץ למשמרת אחרת היום. האם אתה בטוח שברצונך לבצע שיבוץ כפול?`
            );
            if (!confirmed) {
                return; // Admin cancelled the action
            }
        }
        // --- END VALIDATION ---
        
        const displayName = employee.display_name || employee.full_name;
        
        const newSchedule = JSON.parse(JSON.stringify(scheduleData)); // Deep copy
        if (!newSchedule[dayKey]) newSchedule[dayKey] = {};
        if (!newSchedule[dayKey][shiftType]) newSchedule[dayKey][shiftType] = [];
        
        if (!newSchedule[dayKey][shiftType].includes(displayName)) {
          newSchedule[dayKey][shiftType] = [...newSchedule[dayKey][shiftType], displayName];
          onScheduleDataChange(newSchedule);
          toast.success(`${displayName} שובץ למשמרת.`);
        } else {
            toast.info(`${displayName} כבר משובץ למשמרת זו.`);
        }
      }
    }
  };

  const handleRemoveEmployee = (day, shift, employeeName) => {
    if (lockedShifts[`${day}-${shift}`]) return;
    
    const newSchedule = JSON.parse(JSON.stringify(scheduleData)); // Deep copy
    if (newSchedule[day] && newSchedule[day][shift]) {
      newSchedule[day][shift] = newSchedule[day][shift].filter(name => name !== employeeName);
      onScheduleDataChange(newSchedule);
      toast.info(`${employeeName} הוסר מהמשמרת.`);

      // Remove from reception coverage if applicable
      const shiftId = `${day}-${shift}`;
      if (receptionCoverage?.[shiftId]?.includes(employeeName)) {
        const newCoverage = { ...receptionCoverage };
        newCoverage[shiftId] = newCoverage[shiftId].filter(name => name !== employeeName);
        onReceptionCoverageChange(newCoverage);
      }
    }
  };

  const handleRemoveOnCallEmployee = (employeeName) => {
    const newSchedule = JSON.parse(JSON.stringify(scheduleData));
    if (newSchedule.weekend_oncall) {
      newSchedule.weekend_oncall = newSchedule.weekend_oncall.filter(name => name !== employeeName);
      onScheduleDataChange(newSchedule);
      toast.info(`${employeeName} הוסר מכוננות.`);
    }
  };
  
  const handleClearDay = (dayKey) => {
    const newSchedule = { ...scheduleData };
    let clearedCount = 0;
    const newCoverage = { ...receptionCoverage };
    
    if (newSchedule[dayKey]) {
        if (!lockedShifts[`${dayKey}-morning`]) {
            if (newSchedule[dayKey].morning && newSchedule[dayKey].morning.length > 0) clearedCount += newSchedule[dayKey].morning.length;
            newSchedule[dayKey] = { ...newSchedule[dayKey], morning: [] };
            delete newCoverage[`${dayKey}-morning`]; // Clear reception coverage for morning shift
        } else {
            toast.warning(`משמרת בוקר ביום ${DAYS_HE[dayKey]} נעולה ולא ניתן לנקות אותה.`);
        }
        if (!lockedShifts[`${dayKey}-evening`]) { // Changed from `!(dayKey === 'friday' && !newSchedule[dayKey].evening)` as this condition was for display, not for clearing
            if (newSchedule[dayKey].evening && newSchedule[dayKey].evening.length > 0) clearedCount += newSchedule[dayKey].evening.length;
            newSchedule[dayKey] = { ...newSchedule[dayKey], evening: [] };
            delete newCoverage[`${dayKey}-evening`]; // Clear reception coverage for evening shift
        } else if (lockedShifts[`${dayKey}-evening`]) {
            toast.warning(`משמרת ערב ביום ${DAYS_HE[dayKey]} נעולה ולא ניתן לנקות אותה.`);
        }
    }
    onScheduleDataChange(newSchedule);
    onReceptionCoverageChange(newCoverage); // Update reception coverage state
    if (clearedCount > 0) {
        toast.success(`נוקו ${clearedCount} שיבוצים מיום ${DAYS_HE[dayKey]}.`);
    } else {
        toast.info(`לא נמצאו שיבוצים לנקות ביום ${DAYS_HE[dayKey]}.`);
    }
  };

  const handleToggleLock = (dayKey, shiftType) => {
      const newLocked = {...lockedShifts};
      const key = `${dayKey}-${shiftType}`;
      if (newLocked[key]) {
          delete newLocked[key];
          toast.info("הנעילה הוסרה.");
      } else {
          newLocked[key] = true;
          // When locking a shift, clear its employees
          const newSchedule = JSON.parse(JSON.stringify(scheduleData));
          if (newSchedule[dayKey]) {
            newSchedule[dayKey][shiftType] = [];
          }
          onScheduleDataChange(newSchedule);

          // Also clear reception coverage for the locked shift
          const newCoverage = { ...receptionCoverage };
          delete newCoverage[key];
          onReceptionCoverageChange(newCoverage);

          toast.info("המשמרת ננעלה ונוקתה.");
      }
      onLockedShiftsChange(newLocked);
};

  const getVacationsForDay = (dayDate) => {
    if (!approvedVacations) return [];
    return approvedVacations.filter(vacation => 
        isWithinInterval(dayDate, {
            start: startOfDay(parse(vacation.start_date, 'yyyy-MM-dd', new Date())),
            end: endOfDay(parse(vacation.end_date, 'yyyy-MM-dd', new Date()))
        })
    );
  };

  // Only consider active templates for display and auto-scheduling
  const activeTemplates = shiftTemplates ? shiftTemplates.filter(t => t.is_active).sort((a,b) => a.start_time.localeCompare(b.start_time)) : [];

  const handleGenerateAutoSchedule = () => {
    const isConfirmed = window.confirm("אזהרה: פעולה זו תתחשב באילוצים אישיים ובחופשות מאושרות, אך תתעלם משיבוצים כפולים באותו היום. האם להמשיך?");
    if (!isConfirmed) {
      return;
    }
    
    let newSchedule = {}; // Start with an empty object to rebuild
    let newCoverage = {}; // Start with an empty object to rebuild
    let assignedCount = 0;
    let errors = [];
    
    // employeeCounters keeps track of the next employee to try for each role in a round-robin fashion across all shifts.
    const employeeCounters = { doctor: 0, assistant: 0, receptionist: 0 };
    const schedulableEmployees = employees.filter(e => e.is_active);
    const weekStartDateStr = format(currentWeek, 'yyyy-MM-dd');
    const activeConstraints = constraints.filter(c => c.week_start_date === weekStartDateStr);

    Object.keys(DAYS_HE).slice(0, 6).forEach((dayKey, dayIndex) => { // Iterate Sunday to Friday
      const dayDate = addDays(currentWeek, dayIndex);
      if (!newSchedule[dayKey]) newSchedule[dayKey] = {};

      ['morning', 'evening'].forEach(shiftType => {
        const shiftKey = `${dayKey}-${shiftType}`;

        if (lockedShifts[shiftKey]) {
           // Preserve locked shifts and their reception coverage from the current state
           newSchedule[dayKey][shiftType] = scheduleData[dayKey]?.[shiftType] || [];
           if (receptionCoverage[shiftKey]) {
               newCoverage[shiftKey] = receptionCoverage[shiftKey];
           }
           return; // Skip auto-scheduling for locked shifts
        }
        
        if (dayKey === 'friday' && shiftType === 'evening') {
          return; // Skip Friday evening as it's not handled by templates
        }

        // Clear existing assignments for this non-locked, non-Friday-evening shift
        newSchedule[dayKey][shiftType] = [];
        delete newCoverage[shiftKey]; // Also clear reception coverage for this shift

        // Find template and staffing requirements
        const template = activeTemplates.find(t => getShiftType(t.start_time) === shiftType);
        if (!template) {
            return; // No template, no requirements to fill
        }

        const requirements = template.staffing_requirements || {};

        // Fill shift based on requirements
        Object.keys(requirements).forEach(role => {
          const requiredMin = requirements[role]?.min || 0;
          if (requiredMin === 0) return;

          const employeesInRole = schedulableEmployees.filter(e => e.job === role);
          let assignedForRole = 0;

          if (employeesInRole.length > 0) {
            // Loop for each required slot for this role in the current shift
            // Iterate through employees starting from the current round-robin counter for this role
            // Try up to twice the number of employees to ensure all slots are filled if possible
            for (let i = 0; i < employeesInRole.length * 2; i++) { // Max 2 passes to try to find employees without too many loops
                if (assignedForRole >= requiredMin) break; // Stop if required slots are filled

                const empIndex = (employeeCounters[role] + i) % employeesInRole.length;
                const candidate = employeesInRole[empIndex];
                if (!candidate) continue; 
                const candidateName = candidate.display_name || candidate.full_name;

                // --- Availability Checks ---
                const isOnVacation = approvedVacations.some(req => 
                    req.employee_id === candidate.id &&
                    isWithinInterval(dayDate, { 
                        start: startOfDay(parse(req.start_date, 'yyyy-MM-dd', new Date())), 
                        end: endOfDay(parse(req.end_date, 'yyyy-MM-dd', new Date())) 
                    })
                );
                const isConstrained = activeConstraints.some(c => c.employee_id === candidate.id && c.unavailable_day === dayKey && c.unavailable_shift === shiftType);
                const alreadyInThisShift = newSchedule[dayKey][shiftType].includes(candidateName);

                // IMPORTANT: This auto-scheduler ignores double shifts,
                // but respects personal constraints and approved vacations.
                if (!isOnVacation && !isConstrained && !alreadyInThisShift) {
                  newSchedule[dayKey][shiftType].push(candidateName);
                  // Update the global round-robin counter for the *next* overall pick for this role
                  employeeCounters[role] = (empIndex + 1) % employeesInRole.length; // Move to the next employee after the one just assigned
                  assignedCount++;
                  assignedForRole++;
                }
            }
          }
          
          if(assignedForRole < requiredMin) {
              const missingCount = requiredMin - assignedForRole;
              let reason = "";
              if (employeesInRole.length === 0) {
                  reason = ` (אין עובדים פעילים לתפקיד ${JOB_NAMES[role] || role})`;
              } else if (employeesInRole.length < requiredMin) {
                  reason = ` (לא קיימים מספיק עובדים פעילים בתפקיד זה למילוי הדרישה)`;
              } else {
                  reason = ` (כל העובדים הפנויים לתפקיד זה חסומים עקב אילוצים אישיים או חופשות מאושרות)`;
              }
              errors.push(`${DAYS_HE[dayKey]} ${shiftType === 'morning' ? 'בוקר' : 'ערב'}: חסרים ${missingCount} עובדי ${JOB_NAMES[role] || role}.${reason}`);
          }
        });
      });
    });
    
    // Preserve weekend on-call from original data as auto-scheduler doesn't touch it
    newSchedule.weekend_oncall = scheduleData.weekend_oncall || [];

    onScheduleDataChange(newSchedule);
    onReceptionCoverageChange(newCoverage);

    if (errors.length > 0) {
      setSchedulingErrors(errors);
      setShowErrorDialog(true);
    } else if (assignedCount > 0) {
      toast.success(`נוצר סידור אוטומטי חדש עם ${assignedCount} שיבוצים.`);
    } else {
      toast.info("הסידור נוקה. לא נוצרו שיבוצים חדשים.");
    }
  };


  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex justify-between items-center mb-4" dir="rtl">
        <h2 className="text-2xl font-bold">סידור שבועי</h2>
        <Button onClick={handleGenerateAutoSchedule} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
            <Zap className="w-4 h-4" />
            סידור אוטומטי מהיר
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" dir="rtl">
        <div className="lg:col-span-3">
          {previousApprovedScheduleData && Object.keys(previousApprovedScheduleData).length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                מוצג סידור עם שינויים לעומת הגרסה המאושרת הקודמת:
              </p>
              <div className="flex gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
                  <span>עובדים שנוספו</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                  <span>עובדים שהוסרו</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(DAYS_HE).slice(0, 6).map((dayKey, index) => {
                const dayDate = addDays(currentWeek, index);
                const specialDay = getHolidayForDate(dayDate); 
                const hasShifts = scheduleData[dayKey] && Object.values(scheduleData[dayKey]).some(shift => shift && shift.length > 0);
                const vacationsToday = getVacationsForDay(dayDate);

                // Collect unique shift types (morning/evening) that have active templates
                const distinctShiftTypesWithTemplates = Array.from(
                    new Set(activeTemplates.map(template => getShiftType(template.start_time)))
                );
                // Sort to ensure 'morning' comes before 'evening' for consistent display
                distinctShiftTypesWithTemplates.sort((a, b) => {
                    if (a === 'morning' && b === 'evening') return -1;
                    if (a === 'evening' && b === 'morning') return 1;
                    return 0;
                });

                return (
                  <Card key={dayKey}>
                    <CardHeader className="text-center relative pt-4 pb-2">
                        {hasShifts && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 left-2 h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                onClick={() => handleClearDay(dayKey)}
                                title="בטל את כל המשמרות ביום זה"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        )}
                      <CardTitle>{DAYS_HE[dayKey]}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{format(dayDate, 'dd/MM/yyyy')}</p>
                      {specialDay && (
                        <Badge 
                            variant={specialDay.type === 'holiday' ? "destructive" : "default"} 
                            className={`mx-auto mt-1 w-fit ${
                                specialDay.type === 'holiday' 
                                    ? 'bg-red-100 text-red-800 border-red-200' 
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                        >
                            {specialDay.name}
                        </Badge>
                      )}
                      {vacationsToday.length > 0 && (
                        <Badge variant="secondary" className="mx-auto mt-1 w-fit bg-orange-100 text-orange-800 flex items-center gap-1.5" title={vacationsToday.map(v => v.employee_name).join(', ')}>
                            <Plane className="w-3 h-3"/>
                            חופשה: {vacationsToday.length}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Render one ShiftDropZone for each distinct shift type (morning/evening) that has active templates */}
                        {distinctShiftTypesWithTemplates.map(currentShiftType => {
                            if (dayKey === 'friday' && currentShiftType === 'evening') return null; // Hide Friday evening

                            const shiftName = currentShiftType === 'morning' ? "משמרת בוקר" : "משמרת ערב";
                            const isShiftLocked = lockedShifts[`${dayKey}-${currentShiftType}`];

                            return (
                              <ShiftDropZone
                                key={`${dayKey}-${currentShiftType}`} // Key by day and shiftType
                                dayKey={dayKey}
                                shiftType={currentShiftType}
                                shiftName={shiftName}
                                allEmployees={employees} // Pass full employees list
                                assignedNames={scheduleData[dayKey]?.[currentShiftType] || []} // Renamed from 'employees'
                                onRemove={handleRemoveEmployee}
                                onToggleLock={handleToggleLock}
                                isLocked={isShiftLocked}
                                receptionCoverage={receptionCoverage}
                                onReceptionCoverageChange={onReceptionCoverageChange}
                                previousScheduleData={previousApprovedScheduleData}
                              />
                            );
                        })}
                    </CardContent>
                  </Card>
                )
            })}
             {/* Weekend On-Call Card */}
            <Card className="border-dashed border-purple-400 bg-purple-50/50">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                    <PhoneCall className="w-5 h-5 text-purple-600"/>
                    כוננות סוף שבוע
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="weekend_oncall">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 border rounded-lg min-h-[120px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-purple-100' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-2">
                        {(scheduleData.weekend_oncall || []).map((emp, index) => (
                          <div key={index} className="flex items-center justify-between p-1 bg-white rounded border">
                            <span className="text-sm flex items-center gap-2">
                              <User className="w-3 h-3"/>
                              {emp}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveOnCallEmployee(emp)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        {(scheduleData.weekend_oncall || []).length === 0 && (
                          <p className="text-xs text-gray-400 text-center pt-4">גרור עובד לכאן</p>
                        )}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Employee list sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>רשימת עובדים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>סה"כ:</span>
                    <span>{employees.length}</span>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>רופאים:</span>
                    <span>{employees.filter(e => e.job === 'doctor').length}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>אסיסטנטים:</span>
                    <span>{employees.filter(e => e.job === 'assistant').length}</span>
                  </div>
                  <div className="flex justify-between text-orange-700">
                    <span>קבלה:</span>
                    <span>{employees.filter(e => e.job === 'receptionist').length}</span>
                  </div>
                </div>
              </div>
              <Droppable droppableId="employees" isDropDisabled={true}>
                {(provided) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="space-y-2 h-[520px] overflow-y-auto"
                  >
                    {employees.map((emp, index) => (
                      <EmployeeItem key={emp.id} employee={emp} index={index} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      </div>

       <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
          <AlertDialogContent dir="rtl" className="max-w-lg text-right">
              <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center justify-end gap-2">
                     <AlertTriangle className="w-6 h-6 text-yellow-500" />
                     הסידור הושלם עם חוסרים
                  </AlertDialogTitle>
                  <AlertDialogDescription as="div">
                      לא נמצאו מספיק עובדים זמינים למשמרות הבאות:
                      <div className="mt-3 space-y-2 text-sm text-gray-700 max-h-60 overflow-y-auto">
                          {schedulingErrors.map((error, index) => (
                              <p key={index}>{error}</p>
                          ))}
                      </div>
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
                      אישור
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </DragDropContext>
  );
}