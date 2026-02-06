
import React, { useState, useEffect, useCallback } from "react";
import { Constraint } from "@/entities/Constraint";
import { ShiftTemplate } from "@/entities/ShiftTemplate";
import { User } from "@/entities/User";
import { SystemSettings } from "@/entities/SystemSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addWeeks } from "date-fns";
import { he } from "date-fns/locale";
import ConstraintCalendar from "../components/constraints/ConstraintCalendar";
import SubmitConstraintDialog from "../components/constraints/SubmitConstraintDialog";
import { Button } from "@/components/ui/button";
import { Info, Plane } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const dayNameToNumber = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

export default function ConstraintsPage() {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [constraints, setConstraints] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogState, setDialogState] = useState({ isOpen: false, shiftInfo: null });
  const [deadlineStatus, setDeadlineStatus] = useState({ canSubmit: false, message: "טוען סטטוס הגשה..." });
  const [weekOptions, setWeekOptions] = useState([]);
  
  const loadData = useCallback(async (currentSelectedWeek) => {
    setIsLoading(true);
    try {
      const settingsData = await SystemSettings.list();
      const settings = settingsData[0] || { constraint_weeks_ahead: 3, constraint_deadline_day: 'thursday', constraint_deadline_time: '20:00' };

      // --- Deadline Logic ---
      const now = new Date();
      const deadlineDayNumber = dayNameToNumber[settings.constraint_deadline_day];
      const [deadlineHour, deadlineMinute] = settings.constraint_deadline_time.split(':').map(Number);
      const nextWeekStartDate = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 0 }); // Start of the "next week" (relative to now)
      
      const deadlineDate = new Date(nextWeekStartDate);
      deadlineDate.setDate(deadlineDate.getDate() - (7 - deadlineDayNumber));
      deadlineDate.setHours(deadlineHour, deadlineMinute, 0, 0);
      const isDeadlineForNextWeekPassed = now > deadlineDate;
      // --- End Deadline Logic ---

      // Determine which week to show initially if not already selected
      const weekToShow = currentSelectedWeek || startOfWeek(addWeeks(new Date(), isDeadlineForNextWeekPassed ? 2 : 1), { weekStartsOn: 0 });
      if (!currentSelectedWeek) {
        setSelectedWeek(weekToShow);
      }
      
      const startWeekOffset = isDeadlineForNextWeekPassed ? 1 : 0; // If deadline passed, the "next week" option should actually refer to "2 weeks from now"
      const options = Array.from({ length: settings.constraint_weeks_ahead - startWeekOffset }, (_, i) => ({
          label: i === 0 && !isDeadlineForNextWeekPassed ? "שבוע הבא" : `בעוד ${i + 1 + startWeekOffset} שבועות`,
          weeksToAdd: i + 1 + startWeekOffset // This is the actual number of weeks from 'now' for the start of that week
      }));
      setWeekOptions(options);

      const [user, constraintData, templateData] = await Promise.all([
        User.me(),
        Constraint.filter({ week_start_date: format(weekToShow, 'yyyy-MM-dd') }), // Use weekToShow for data fetching
        ShiftTemplate.filter({ is_active: true }),
      ]);
      
      setCurrentUser(user);
      setConstraints(constraintData);
      setShiftTemplates(templateData.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      
      let canSubmitForSelectedWeek = false;
      // If the currently displayed week is the immediate "next week" from now
      if (format(weekToShow, 'yyyy-MM-dd') === format(nextWeekStartDate, 'yyyy-MM-dd')) {
          canSubmitForSelectedWeek = !isDeadlineForNextWeekPassed;
      } else if (weekToShow > nextWeekStartDate) {
          // If the selected week is beyond the immediate "next week", its deadline is implicitly in the future
          canSubmitForSelectedWeek = true;
      }

      setDeadlineStatus({
          canSubmit: canSubmitForSelectedWeek,
          message: canSubmitForSelectedWeek ? `ניתן להגיש אילוצים` : "המועד להגשת אילוצים לשבוע זה סגור"
      });

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Only call loadData with selectedWeek if it's not null, or for initial load
    if (selectedWeek || selectedWeek === null) {
      loadData(selectedWeek);
    }
  }, [loadData, selectedWeek]);

  const handleSelectShift = (shiftInfo) => {
    if (!currentUser) return;
    
    const userConstraintsForWeek = constraints.filter(c => c.employee_id === currentUser.id && c.week_start_date === format(selectedWeek, 'yyyy-MM-dd'));
    const allowedCount = currentUser.allowed_constraints ?? 1;

    if (userConstraintsForWeek.length >= allowedCount) {
      alert(`הגעת למכסת האילוצים המותרת לשבוע זה (${allowedCount}). לא ניתן להגיש אילוצים נוספים.`);
      return;
    }
    
    setDialogState({ isOpen: true, shiftInfo });
  };
  
  const handleSubmitConstraint = async () => {
    const { day, shift } = dialogState.shiftInfo;
    const displayName = currentUser.display_name || currentUser.full_name; // Use display_name with fallback
    try {
      await Constraint.create({
        employee_id: currentUser.id,
        employee_name: displayName,
        week_start_date: format(selectedWeek, 'yyyy-MM-dd'),
        unavailable_day: day,
        unavailable_shift: shift,
        is_submitted_on_time: true, // This logic can be enhanced on the backend
      });
      setDialogState({ isOpen: false, shiftInfo: null });
      loadData(selectedWeek); // Reload data for the currently selected week
    } catch (error) {
      console.error("Error creating constraint:", error);
      alert("שגיאה ביצירת האילוץ, אנא נסה שוב");
    }
  };

  const handleDeleteConstraint = async (constraintId) => {
    try {
      await Constraint.delete(constraintId);
      loadData(selectedWeek); // Reload data for the currently selected week
    } catch (error) {
      console.error("Error deleting constraint:", error);
    }
  };
  
  const handleWeekChange = (weeksToAdd) => {
      setSelectedWeek(startOfWeek(addWeeks(new Date(), weeksToAdd), { weekStartsOn: 0 }));
  };

  if (isLoading || !selectedWeek) {
      return <p>טוען נתונים...</p>
  }
  
  const userConstraintsForWeek = constraints.filter(c => c.employee_id === currentUser.id && c.week_start_date === format(selectedWeek, 'yyyy-MM-dd'));
  const allowedCount = currentUser?.allowed_constraints ?? 1;
  const remainingConstraints = allowedCount - userConstraintsForWeek.length;

  return (
    <div className="max-w-7xl mx-auto">
       <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">הגשת אילוצים</h1>
                <p className="text-gray-500">בחר/י משמרת אחת בה אינך יכול/ה לעבוד.</p>
            </div>
            <Badge variant="outline" className={deadlineStatus.canSubmit ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
                {deadlineStatus.message}
            </Badge>
        </div>
        
        <div className="mb-6">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                        המועד האחרון להגשת אילוצים לשבוע הבא הוא <strong>יום חמישי בשעה 20:00</strong>.
                    </p>
                </div>
            </div>
        </div>
        
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-lg mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Plane className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <p className="text-sm text-purple-700">
                         במידת הצורך, ניתן להגיש בקשה למספר ימי חופש.
                    </p>
                </div>
                <Button asChild variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                    <Link to={createPageUrl("VacationRequests")}>
                        מעבר לדף חופשות
                    </Link>
                </Button>
            </div>
        </div>

        <div className="flex justify-center gap-2 mb-4">
            {weekOptions.map(opt => (
                <Button 
                    key={opt.weeksToAdd}
                    // Compare selectedWeek with the calculated start of the week for this option
                    variant={format(selectedWeek, 'yyyy-MM-dd') === format(startOfWeek(addWeeks(new Date(), opt.weeksToAdd), { weekStartsOn: 0 }), 'yyyy-MM-dd') ? 'default' : 'outline'}
                    onClick={() => handleWeekChange(opt.weeksToAdd)}
                    className="bg-purple-600 hover:bg-purple-700 data-[variant=outline]:bg-white"
                >
                    {opt.label} ({format(startOfWeek(addWeeks(new Date(), opt.weeksToAdd), { locale: he, weekStartsOn: 0 }), 'd/M')})
                </Button>
            ))}
        </div>
        
        <Card className="shadow-md border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-center">
                אילוצים לשבוע של {format(selectedWeek, "d MMMM, yyyy", { locale: he })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ConstraintCalendar
              currentWeek={selectedWeek}
              shiftTemplates={shiftTemplates}
              constraints={constraints}
              currentUserId={currentUser?.id}
              onSelectShift={handleSelectShift}
              onDeleteConstraint={handleDeleteConstraint}
              canSubmit={deadlineStatus.canSubmit && remainingConstraints > 0}
            />
          </CardContent>
        </Card>
      
      {dialogState.shiftInfo && (
        <SubmitConstraintDialog
          isOpen={dialogState.isOpen}
          onClose={() => setDialogState({ isOpen: false, shiftInfo: null })}
          onSubmit={handleSubmitConstraint}
          employeeName={currentUser?.display_name || currentUser?.full_name}
          shiftInfo={dialogState.shiftInfo}
        />
      )}
    </div>
  );
}
