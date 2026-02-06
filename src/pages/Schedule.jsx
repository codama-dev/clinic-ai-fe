import React, { useState, useEffect, useCallback } from "react";
import { WeeklySchedule } from "@/entities/WeeklySchedule";
import { base44 } from "@/api/base44Client";
import { ShiftTemplate } from "@/entities/ShiftTemplate";
import { Constraint } from "@/entities/Constraint";
import { VacationRequest } from "@/entities/VacationRequest"; // Import VacationRequest
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, addDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns"; // Import parseISO and helpers
import { he } from "date-fns/locale";
import { Calendar, PhoneCall, User as UserIcon, Star } from "lucide-react";
import { getHolidayForDate } from '@/components/utils/holidays';
import { Badge } from '@/components/ui/badge';

import WeekSelector from "../components/schedule/WeekSelector";
import ShiftCard from "../components/schedule/ShiftCard";
import MyShiftsSummary from "../components/schedule/MyShiftsSummary";
import WelcomeCard from "../components/dashboard/WelcomeCard"; // Import WelcomeCard

const DAYS_HE = {
  sunday: "יום א'", monday: "יום ב'", tuesday: "יום ג'", wednesday: "יום ד'",
  thursday: "יום ה'", friday: "יום ו'", saturday: "שבת"
};
const SHIFTS_HE = { morning: "בוקר", evening: "ערב" };


