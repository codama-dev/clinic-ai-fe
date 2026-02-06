import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Users, Clock, Plane, GanttChartSquare, ShoppingCart, FileText, DollarSign, CheckSquare, BarChart3, TrendingUp, AlertTriangle, CheckCircle2, UserCheck, Calendar, Activity, Percent, Award, Briefcase, XCircle, Bell, Settings, RefreshCw, Mail, Stethoscope, Database, Folder } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, addWeeks, getDay, getHours, subWeeks, parseISO, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, startOfDay, endOfDay, addDays, eachDayOfInterval, parse, differenceInMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from 'lucide-react';

// Helper function to calculate business days (excluding Friday and Saturday)
const calculateBusinessDays = (startDate, endDate) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => {
    const dayOfWeek = getDay(day);
    return dayOfWeek !== 5 && dayOfWeek !== 6; // 5 = Friday, 6 = Saturday
  }).length;
};

const allAdminLinks = [
    { id: 'xml_import', title: "ייבוא נתונים", href: createPageUrl("XMLDataImport"), icon: Database, description: "ייבוא נתונים מקובץ XML למערכת", adminOnly: true },
    { id: 'manage_employees', title: "ניהול משתמשים", href: createPageUrl("UsersPage"), icon: Users, description: "הוספה, עריכה וניהול של צוות המרפאה", permissions: ['manage_employees'] },
    { id: 'manage_schedule', title: "ניהול סידור שבועי", href: createPageUrl("WeeklyScheduleManager"), icon: GanttChartSquare, description: "יצירה ועריכה של לוחות משמרות שבועיים", permissions: ['manage_schedule'] },
    { id: 'approve_schedule', title: "אישור סידורים", href: createPageUrl("ApproveSchedules"), icon: CheckSquare, description: "אישור ודחיית סידורי עבודה שבועיים", permissions: ['approve_schedules'] },
    { id: 'manage_vacations', title: "ניהול חופשות", href: createPageUrl("VacationRequests"), icon: Plane, description: "אישור ודחייה של בקשות חופשה", permissions: ['manage_vacations'] },
    { id: 'time_clock_management', title: "ניהול נוכחות", href: createPageUrl("TimeClockManagement"), icon: Clock, description: "מעקב ועריכת רישומי נוכחות עובדים", permissions: ['manage_time_clock'] },
    { id: 'medical_management', title: "ניהול רפואי", href: createPageUrl("MedicalManagement"), icon: Stethoscope, description: "ניהול תבניות פרוטוקול והגדרות רפואיות", permissions: ['manage_medical'] },
    { id: 'manage_orders', title: "ניהול הזמנות", href: createPageUrl("OrderManagement"), icon: ShoppingCart, description: "מעקב וניהול אחר הזמנות המרפאה", permissions: ['manage_orders'] },
    { id: 'manage_shift_templates', title: "ניהול תבניות משמרת", href: createPageUrl("ShiftTemplatesManager"), icon: Clock, description: "הגדרת סוגי משמרות, שעות ודרישות", permissions: ['manage_shift_templates'] },
    { id: 'manage_price_lists', title: "מחירונים", href: createPageUrl("PriceListsPage"), icon: DollarSign, description: "ניהול מחירוני ספקים ולקוחות", permissions: ['manage_supplier_prices', 'manage_client_prices'] },
    { id: 'manage_calendar', title: "ניהול יומן תורים", href: createPageUrl("CalendarSettingsManager"), icon: Calendar, description: "ניהול סוגי ביקור, מרווחי זמן, תאריכים חסומים ושעות עבודה", permissions: ['manage_calendar'] },
    { id: 'manage_notifications', title: "ניהול הודעות ותזכורות", href: createPageUrl("NotificationsManager"), icon: Bell, description: "ניהול הודעות SMS, WhatsApp ואימייל ללקוחות", permissions: ['manage_notifications'] },
    { id: 'manage_forms', title: "ניהול טפסים", href: createPageUrl("FormsManagement"), icon: Settings, description: "הגדרת שדות, ולידציות והגדרות מתקדמות לטפסים במערכת", permissions: ['manage_forms'] },
    { id: 'view_reports', title: "דוחות ניהוליים", href: createPageUrl("ReportsPage"), icon: BarChart3, description: "יצירת דוחות נתונים על עובדים והזמנות", permissions: ['view_reports'] },
];

const DAYS_HE = {
    sunday: "יום א'", monday: "יום ב'", tuesday: "יום ג'", wednesday: "יום ד'",
    thursday: "יום ה'", friday: "יום ו'", saturday: "שבת"
};

