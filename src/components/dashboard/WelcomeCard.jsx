import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Hand, X, Settings, Plane, BedDouble, FileText, ClipboardList, MessageSquare, CheckCircle, XCircle, Clock, LogIn, LogOut, Cake, Calendar } from 'lucide-react';
import { format, addWeeks, startOfWeek } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function WelcomeCard({ currentUser }) {
    const [isDismissed, setIsDismissed] = useState(false);

    const { data: pendingOrApprovedCases, isLoading: isLoadingCases } = useQuery({
        queryKey: ['pendingOrApprovedClinicCases'],
        queryFn: async () => {
            // Fetch only the 10 most recently updated cases (same as MarpetTracking page and Layout)
            const recentCases = await base44.entities.ClinicCase.list('-updated_date', 10);
            // Filter for pending or approved cases
            return recentCases.filter(c => c.status === 'pending' || c.status === 'approved');
        },
        enabled: !!currentUser,
        refetchInterval: 60000, // Refetch every 60 seconds
    });

    // Fetch constraints for next week
    const nextWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1);
    const nextWeekStartDate = format(nextWeekStart, 'yyyy-MM-dd');

    const { data: nextWeekConstraints, isLoading: isLoadingConstraints } = useQuery({
        queryKey: ['nextWeekConstraints', currentUser?.id, nextWeekStartDate],
        queryFn: () => base44.entities.Constraint.filter({ 
            employee_id: currentUser.id, 
            week_start_date: nextWeekStartDate 
        }),
        enabled: !!currentUser?.id,
        refetchInterval: 60000,
    });

    // Fetch vacation requests with responses
    const { data: vacationResponses, isLoading: isLoadingVacations } = useQuery({
        queryKey: ['userVacationResponses', currentUser?.id],
        queryFn: async () => {
            const requests = await base44.entities.VacationRequest.filter({ 
                employee_id: currentUser.id
            });
            // Filter for requests that have been responded to (approved or rejected)
            return requests.filter(r => r.status === 'approved' || r.status === 'rejected');
        },
        enabled: !!currentUser?.id,
        refetchInterval: 60000,
    });

    // Fetch unread referrals/messages for the user
    const { data: unreadReferrals, isLoading: isLoadingReferrals } = useQuery({
        queryKey: ['unreadReferralsWelcome', currentUser?.id],
        queryFn: async () => {
            if (!currentUser) return [];

            const filter = currentUser.job === 'doctor'
                ? { target_doctor_id: currentUser.id, status: 'open' }
                : { referring_user_id: currentUser.id, status: 'answered' };
            
            const results = await base44.entities.VetReferral.filter(filter);
            return results;
        },
        enabled: !!currentUser,
        refetchInterval: 30000,
    });

    // Fetch current week schedule and time clock status
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const currentWeekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayDate = format(today, 'yyyy-MM-dd');

    const { data: currentWeekSchedule } = useQuery({
        queryKey: ['currentWeekSchedule', currentWeekStartDate],
        queryFn: async () => {
            const schedules = await base44.entities.WeeklySchedule.filter({ 
                week_start_date: currentWeekStartDate 
            });
            return schedules[0] || null;
        },
        enabled: !!currentUser,
        refetchInterval: 60000,
    });

    const { data: todayTimeClockEntry } = useQuery({
        queryKey: ['todayTimeClockEntry', currentUser?.email, todayDate],
        queryFn: async () => {
            const entries = await base44.entities.TimeClockEntry.filter({
                employee_email: currentUser.email,
                date: todayDate
            });
            return entries[0] || null;
        },
        enabled: !!currentUser?.email,
        refetchInterval: 30000,
    });

    // Fetch all users to check for birthdays today
    const { data: allUsers = [] } = useQuery({
        queryKey: ['allUsersForBirthdays'],
        queryFn: async () => {
            const publicProfiles = await base44.entities.PublicProfile.list();
            return publicProfiles.filter(u => u.is_active && u.email !== currentUser?.email);
        },
        enabled: !!currentUser,
        refetchInterval: 3600000, // Refetch every hour
    });

    // Check for birthdays today
    const getBirthdayUsers = () => {
        if (!allUsers || allUsers.length === 0) return [];
        
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
        const todayDay = today.getDate();

        return allUsers.filter(user => {
            if (!user.birthday_date) return false;
            const birthDate = new Date(user.birthday_date);
            return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
        });
    };

    const birthdayUsers = getBirthdayUsers();

    // Fetch today's appointments for the user
    const { data: todayAppointments = [] } = useQuery({
        queryKey: ['todayAppointments', currentUser?.id, todayDate],
        queryFn: async () => {
            if (!currentUser) return [];
            const allAppointments = await base44.entities.Appointment.list('-start_time', 50);
            
            return allAppointments.filter(apt => {
                const aptDateStr = apt.date ? apt.date.split('T')[0] : apt.date;
                if (aptDateStr !== todayDate) return false;
                
                // Show if user is doctor for this appointment
                if (apt.doctor_id === currentUser.id) return true;
                
                // Show if user is participant in general meeting
                if (apt.is_general_meeting && apt.participants) {
                    return apt.participants.some(p => p.user_id === currentUser.id);
                }
                
                return false;
            });
        },
        enabled: !!currentUser,
        refetchInterval: 60000
    });

    // Check if user has a shift today and if they should clock in/out
    const getTodayShiftReminder = () => {
        if (!currentWeekSchedule?.schedule_data || !currentUser) return null;

        const scheduleData = currentWeekSchedule.schedule_data;
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayDayName = dayNames[dayOfWeek];

        // Find user's shift for today
        let todayShift = null;
        for (const [day, shifts] of Object.entries(scheduleData)) {
            if (day === todayDayName) {
                for (const [shiftType, employees] of Object.entries(shifts)) {
                    if (employees && employees.includes(currentUser.display_name || currentUser.full_name)) {
                        todayShift = shiftType;
                        break;
                    }
                }
            }
        }

        if (!todayShift) return null;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinutes;

        // Define shift times (approximate)
        const shiftTimes = {
            morning: { start: 8 * 60, end: 14 * 60 }, // 08:00 - 14:00
            evening: { start: 14 * 60, end: 20 * 60 }, // 14:00 - 20:00
        };

        const shift = shiftTimes[todayShift];
        if (!shift) return null;

        const isClockedIn = todayTimeClockEntry && todayTimeClockEntry.status === 'clocked_in';
        const isClockedOut = todayTimeClockEntry && todayTimeClockEntry.status === 'clocked_out';

        // Check if we're within shift hours
        if (currentTimeInMinutes >= shift.start && currentTimeInMinutes <= shift.end) {
            if (!todayTimeClockEntry || isClockedOut) {
                return {
                    type: 'clock_in',
                    message: `יש לך משמרת ${todayShift === 'morning' ? 'בוקר' : 'ערב'} היום. נא לבצע כניסה בשעון הנוכחות.`,
                    shiftType: todayShift
                };
            } else if (isClockedIn && currentTimeInMinutes >= shift.end - 30) {
                // Remind to clock out 30 minutes before shift ends
                return {
                    type: 'clock_out',
                    message: `המשמרת שלך מסתיימת בקרוב. נא לבצע יציאה בשעון הנוכחות.`,
                    shiftType: todayShift
                };
            }
        }

        return null;
    };

    const shiftReminder = getTodayShiftReminder();

    const hasPendingOrApprovedCases = !isLoadingCases && pendingOrApprovedCases && pendingOrApprovedCases.length > 0;
    const hasNoNextWeekConstraints = !isLoadingConstraints && (!nextWeekConstraints || nextWeekConstraints.length === 0);
    const hasVacationResponses = !isLoadingVacations && vacationResponses && vacationResponses.length > 0;
    const hasUnreadReferrals = !isLoadingReferrals && unreadReferrals && unreadReferrals.length > 0;
    const hasShiftReminder = !!shiftReminder;
    const hasBirthdays = birthdayUsers.length > 0;
    const hasTodayAppointments = todayAppointments && todayAppointments.length > 0;

    useEffect(() => {
        const dismissed = localStorage.getItem('welcomeCardDismissed_v1');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem('welcomeCardDismissed_v1', 'true');
    };

    if (!currentUser || isDismissed) {
        return null;
    }

    return (
        <Card className="mb-6 bg-purple-50 border-purple-200 relative shadow-md" dir="rtl">
            <Button variant="ghost" size="icon" className="absolute top-2 left-2 text-purple-400 hover:bg-purple-100" onClick={handleDismiss}>
                <X className="w-4 h-4" />
            </Button>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-purple-800">
                    <Hand className="w-6 h-6 flex-shrink-0" />
                    <span>
                        {`ברוך שובך, ${currentUser.display_name || currentUser.full_name}!`}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Birthday Reminder Section */}
                    {hasBirthdays && (
                        <div className="p-4 bg-pink-50 border-2 border-pink-300 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Cake className="w-6 h-6 text-pink-600 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-bold text-pink-900 text-base">
                                        🎉 יום הולדת שמח! 🎉
                                    </p>
                                    <p className="text-sm text-pink-800 mt-1">
                                        {birthdayUsers.length === 1 ? (
                                            <>היום יום ההולדת של <span className="font-semibold">{birthdayUsers[0].display_name}</span>! אל תשכחו לברך 🎂</>
                                        ) : (
                                            <>היום יום ההולדת של {birthdayUsers.map((u, i) => (
                                                <span key={u.user_id}>
                                                    <span className="font-semibold">{u.display_name}</span>
                                                    {i < birthdayUsers.length - 1 && (i === birthdayUsers.length - 2 ? ' ו-' : ', ')}
                                                </span>
                                            ))}! אל תשכחו לברך 🎂</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Today's Appointments Section */}
                    {hasTodayAppointments && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold text-blue-900 text-sm mb-2">
                                        📅 התורים והפגישות שלך היום
                                    </p>
                                    <div className="space-y-2">
                                        {todayAppointments.map((apt) => (
                                            <div key={apt.id} className="text-sm text-blue-800 bg-white p-2 rounded border border-blue-100">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="font-semibold">{apt.start_time}</span>
                                                    {apt.is_general_meeting ? (
                                                        <span>- פגישה: {apt.chief_complaint}</span>
                                                    ) : (
                                                        <span>- {apt.client_name} ({apt.patient_name})</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shift Reminder Section */}
                    {hasShiftReminder && (
                        <Link to={createPageUrl("TimeClock")}>
                            <div className={`p-3 rounded-lg border cursor-pointer hover:opacity-90 transition-all ${
                                shiftReminder.type === 'clock_in' 
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-orange-50 border-orange-300'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {shiftReminder.type === 'clock_in' ? (
                                        <LogIn className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                        <LogOut className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <p className={`font-semibold text-sm ${
                                            shiftReminder.type === 'clock_in' ? 'text-green-900' : 'text-orange-900'
                                        }`}>
                                            תזכורת נוכחות
                                        </p>
                                        <p className={`text-sm ${
                                            shiftReminder.type === 'clock_in' ? 'text-green-800' : 'text-orange-800'
                                        }`}>
                                            {shiftReminder.message}
                                        </p>
                                    </div>
                                    <Clock className={`w-6 h-6 ${
                                        shiftReminder.type === 'clock_in' ? 'text-green-600' : 'text-orange-600'
                                    }`} />
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Notifications Section */}
                    {(hasVacationResponses || hasUnreadReferrals) && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                            <p className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                                🔔 עדכונים חדשים עבורך:
                            </p>
                            <div className="space-y-2">
                                {hasVacationResponses && (
                                    <Link to={createPageUrl("VacationRequests")}>
                                        <div className="p-2 bg-white rounded border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Plane className="w-4 h-4 text-blue-600" />
                                                    <span className="text-sm font-medium text-blue-900">
                                                        קיבלת תשובה על {vacationResponses.length} {vacationResponses.length === 1 ? 'בקשת חופשה' : 'בקשות חופשה'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {vacationResponses.filter(v => v.status === 'approved').length > 0 && (
                                                        <Badge className="bg-green-100 text-green-800 text-xs">
                                                            <CheckCircle className="w-3 h-3 ml-1" />
                                                            {vacationResponses.filter(v => v.status === 'approved').length} אושרו
                                                        </Badge>
                                                    )}
                                                    {vacationResponses.filter(v => v.status === 'rejected').length > 0 && (
                                                        <Badge className="bg-red-100 text-red-800 text-xs">
                                                            <XCircle className="w-3 h-3 ml-1" />
                                                            {vacationResponses.filter(v => v.status === 'rejected').length} נדחו
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                                {hasUnreadReferrals && (
                                    <Link to={createPageUrl("VetReferrals")}>
                                        <div className="p-2 bg-white rounded border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="w-4 h-4 text-blue-600" />
                                                    <span className="text-sm font-medium text-blue-900">
                                                        יש לך {unreadReferrals.length} {unreadReferrals.length === 1 ? 'הודעה חדשה' : 'הודעות חדשות'}
                                                    </span>
                                                </div>
                                                <Badge className="bg-red-500 text-white text-xs">
                                                    {unreadReferrals.length}
                                                </Badge>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-gray-700">גישה מהירה לפעולות נפוצות במערכת. שבוע עבודה נעים ומוצלח!</p>
                    <div className="flex flex-wrap gap-3">
                        <Button 
                            variant="outline" 
                            asChild 
                            className={`relative transition-all duration-300 ${
                                hasNoNextWeekConstraints
                                ? 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200/70 hover:text-yellow-900'
                                : 'border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800'
                            }`}
                        >
                            <Link to={createPageUrl("Constraints")}>
                                {hasNoNextWeekConstraints && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                    </span>
                                )}
                                <Settings className="w-4 h-4 ml-2" /> הגשת אילוץ
                            </Link>
                        </Button>
                        <Link to={createPageUrl("VacationRequests")}>
                            <Button 
                                variant="outline" 
                                className={`relative transition-all duration-300 w-full ${
                                    hasVacationResponses
                                    ? 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200/70 hover:text-blue-900'
                                    : 'border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800'
                                }`}
                            >
                                {hasVacationResponses && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                    </span>
                                )}
                                <Plane className="w-4 h-4 ml-2" /> בקשת חופשה
                            </Button>
                        </Link>
                        <Button 
                            variant="outline" 
                            asChild 
                            className={`relative transition-all duration-300 ${
                                hasUnreadReferrals
                                ? 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200/70 hover:text-blue-900'
                                : 'border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800'
                            }`}
                        >
                            <Link to={createPageUrl("VetReferrals")}>
                                {hasUnreadReferrals && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                    </span>
                                )}
                                <MessageSquare className="w-4 h-4 ml-2" /> הודעות
                            </Link>
                        </Button>
                        <Button variant="outline" asChild className="border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                            <Link to={createPageUrl("Hospitalization")}>
                                <BedDouble className="w-4 h-4 ml-2" /> ניהול אשפוז
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            asChild
                            className={`relative transition-all duration-300 ${
                                hasPendingOrApprovedCases
                                ? 'bg-orange-100 border-orange-400 text-orange-800 hover:bg-orange-200/70 hover:text-orange-900'
                                : 'border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800'
                            }`}
                        >
                            <Link to={createPageUrl("MarpetTracking")}>
                                {hasPendingOrApprovedCases && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </span>
                                )}
                                <ClipboardList className="w-4 h-4 ml-2" />
                                מעקב מרפאט
                            </Link>
                        </Button>
                        <Button variant="outline" asChild className="border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                            <Link to={createPageUrl("Protocols")}>
                                <FileText className="w-4 h-4 ml-2" /> פרוטוקולים רפואיים
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}