export default function SchedulePage() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [schedule, setSchedule] = useState(null);
  const [lockedShifts, setLockedShifts] = useState({});
  const [receptionCoverage, setReceptionCoverage] = useState({});
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [myConstraints, setMyConstraints] = useState([]); // State for user's constraints
  const [approvedVacations, setApprovedVacations] = useState([]); // State for approved vacations

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }
      
      const user = await base44.auth.me();
      
      // DEBUG: Logging for permissions diagnosis
      console.log('=== Schedule Page User Debug ===');
      console.log('Full user object:', user);
      console.log('user.role:', user.role);
      console.log('user.permissions:', user.permissions);
      console.log('================================');
      
      setCurrentUser(user);
      const weekStartDate = format(currentWeek, 'yyyy-MM-dd');

      const [scheduleData, templatesData, constraintsData, vacationData] = await Promise.all([
        WeeklySchedule.filter({
            week_start_date: weekStartDate,
            is_published: true
        }),
        ShiftTemplate.filter({ is_active: true }),
        Constraint.filter({ employee_id: user.id, week_start_date: weekStartDate }), // Fetch user's constraints for the week
        VacationRequest.filter({ status: 'approved' }), // Fetch approved vacations
      ]);

      setShiftTemplates(templatesData);
      setMyConstraints(constraintsData); // Set user's constraints
      setApprovedVacations(vacationData); // Set approved vacations

      if (scheduleData.length > 0) {
        setSchedule(scheduleData[0].schedule_data);
        setLockedShifts(scheduleData[0].locked_shifts || {});
        setReceptionCoverage(scheduleData[0].reception_coverage || {});
      } else {
        setSchedule(null);
        setLockedShifts({});
        setReceptionCoverage({});
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
      setSchedule(null);
      setLockedShifts({});
      setReceptionCoverage({});
      setMyConstraints([]); // Clear constraints on error as well
      setApprovedVacations([]); // Clear vacations on error
    }
    setIsLoading(false);
  }, [currentWeek]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const getDayDate = (dayKey) => {
    const dayIndex = Object.keys(DAYS_HE).indexOf(dayKey);
    return addDays(currentWeek, dayIndex);
  };

  const isCurrentUserOnCall = (schedule?.weekend_oncall || []).includes(currentUser?.display_name || currentUser?.full_name);


  if (!isLoading && !currentUser) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card className="text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto bg-purple-100 p-3 rounded-full w-fit mb-4">
              <UserIcon className="w-10 h-10 text-purple-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">נדרשת התחברות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              כדי לצפות בלוח המשמרות, עליך להתחבר למערכת.
            </p>
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              התחבר למערכת
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">לוח משמרות שבועי</h1>
            <p className="text-gray-500">צפייה בסידור העבודה לשבוע הנוכחי. המשמרות שלך מודגשות.</p>
        </div>
        <WeekSelector currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
      </div>

      <WelcomeCard currentUser={currentUser} />

      <MyShiftsSummary
        schedule={schedule}
        currentUser={currentUser}
        currentWeek={currentWeek}
        shiftTemplates={shiftTemplates}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {Object.keys(DAYS_HE).slice(0, 6).map((dayKey) => {
          const dayDate = getDayDate(dayKey);
          const specialDay = getHolidayForDate(dayDate);
          const isCurrentUserOnVacationToday = approvedVacations.some(vacation => 
            currentUser?.id === vacation.employee_id && 
            isWithinInterval(dayDate, { 
                start: startOfDay(parseISO(vacation.start_date)), 
                end: endOfDay(parseISO(vacation.end_date)) 
            })
          );
          return (
            <Card key={dayKey} className="bg-white/70 backdrop-blur-sm border-gray-200">
              <CardHeader className="pb-3 text-center">
                <CardTitle>
                  <div className="text-base font-bold text-gray-800">
                    {DAYS_HE[dayKey]}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(dayDate, 'd/M', { locale: he })}
                  </div>
                  {specialDay && (
                    <Badge
                      variant={specialDay.type === 'holiday' ? "destructive" : "default"}
                      className={`mx-auto mt-2 text-xs ${
                        specialDay.type === 'holiday'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}
                    >
                      {specialDay.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['morning', 'evening'].map((shift) => {
                  if (dayKey === 'friday' && shift === 'evening') {
                    return null;
                  }

                  const shiftKey = shift;
                  // Find the corresponding template. This assumes one morning and one evening shift.
                  const template = shiftTemplates.find(t => {
                      // Ensure t.start_time is a string before splitting
                      if (!t.start_time || typeof t.start_time !== 'string') return false;
                      const hour = parseInt(t.start_time.split(':')[0]);
                      if (shiftKey === 'morning') return hour < 14;
                      if (shiftKey === 'evening') return hour >= 14;
                      return false;
                  });

                  const isConstrained = myConstraints.some(c => c.unavailable_day === dayKey && c.unavailable_shift === shiftKey);
                  const coverageForShift = receptionCoverage?.[`${dayKey}-${shift}`] || [];

                  return (
                    <ShiftCard
                      key={`${dayKey}-${shift}`}
                      shiftTitle={template ? template.name : SHIFTS_HE[shift]}
                      startTime={template?.start_time}
                      endTime={template?.end_time}
                      employees={schedule?.[dayKey]?.[shift] || []}
                      isLoading={isLoading}
                      isLocked={lockedShifts?.[`${dayKey}-${shift}`]}
                      currentUserEmployeeName={currentUser?.display_name || currentUser?.full_name}
                      isConstrained={isConstrained} // Pass constraint info
                      receptionCoverage={coverageForShift}
                      isUserOnVacation={isCurrentUserOnVacationToday} // Pass vacation info
                    />
                  )
                })}
              </CardContent>
            </Card>
          )
        })}

        {/* On-call card integrated into the grid */}
        <Card className={`bg-white/70 backdrop-blur-sm ${isCurrentUserOnCall ? 'border-purple-300 ring-2 ring-purple-200' : 'border-gray-200'}`}>
            <CardHeader className="pb-3 text-center">
                <CardTitle>
                    <div className="text-base font-bold text-gray-800 flex items-center justify-center gap-2">
                        <PhoneCall className={`w-5 h-5 ${isCurrentUserOnCall ? 'text-purple-600' : 'text-gray-500'}`} />
                        כוננות סופ"ש
                    </div>
                    <div className="text-xs text-gray-500">
                        שישי - שבת
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
                {isLoading ? (
                    <div className="space-y-1.5 pt-4">
                        <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
                        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                    </div>
                ) : (schedule?.weekend_oncall && schedule.weekend_oncall.length > 0) ? (
                    schedule.weekend_oncall.map((employee, index) => {
                        const isCurrentUser = employee === (currentUser?.display_name || currentUser?.full_name);
                        return (
                            <div 
                              key={index} 
                              className={`flex items-center gap-2 text-sm rounded-md p-1.5 ${isCurrentUser ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-white text-gray-800'}`}
                            >
                              {isCurrentUser ? <Star className="w-3.5 h-3.5 text-purple-600" /> : <UserIcon className="w-3.5 h-3.5 text-gray-400" />}
                              <span>{employee}</span>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center text-gray-400 pt-8">
                        <p>אין שיבוץ</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
       {!isLoading && !schedule && (
        <div className="col-span-full text-center py-20 text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl font-medium">לא נמצא לוח משמרות</p>
          <p>עדיין לא פורסם לוח משמרות עבור שבוע זה.</p>
        </div>
      )}
    </div>
  );
}