export default function AdminDashboard() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [availableLinks, setAvailableLinks] = useState([]);
    const [expandedVacations, setExpandedVacations] = useState(false);
    const [expandedConstraints, setExpandedConstraints] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Query for pending inventory shortages
    const { data: pendingShortages } = useQuery({
        queryKey: ['pendingInventoryShortages'],
        queryFn: async () => {
            const results = await base44.entities.InventoryShortage.filter({ status: 'needed' });
            return results;
        },
        enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_orders')),
        refetchInterval: 30000,
    });

    // Query for unapproved users
    const { data: unapprovedUsers } = useQuery({
        queryKey: ['unapprovedUsers'],
        queryFn: async () => {
            const results = await base44.entities.PublicProfile.list();
            return results.filter(user => !user.display_name);
        },
        enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_employees')),
        refetchInterval: 30000,
    });

    // Query for pending vacation requests
    const { data: pendingVacations } = useQuery({
        queryKey: ['pendingVacationRequests'],
        queryFn: async () => {
            const results = await base44.entities.VacationRequest.filter({ status: 'pending' });
            return results;
        },
        enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_vacations')),
        refetchInterval: 30000,
    });

    // Query for schedules pending approval
    const { data: pendingSchedules } = useQuery({
        queryKey: ['pendingScheduleApprovals'],
        queryFn: async () => {
            const results = await base44.entities.WeeklySchedule.filter({ approval_status: 'pending_approval' });
            return results;
        },
        enabled: !!currentUser && currentUser.role === 'admin',
        refetchInterval: 30000,
    });

    // Query for next week's schedule
    const { data: nextWeekSchedule } = useQuery({
        queryKey: ['nextWeekSchedule'],
        queryFn: async () => {
            const nextWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1);
            const nextWeekStartDate = format(nextWeekStart, 'yyyy-MM-dd');
            const results = await base44.entities.WeeklySchedule.filter({ week_start_date: nextWeekStartDate });
            return results;
        },
        enabled: !!currentUser && currentUser.role === 'admin',
        refetchInterval: 30000,
    });

    // Query current week's schedule
    const { data: currentWeekSchedule } = useQuery({
        queryKey: ['currentWeekSchedule'],
        queryFn: async () => {
            const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
            const currentWeekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
            const results = await base44.entities.WeeklySchedule.filter({ 
                week_start_date: currentWeekStartDate,
                is_published: true 
            });
            return results;
        },
        enabled: !!currentUser && currentUser.role === 'admin',
        refetchInterval: 30000,
    });

    // NEW QUERIES FOR ANALYTICS - ADMIN ONLY

    // Query all employees
    const { data: allEmployees = [] } = useQuery({
        queryKey: ['allEmployees'],
        queryFn: () => base44.entities.PublicProfile.list(),
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // Query shift templates
    const { data: shiftTemplates = [] } = useQuery({
        queryKey: ['shiftTemplates'],
        queryFn: () => base44.entities.ShiftTemplate.filter({ is_active: true }),
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // Query recent schedules (last 4 weeks)
    const { data: recentSchedules = [] } = useQuery({
        queryKey: ['recentSchedules'],
        queryFn: async () => {
            const schedules = await base44.entities.WeeklySchedule.list('-week_start_date', 4);
            return schedules.filter(s => s.is_published);
        },
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // Query constraints for NEXT WEEK ONLY
    const { data: nextWeekConstraints = [] } = useQuery({
        queryKey: ['nextWeekConstraints'],
        queryFn: async () => {
            const nextWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1);
            const nextWeekStartDate = format(nextWeekStart, 'yyyy-MM-dd');
            const results = await base44.entities.Constraint.filter({ week_start_date: nextWeekStartDate });
            return results;
        },
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // Query approved vacations for current month
    const { data: currentMonthVacations = [] } = useQuery({
        queryKey: ['currentMonthVacations'],
        queryFn: async () => {
            const monthStart = startOfMonth(new Date());
            const monthEnd = endOfMonth(new Date());
            const allVacations = await base44.entities.VacationRequest.filter({ status: 'approved' });
            return allVacations.filter(v => {
                const vacStart = parseISO(v.start_date);
                const vacEnd = parseISO(v.end_date);
                return (vacStart <= monthEnd && vacEnd >= monthStart);
            });
        },
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // Query time clock entries for attendance analysis
    const { data: timeClockEntries = [] } = useQuery({
        queryKey: ['timeClockEntries'],
        queryFn: async () => {
            const results = await base44.entities.TimeClockEntry.list('-created_date', 100);
            return results;
        },
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // Query filled protocols for productivity analysis
    const { data: filledProtocols = [] } = useQuery({
        queryKey: ['filledProtocols'],
        queryFn: async () => {
            const results = await base44.entities.FilledProtocol.list('-created_date', 200);
            return results;
        },
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // Query treatment executions for productivity analysis
    const { data: treatmentExecutions = [] } = useQuery({
        queryKey: ['treatmentExecutions'],
        queryFn: async () => {
            const results = await base44.entities.TreatmentExecution.list('-created_date', 200);
            return results;
        },
        enabled: !!currentUser && currentUser.role === 'admin',
    });

    // ANALYTICS CALCULATIONS
    const analytics = useMemo(() => {
        if (!allEmployees.length || !recentSchedules.length) {
            return null;
        }

        const activeEmployees = allEmployees.filter(e => e.job && e.job !== 'admin');
        const doctorCount = activeEmployees.filter(e => e.job === 'doctor').length;
        const assistantCount = activeEmployees.filter(e => e.job === 'assistant').length;
        const receptionistCount = activeEmployees.filter(e => e.job === 'receptionist').length;

        // Calculate shift fill rates
        let totalShiftsRequired = 0;
        let totalShiftsFilled = 0;
        let shiftsByEmployee = {};
        let oncallByEmployee = {};

        recentSchedules.forEach(schedule => {
            if (!schedule.schedule_data) return;

            Object.entries(schedule.schedule_data).forEach(([day, dayData]) => {
                if (day === 'weekend_oncall') {
                    const oncallList = Array.isArray(dayData) ? dayData : [];
                    oncallList.forEach(name => {
                        oncallByEmployee[name] = (oncallByEmployee[name] || 0) + 1;
                    });
                    return;
                }

                ['morning', 'evening'].forEach(shift => {
                    if (day === 'friday' && shift === 'evening') return;

                    totalShiftsRequired++;
                    const employees = dayData?.[shift] || [];
                    if (employees.length > 0) {
                        totalShiftsFilled++;
                        employees.forEach(name => {
                            shiftsByEmployee[name] = (shiftsByEmployee[name] || 0) + 1;
                        });
                    }
                });
            });
        });

        const fillRate = totalShiftsRequired > 0 ? (totalShiftsFilled / totalShiftsRequired) * 100 : 0;

        // Find employees with most shifts
        const employeeShiftList = Object.entries(shiftsByEmployee)
            .map(([name, count]) => ({ name, shifts: count, oncall: oncallByEmployee[name] || 0 }))
            .sort((a, b) => b.shifts - a.shifts)
            .slice(0, 5);

        const avgShiftsPerEmployee = Object.keys(shiftsByEmployee).length > 0
            ? Object.values(shiftsByEmployee).reduce((a, b) => a + b, 0) / Object.keys(shiftsByEmployee).length
            : 0;

        // Group vacations by employee - RECALCULATE BUSINESS DAYS
        const vacationsByEmployee = {};
        currentMonthVacations.forEach(v => {
            // Recalculate business days to ensure accuracy
            const businessDays = calculateBusinessDays(parseISO(v.start_date), parseISO(v.end_date));
            
            if (!vacationsByEmployee[v.employee_name]) {
                vacationsByEmployee[v.employee_name] = [];
            }
            vacationsByEmployee[v.employee_name].push({
                startDate: v.start_date,
                endDate: v.end_date,
                days: businessDays, // Use recalculated business days
                type: v.vacation_type === 'sick_leave' ? 'מחלה' : 'חופשה'
            });
        });

        // Recalculate total vacation days using business days
        const totalVacationDays = Object.values(vacationsByEmployee)
            .flat()
            .reduce((sum, v) => sum + v.days, 0);

        // Group constraints by employee - NEXT WEEK ONLY
        const constraintsByEmployee = {};
        nextWeekConstraints.forEach(c => {
            if (!constraintsByEmployee[c.employee_name]) {
                constraintsByEmployee[c.employee_name] = [];
            }
            constraintsByEmployee[c.employee_name].push({
                day: DAYS_HE[c.unavailable_day],
                shift: c.unavailable_shift === 'morning' ? 'בוקר' : 'ערב',
                weekStart: c.week_start_date
            });
        });

        const employeesWithConstraints = Object.keys(constraintsByEmployee);
        const employeesWithoutConstraints = activeEmployees
            .filter(e => !employeesWithConstraints.includes(e.display_name))
            .map(e => e.display_name);

        // Calculate current shift employees
        let currentShiftEmployees = [];
        let currentShiftDate = '';
        if (currentWeekSchedule && currentWeekSchedule.length > 0) {
            const schedule = currentWeekSchedule[0];
            const now = new Date();
            const currentHour = getHours(now);
            const currentDayIndex = getDay(now); // 0 = Sunday
            const dayKeys = Object.keys(DAYS_HE);
            const currentDayKey = dayKeys[currentDayIndex];
            
            // Determine current shift based on time
            const currentShift = currentHour < 14 ? 'morning' : 'evening';
            currentShiftDate = format(now, 'dd/MM/yyyy', { locale: he });
            
            if (schedule.schedule_data && schedule.schedule_data[currentDayKey]) {
                const employees = schedule.schedule_data[currentDayKey][currentShift] || [];
                currentShiftEmployees = employees.map(name => ({ 
                    name, 
                    shift: currentShift === 'morning' ? 'בוקר' : 'ערב',
                    day: DAYS_HE[currentDayKey]
                }));
            }
        }

        // Calculate attendance punctuality (late vs early arrivals)
        const punctualityByEmployee = {};
        
        // Create a map of day keys to their index for easier lookup
        const dayKeyMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

        timeClockEntries.forEach(entry => {
            // Require clock_in_time, employee_name, and date
            if (!entry.clock_in_time || !entry.employee_name || !entry.date) return;

            // Find the schedule for this entry's week
            const entryDate = parseISO(entry.date);
            const weekStart = startOfWeek(entryDate, { weekStartsOn: 0 });
            const weekStartStr = format(weekStart, 'yyyy-MM-dd');
            
            const schedule = recentSchedules.find(s => s.week_start_date === weekStartStr && s.is_published);
            if (!schedule || !schedule.schedule_data) return;
            
            // Determine which day of the week this entry is for
            const dayIndex = getDay(entryDate);
            const dayKey = Object.keys(dayKeyMap).find(key => dayKeyMap[key] === dayIndex);
            if (!dayKey || !schedule.schedule_data[dayKey]) return;
            
            // Find which shift(s) this employee was scheduled for on this day
            const daySchedule = schedule.schedule_data[dayKey];
            let scheduledShift = null;
            
            if (daySchedule.morning && daySchedule.morning.includes(entry.employee_name)) {
                scheduledShift = 'morning';
            } else if (daySchedule.evening && daySchedule.evening.includes(entry.employee_name)) {
                scheduledShift = 'evening';
            }
            
            // If employee wasn't scheduled, skip this entry
            if (!scheduledShift) return;
            
            // Find the shift template for the scheduled shift
            let shiftStartTimeStr = '';
            if (scheduledShift === 'morning') {
                const template = shiftTemplates.find(t => t.name === 'משמרת בוקר' || t.name.includes('בוקר'));
                shiftStartTimeStr = template?.start_time || '09:00';
            } else if (scheduledShift === 'evening') {
                const template = shiftTemplates.find(t => t.name === 'משמרת ערב' || t.name.includes('ערב'));
                shiftStartTimeStr = template?.start_time || '14:00';
            } else {
                return;
            }
            
            // Parse check-in time and shift start time
            const checkInTime = parse(`${entry.date} ${entry.clock_in_time}`, 'yyyy-MM-dd HH:mm', new Date());
            const shiftStartTime = parse(`${entry.date} ${shiftStartTimeStr}`, 'yyyy-MM-dd HH:mm', new Date());
            
            // Calculate difference in minutes
            const diffMinutes = differenceInMinutes(checkInTime, shiftStartTime);
            
            // Ignore entries with more than 45 minutes difference (likely errors or exceptional cases)
            if (Math.abs(diffMinutes) > 45) return;
            
            // Initialize employee tracking
            if (!punctualityByEmployee[entry.employee_name]) {
                punctualityByEmployee[entry.employee_name] = {
                    lateCount: 0,
                    earlyCount: 0,
                    totalMinutesLate: 0,
                    totalMinutesEarly: 0,
                    onTimeCount: 0
                };
            }
            
            // Categorize (tolerance of ±5 minutes is on-time)
            if (diffMinutes > 5) {
                punctualityByEmployee[entry.employee_name].lateCount++;
                punctualityByEmployee[entry.employee_name].totalMinutesLate += diffMinutes;
            } else if (diffMinutes < -5) {
                punctualityByEmployee[entry.employee_name].earlyCount++;
                punctualityByEmployee[entry.employee_name].totalMinutesEarly += Math.abs(diffMinutes);
            } else {
                punctualityByEmployee[entry.employee_name].onTimeCount++;
            }
        });
        
        // Find chronic late and early employees
        const lateEmployees = Object.entries(punctualityByEmployee)
            .filter(([_, stats]) => stats.lateCount > 0)
            .map(([name, stats]) => ({
                name,
                lateCount: stats.lateCount,
                avgMinutesLate: (stats.totalMinutesLate / stats.lateCount).toFixed(0)
            }))
            .sort((a, b) => b.lateCount - a.lateCount);
            
        const earlyEmployees = Object.entries(punctualityByEmployee)
            .filter(([_, stats]) => stats.earlyCount > 0)
            .map(([name, stats]) => ({
                name,
                earlyCount: stats.earlyCount,
                avgMinutesEarly: (stats.totalMinutesEarly / stats.earlyCount).toFixed(0)
            }))
            .sort((a, b) => b.earlyCount - a.earlyCount);
        
        const chronicLateEmployee = lateEmployees.length > 0 ? lateEmployees[0] : null;
        const chronicEarlyEmployee = earlyEmployees.length > 0 ? earlyEmployees[0] : null;

        // Calculate protocol fill statistics
        const protocolsByEmployee = {};
        filledProtocols.forEach(protocol => {
            if (!protocol.filled_by_name) return;
            protocolsByEmployee[protocol.filled_by_name] = (protocolsByEmployee[protocol.filled_by_name] || 0) + 1;
        });
        
        const topProtocolFiller = Object.entries(protocolsByEmployee)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)[0] || null;

        // Calculate treatment execution statistics
        const treatmentsByEmployee = {};
        treatmentExecutions.forEach(execution => {
            if (!execution.executed_by_name) return;
            treatmentsByEmployee[execution.executed_by_name] = (treatmentsByEmployee[execution.executed_by_name] || 0) + 1;
        });
        
        const topTreatmentExecutor = Object.entries(treatmentsByEmployee)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)[0] || null;

        return {
            activeEmployees: activeEmployees.length,
            doctorCount,
            assistantCount,
            receptionistCount,
            fillRate: fillRate.toFixed(1),
            avgShiftsPerEmployee: avgShiftsPerEmployee.toFixed(1),
            topEmployees: employeeShiftList,
            employeesOnVacationCount: Object.keys(vacationsByEmployee).length,
            totalVacationDays,
            vacationsByEmployee,
            employeesWithConstraintsCount: employeesWithConstraints.length,
            constraintSubmissionRate: activeEmployees.length > 0 
                ? ((employeesWithConstraints.length / activeEmployees.length) * 100).toFixed(0)
                : 0,
            constraintsByEmployee,
            employeesWithoutConstraints,
            currentShiftEmployees,
            currentShiftDate,
            chronicLateEmployee,
            chronicEarlyEmployee,
            punctualityByEmployee,
            topProtocolFiller,
            topTreatmentExecutor,
        };
    }, [allEmployees, recentSchedules, nextWeekConstraints, currentMonthVacations, currentWeekSchedule, timeClockEntries, shiftTemplates, filledProtocols, treatmentExecutions]);

    // Check if it's Thursday after 20:00 and no schedule exists for next week
    const isThursdayAfter8PM = () => {
        const now = new Date();
        const dayOfWeek = getDay(now);
        const hour = getHours(now);
        return dayOfWeek === 4 && hour >= 20;
    };

    const hasPendingShortages = pendingShortages && pendingShortages.length > 0;
    const hasUnapprovedUsers = unapprovedUsers && unapprovedUsers.length > 0;
    const hasPendingVacations = pendingVacations && pendingVacations.length > 0;
    const hasPendingSchedules = pendingSchedules && pendingSchedules.length > 0;
    const needsScheduleCreation = isThursdayAfter8PM() && (!nextWeekSchedule || nextWeekSchedule.length === 0);

    // Sync birthdays mutation - only updates existing PublicProfile records
    const syncBirthdaysMutation = useMutation({
        mutationFn: async () => {
            const users = await base44.entities.User.list();
            const publicProfiles = await base44.entities.PublicProfile.list();
            
            let updatedCount = 0;
            let skippedCount = 0;
            
            for (const user of users) {
                if (!user.date_of_birth) continue;
                
                // Find existing profile - will NOT create new records
                const profile = publicProfiles.find(p => p.user_id === user.id);
                
                if (!profile) {
                    // Skip users without existing PublicProfile
                    skippedCount++;
                    continue;
                }
                
                // Only update if birthday_date is different or missing
                if (profile.birthday_date !== user.date_of_birth) {
                    await base44.entities.PublicProfile.update(profile.id, {
                        birthday_date: user.date_of_birth
                    });
                    updatedCount++;
                }
            }
            
            return { updatedCount, skippedCount };
        },
        onSuccess: ({ updatedCount, skippedCount }) => {
            queryClient.invalidateQueries(['allUsersForBirthdays']);
            toast({
                title: "סינכרון הושלם",
                description: `עודכנו ${updatedCount} פרופילים${skippedCount > 0 ? `, ${skippedCount} משתמשים ללא פרופיל דולגו` : ''}`,
            });
        },
        onError: (error) => {
            console.error('Error syncing birthdays:', error);
            toast({
                title: "שגיאה בסינכרון",
                description: "אירעה שגיאה בעדכון תאריכי הלידה",
                variant: "destructive"
            });
        }
    });

    const handleSyncBirthdays = () => {
        if (window.confirm('האם לסנכרן את תאריכי הלידה מ-User ל-PublicProfile?')) {
            syncBirthdaysMutation.mutate();
        }
    };

    useEffect(() => {
        const fetchUserAndSetLinks = async () => {
            try {
                const user = await base44.auth.me();
                
                // DEBUG: Logging for permissions diagnosis in AdminDashboard
                console.log('=== AdminDashboard User Debug ===');
                console.log('Full user object:', user);
                console.log('user.role:', user.role);
                console.log('user.permissions:', user.permissions);
                console.log('typeof user.permissions:', typeof user.permissions);
                console.log('===================================');
                
                setCurrentUser(user);

                if (user.role === 'admin') {
                    setAvailableLinks(allAdminLinks);
                } else {
                    const userPermissions = user.permissions || [];
                    const filteredLinks = allAdminLinks.filter(link => {
                        if (link.adminOnly) return false;
                        // Check if user has ANY of the required permissions for this link
                        if (link.permissions && link.permissions.length > 0) {
                            return link.permissions.some(perm => userPermissions.includes(perm));
                        }
                        return false;
                    });
                    setAvailableLinks(filteredLinks);
                }
            } catch (e) {
                console.error("Failed to fetch user", e);
                setCurrentUser(null);
            }
            setIsLoading(false);
        };
        fetchUserAndSetLinks();
    }, []);

    if (isLoading) {
        return <p>טוען...</p>;
    }
    
    if (availableLinks.length === 0) {
        return (
             <Card className="max-w-2xl mx-auto mt-10 border-orange-500">
                <CardHeader className="text-center">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-16 h-16 mx-auto text-orange-500"
                    >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                    </svg>
                    <CardTitle className="text-2xl text-orange-700 mt-4">אין לך גישה למסכי ניהול</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-gray-600">
                        לא הוקצו לך הרשאות גישה למערכות הניהול. אם אתה סבור שזו טעות, פנה למנהל המערכת.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    const isAdmin = currentUser?.role === 'admin';

    // Group links by category
    const groupedLinks = {
        schedule: availableLinks.filter(l => ['manage_schedule', 'approve_schedule', 'manage_shift_templates', 'manage_employees', 'manage_vacations', 'time_clock_management'].includes(l.id)),
        medical: availableLinks.filter(l => ['medical_management', 'manage_calendar', 'manage_forms'].includes(l.id)),
        operations: availableLinks.filter(l => ['manage_orders', 'manage_price_lists', 'manage_notifications', 'view_reports', 'xml_import'].includes(l.id)),
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6" dir="rtl">
            <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-900">לוח בקרה למנהל</h1>
                <p className="text-sm text-gray-500 mt-1">ניהול כללי של מערכת סידור העבודה והמרפאה</p>
            </div>

            {/* MANAGEMENT LINKS SECTION - TABS */}
            <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="schedule" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 justify-center">
                        <GanttChartSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">ניהול עובדים ומשמרות</span>
                        <span className="sm:hidden">משמרות</span>
                    </TabsTrigger>
                    <TabsTrigger value="medical" className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                        <Stethoscope className="w-4 h-4" />
                        <span className="hidden sm:inline">הגדרות רפואיות ויומן תורים</span>
                        <span className="sm:hidden">רפואי</span>
                    </TabsTrigger>
                    <TabsTrigger value="operations" className="flex items-center gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden sm:inline">תפעול ודוחות</span>
                        <span className="sm:hidden">תפעול</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="mt-6 bg-blue-50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {groupedLinks.schedule.map(link => {
                        let showIndicator = false;
                        let indicatorCount = 0;
                        let indicatorMessage = '';
                        
                        if (link.id === 'manage_orders' && hasPendingShortages) {
                            showIndicator = true;
                            indicatorCount = pendingShortages.length;
                            indicatorMessage = `${indicatorCount} דיווחי חוסר ממתינים`;
                        } else if (link.id === 'manage_employees' && hasUnapprovedUsers) {
                            showIndicator = true;
                            indicatorCount = unapprovedUsers.length;
                            indicatorMessage = `${indicatorCount} משתמשים ממתינים לאישור`;
                        } else if (link.id === 'employee_management' && (hasPendingVacations || hasPendingSchedules)) {
                            showIndicator = true;
                            const totalPending = (pendingVacations?.length || 0) + (pendingSchedules?.length || 0);
                            indicatorMessage = `${totalPending} פריטים ממתינים`;
                        }
                        
                            return (
                                <Link to={link.href} key={link.id} className="block">
                                    <Button 
                                        variant="outline" 
                                        className={`w-full h-auto flex flex-col items-start gap-2 p-3 transition-colors ${
                                            showIndicator ? 'border-orange-300 hover:border-orange-400 hover:bg-orange-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <link.icon className={`w-4 h-4 ${showIndicator ? 'text-orange-600' : 'text-blue-600'}`} />
                                                <span className="text-sm font-medium text-gray-900">{link.title}</span>
                                            </div>
                                            {showIndicator && (
                                                <Badge variant="destructive" className="h-5 px-2 text-xs">
                                                    {indicatorCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="medical" className="mt-6 bg-green-50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {groupedLinks.medical.map(link => {
                            let showIndicator = false;
                            let indicatorCount = 0;
                            
                            return (
                                <Link to={link.href} key={link.id} className="block">
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-auto flex flex-col items-end gap-2 p-3 border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 flex-row-reverse">
                                            <link.icon className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-medium text-gray-900">{link.title}</span>
                                        </div>
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="operations" className="mt-6 bg-purple-50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {groupedLinks.operations.map(link => {
                            let showIndicator = false;
                            let indicatorCount = 0;
                            let indicatorMessage = '';
                            
                            if (link.id === 'manage_orders' && hasPendingShortages) {
                                showIndicator = true;
                                indicatorCount = pendingShortages.length;
                                indicatorMessage = `${indicatorCount} דיווחי חוסר`;
                            }
                            
                            return (
                                <Link to={link.href} key={link.id} className="block">
                                    <Button 
                                        variant="outline" 
                                        className={`w-full h-auto flex flex-col items-end gap-2 p-3 transition-colors ${
                                            showIndicator ? 'border-orange-300 hover:border-orange-400 hover:bg-orange-50' : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2 flex-row-reverse">
                                                <link.icon className={`w-4 h-4 ${showIndicator ? 'text-orange-600' : 'text-purple-600'}`} />
                                                <span className="text-sm font-medium text-gray-900">{link.title}</span>
                                            </div>
                                            {showIndicator && (
                                                <Badge variant="destructive" className="h-5 px-2 text-xs">
                                                    {indicatorCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ANALYTICS OVERVIEW SECTION - ADMIN ONLY */}
            {isAdmin && analytics && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        סקירה כללית
                    </h2>

                    {/* Shift Templates Quick Overview */}
                    {shiftTemplates.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                    תבניות משמרות פעילות ({shiftTemplates.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {shiftTemplates.map((template, idx) => (
                                        <div key={idx} className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-indigo-900">{template.name}</h4>
                                                <Badge variant="outline" className="text-xs">
                                                    {template.start_time} - {template.end_time}
                                                </Badge>
                                            </div>
                                            {template.staffing_requirements && Object.keys(template.staffing_requirements).length > 0 && (
                                                <div className="text-xs text-indigo-700 space-y-1">
                                                    {Object.entries(template.staffing_requirements).map(([role, req]) => (
                                                        <div key={role} className="flex justify-between">
                                                            <span>{role === 'doctor' ? 'רופאים' : role === 'assistant' ? 'עוזרים' : role === 'receptionist' ? 'קבלה' : role}:</span>
                                                            <span className="font-medium">{req.min}-{req.max}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t">
                                    <Link to={createPageUrl("ShiftTemplatesManager")}>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-indigo-50 text-indigo-700 border-indigo-300">
                                            → לניהול תבניות משמרות
                                        </Badge>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Current Shift Employees Detail */}
                    {analytics.currentShiftEmployees.length > 0 && (
                        <Card className="border-teal-200 bg-teal-50/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-teal-900">
                                    <Briefcase className="w-5 h-5 text-teal-600" />
                                    עובדים במשמרת נוכחית ({analytics.currentShiftEmployees[0]?.shift})
                                </CardTitle>
                                <p className="text-sm text-teal-700 mt-1">{analytics.currentShiftEmployees[0]?.day} • {analytics.currentShiftDate}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {analytics.currentShiftEmployees.map((emp, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-teal-200">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Employee Availability & Coverage */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Shift Workers */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-purple-600" />
                                    עובדים עם רוב המשמרות
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {analytics.topEmployees.length > 0 ? (
                                    <div className="space-y-3">
                                        {analytics.topEmployees.map((emp, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{emp.name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                                            <span>{emp.shifts} משמרות</span>
                                                            {emp.oncall > 0 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {emp.oncall} כוננויות
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Progress value={(emp.shifts / (analytics.avgShiftsPerEmployee * 2)) * 100} className="w-24 h-2" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 py-4">אין נתונים זמינים</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Employees on Vacation with Details - GROUPED BY EMPLOYEE */}
                        <Card className="border-orange-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plane className="w-5 h-5 text-orange-600" />
                                    עובדים בחופשה החודש ({analytics.employeesOnVacationCount})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {Object.keys(analytics.vacationsByEmployee).length > 0 ? (
                                    <Collapsible open={expandedVacations} onOpenChange={setExpandedVacations}>
                                        <div className="space-y-3">
                                            {Object.entries(analytics.vacationsByEmployee).slice(0, 3).map(([employeeName, vacations]) => (
                                                <div key={employeeName} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                    <p className="font-semibold text-gray-900 mb-2">{employeeName}</p>
                                                    <div className="space-y-1.5">
                                                        {vacations.map((vac, idx) => (
                                                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-orange-100">
                                                                <span className="text-xs text-gray-700">
                                                                    {format(parseISO(vac.startDate), 'dd/MM', { locale: he })} - {format(parseISO(vac.endDate), 'dd/MM', { locale: he })}
                                                                </span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {vac.days} ימי עבודה • {vac.type}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {Object.keys(analytics.vacationsByEmployee).length > 3 && (
                                            <>
                                                <CollapsibleContent>
                                                    <div className="space-y-3 mt-3">
                                                        {Object.entries(analytics.vacationsByEmployee).slice(3).map(([employeeName, vacations]) => (
                                                            <div key={employeeName} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                                <p className="font-semibold text-gray-900 mb-2">{employeeName}</p>
                                                                <div className="space-y-1.5">
                                                                    {vacations.map((vac, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-orange-100">
                                                                            <span className="text-xs text-gray-700">
                                                                                {format(parseISO(vac.startDate), 'dd/MM', { locale: he })} - {format(parseISO(vac.endDate), 'dd/MM', { locale: he })}
                                                                            </span>
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {vac.days} ימי עבודה • {vac.type}
                                                                            </Badge>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CollapsibleContent>
                                                <CollapsibleTrigger asChild>
                                                    <button className="w-full mt-3 text-xs text-orange-700 hover:text-orange-900 font-medium flex items-center justify-center gap-1">
                                                        {expandedVacations ? (
                                                            <>הצג פחות <ChevronUp className="w-3 h-3" /></>
                                                        ) : (
                                                            <>הצג עוד {Object.keys(analytics.vacationsByEmployee).length - 3} <ChevronDown className="w-3 h-3" /></>
                                                        )}
                                                    </button>
                                                </CollapsibleTrigger>
                                            </>
                                        )}
                                    </Collapsible>
                                ) : (
                                    <p className="text-center text-gray-500 py-4">אין עובדים בחופשה</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Constraint Submission Status with Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-blue-600" />
                                הגשת אילוצים לשבוע הקרוב
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">שיעור הגשה</span>
                                        <span className="text-2xl font-bold text-blue-700">{analytics.constraintSubmissionRate}%</span>
                                    </div>
                                    <Progress value={parseFloat(analytics.constraintSubmissionRate)} className="h-3" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-700">{analytics.employeesWithConstraintsCount}</p>
                                        <p className="text-xs text-gray-600">הגישו אילוצים</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-orange-700">
                                            {analytics.activeEmployees - analytics.employeesWithConstraintsCount}
                                        </p>
                                        <p className="text-xs text-gray-600">טרם הגישו</p>
                                    </div>
                                </div>

                                {/* Detailed Constraints */}
                                <Collapsible open={expandedConstraints} onOpenChange={setExpandedConstraints}>
                                    <div className="pt-3 border-t">
                                        <CollapsibleTrigger asChild>
                                            <button className="w-full flex items-center justify-between text-sm font-medium text-blue-700 hover:text-blue-900 p-2 rounded hover:bg-blue-50">
                                                <span>פירוט אילוצים ({analytics.employeesWithConstraintsCount} עובדים)</span>
                                                {expandedConstraints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
                                                {Object.entries(analytics.constraintsByEmployee).map(([name, constraints]) => (
                                                    <div key={name} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                        <p className="font-semibold text-gray-900 mb-2">{name}</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {constraints.map((constraint, idx) => (
                                                                <div key={idx} className="text-xs text-gray-700 bg-white p-2 rounded flex items-center gap-1">
                                                                    <XCircle className="w-3 h-3 text-red-500" />
                                                                    <span>{constraint.day} {constraint.shift}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {analytics.employeesWithoutConstraints.length > 0 && (
                                                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                    <p className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        עובדים שלא הגישו ({analytics.employeesWithoutConstraints.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {analytics.employeesWithoutConstraints.map((name, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-orange-700 border-orange-300">
                                                                {name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CollapsibleContent>
                                    </div>
                                </Collapsible>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Productivity Stars */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Protocol Filler */}
                        {analytics.topProtocolFiller && (
                            <Card className="border-blue-200 bg-blue-50/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-900">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        מלך/ת הפרוטוקולים
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold">
                                                {analytics.topProtocolFiller.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-lg">{analytics.topProtocolFiller.name}</p>
                                                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4 text-blue-500" />
                                                        {analytics.topProtocolFiller.count} פרוטוקולים
                                                    </span>
                                                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                                                        תותח מילוי
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Top Treatment Executor */}
                        {analytics.topTreatmentExecutor && (
                            <Card className="border-purple-200 bg-purple-50/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-purple-900">
                                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                                        מלך/ת הטיפולים
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold">
                                                {analytics.topTreatmentExecutor.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-lg">{analytics.topTreatmentExecutor.name}</p>
                                                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                                                        {analytics.topTreatmentExecutor.count} טיפולים בוצעו
                                                    </span>
                                                    <Badge variant="outline" className="text-purple-700 border-purple-300">
                                                        יד זהב
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Attendance Punctuality */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Chronic Late Employee */}
                        {analytics.chronicLateEmployee && (
                            <Card className="border-red-200 bg-red-50/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-red-900">
                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                        המאחר התמידי
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-700 font-bold">
                                                {analytics.chronicLateEmployee.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-lg">{analytics.chronicLateEmployee.name}</p>
                                                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4 text-red-500" />
                                                        {analytics.chronicLateEmployee.lateCount} איחורים
                                                    </span>
                                                    <Badge variant="outline" className="text-red-700 border-red-300">
                                                        ממוצע: {analytics.chronicLateEmployee.avgMinutesLate} דקות
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Chronic Early Employee */}
                        {analytics.chronicEarlyEmployee && (
                            <Card className="border-emerald-200 bg-emerald-50/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-emerald-900">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        המקדים התמידי
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-emerald-200">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                {analytics.chronicEarlyEmployee.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-lg">{analytics.chronicEarlyEmployee.name}</p>
                                                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4 text-emerald-500" />
                                                        {analytics.chronicEarlyEmployee.earlyCount} הקדמות
                                                    </span>
                                                    <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                                                        ממוצע: {analytics.chronicEarlyEmployee.avgMinutesEarly} דקות
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                </div>
            )}


        </div>
    );
}