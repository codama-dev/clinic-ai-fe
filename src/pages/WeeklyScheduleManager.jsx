import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, ShieldAlert, CheckCircle, History } from 'lucide-react';
import ManualScheduler from '../components/admin/ManualScheduler';
import ScheduleGenerator from '../components/admin/ScheduleGenerator';
import WeekSelector from '../components/schedule/WeekSelector';
import { format, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { debounce } from 'lodash';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { WeeklySchedule } from "@/entities/WeeklySchedule";
import { Constraint } from "@/entities/Constraint";
import { ShiftTemplate } from "@/entities/ShiftTemplate";
import { VacationRequest } from "@/entities/VacationRequest";
import { ExternalEmployee } from "@/entities/ExternalEmployee";

export default function WeeklyScheduleManager() {
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
    const [schedule, setSchedule] = useState(null);
    const [scheduleData, setScheduleData] = useState({});
    const [lockedShifts, setLockedShifts] = useState({});
    const [receptionCoverage, setReceptionCoverage] = useState({});
    const [constraints, setConstraints] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [shiftTemplates, setShiftTemplates] = useState([]);
    const [approvedVacations, setApprovedVacations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [approvedSchedules, setApprovedSchedules] = useState([]);

    const loadDataForWeek = useCallback(async () => {
        setIsLoading(true);
        const weekStartDateStr = format(currentWeek, 'yyyy-MM-dd');
        
        // Check if there's a week parameter in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const weekParam = urlParams.get('week');
        
        if (weekParam) {
            const targetWeek = startOfWeek(new Date(weekParam), { weekStartsOn: 0 });
            const targetWeekStr = format(targetWeek, 'yyyy-MM-dd');
            
            // Update current week if it's from URL parameter and differs from current state
            if (targetWeekStr !== weekStartDateStr) {
                setCurrentWeek(targetWeek);
                setIsLoading(false);
                return;
            }
        }
        
        try {
            const user = await base44.auth.me();
            
            // DEBUG: Logging for permissions diagnosis
            console.log('=== WeeklyScheduleManager User Debug ===');
            console.log('Full user object:', user);
            console.log('user.role:', user.role);
            console.log('user.permissions:', user.permissions);
            console.log('typeof user.permissions:', typeof user.permissions);
            console.log('user.permissions?.includes("manage_schedule"):', user.permissions?.includes('manage_schedule'));
            console.log('=======================================');
            
            setCurrentUser(user);
            
            const hasAccess = user.role === 'admin' || user.permissions?.includes('manage_schedule');
            if (hasAccess) {
                // Fetch all required data - PublicProfile now includes is_active field
                const [scheduleResult, constraintData, publicProfiles, externalData, templateData, vacationData, allSchedules] = await Promise.all([
                    WeeklySchedule.filter({ week_start_date: weekStartDateStr }),
                    Constraint.filter({ week_start_date: weekStartDateStr }),
                    base44.entities.PublicProfile.list(),
                    ExternalEmployee.list(),
                    ShiftTemplate.list(),
                    VacationRequest.filter({ status: 'approved' }),
                    WeeklySchedule.filter({ is_published: true, approval_status: 'approved' })
                ]);
                
                const existingSchedule = scheduleResult.length > 0 ? scheduleResult[0] : null;
                setSchedule(existingSchedule);
                setScheduleData(existingSchedule?.schedule_data || {});
                setLockedShifts(existingSchedule?.locked_shifts || {});
                setReceptionCoverage(existingSchedule?.reception_coverage || {});
                setConstraints(constraintData);

                const combinedEmployees = [
                    ...publicProfiles
                        .filter(p => p.is_active !== false) // Include if is_active is true or undefined (for backward compatibility)
                        .map(p => ({ 
                            id: p.user_id, 
                            display_name: p.display_name, 
                            job: p.job, 
                            is_active: p.is_active !== false,
                            type: 'user'
                        })),
                    ...externalData.filter(e => e.is_active).map(e => ({ 
                        id: e.id, 
                        display_name: e.name, 
                        job: e.job, 
                        is_active: e.is_active, 
                        type: 'external' 
                    }))
                ];
                
                // Remove duplicates by display_name (case-insensitive)
                const uniqueEmployees = [];
                const seenNames = new Set();
                
                for (const emp of combinedEmployees) {
                    const normalizedName = emp.display_name.toLowerCase().trim();
                    if (!seenNames.has(normalizedName)) {
                        seenNames.add(normalizedName);
                        uniqueEmployees.push(emp);
                    }
                }
                
                setAllEmployees(uniqueEmployees);

                setShiftTemplates(templateData);
                setApprovedVacations(vacationData);

                // Sort approved schedules by week_start_date descending
                const sortedSchedules = allSchedules.sort((a, b) => 
                    new Date(b.week_start_date) - new Date(a.week_start_date)
                );
                setApprovedSchedules(sortedSchedules);
            }
        } catch (error) {
            console.error("Error loading schedule data:", error);
        }
        setIsLoading(false);
    }, [currentWeek]);

    useEffect(() => {
        loadDataForWeek();
    }, [loadDataForWeek]);

    const debouncedSave = useCallback(
        debounce(async (data, locks, coverage) => {
            setIsSaving(true);
            const weekStartDateStr = format(currentWeek, 'yyyy-MM-dd');
            try {
                if (schedule && schedule.id) {
                    await WeeklySchedule.update(schedule.id, { schedule_data: data, locked_shifts: locks, reception_coverage: coverage });
                } else {
                    const newSchedule = await WeeklySchedule.create({
                        week_start_date: weekStartDateStr,
                        schedule_data: data,
                        locked_shifts: locks,
                        reception_coverage: coverage,
                        is_published: false,
                    });
                    setSchedule(newSchedule); // Set the new schedule object so we get an ID for next saves
                }
            } catch (error) {
                console.error("Error auto-saving schedule:", error);
            }
            setIsSaving(false);
        }, 1500), [currentWeek, schedule] // Dependency on schedule is important here
    );

    const handleScheduleDataChange = (newScheduleData) => {
        setScheduleData(newScheduleData);
        debouncedSave(newScheduleData, lockedShifts, receptionCoverage);
    };

    const handleLockedShiftsChange = (newLockedShifts) => {
        setLockedShifts(newLockedShifts);
        debouncedSave(scheduleData, newLockedShifts, receptionCoverage);
    };

    const handleReceptionCoverageChange = (newCoverage) => {
        setReceptionCoverage(newCoverage);
        debouncedSave(scheduleData, lockedShifts, newCoverage);
    };

    const handlePublishSchedule = async () => {
        if (!schedule || !schedule.id) {
            toast.error("יש לשמור את הסידור כטיוטה תחילה לפני הפרסום.");
            return;
        }
        setIsPublishing(true);
        try {
            const isAdmin = currentUser?.role === 'admin';
            
            // Save previous approved data when starting to edit an approved schedule
            const updateData = {
                schedule_data: scheduleData,
                locked_shifts: lockedShifts,
                reception_coverage: receptionCoverage,
            };
            
            // If this is a re-submission of an approved schedule, save the previous version
            if (schedule.is_published && schedule.approval_status === 'approved' && !schedule.previous_approved_schedule_data) {
                updateData.previous_approved_schedule_data = schedule.schedule_data;
            }
            
            if (isAdmin) {
                await WeeklySchedule.update(schedule.id, { 
                    ...updateData,
                    is_published: true,
                    approval_status: 'approved',
                    approved_by: currentUser.display_name || currentUser.full_name,
                    publication_date: new Date().toISOString(),
                    previous_approved_schedule_data: {}, // Clear after approval
                    rejection_reason: '' // Clear rejection reason on approval
                });
                toast.success("הסידור פורסם בהצלחה!");
            } else {
                await WeeklySchedule.update(schedule.id, { 
                    ...updateData,
                    approval_status: 'pending_approval',
                    submitted_by: currentUser.display_name || currentUser.full_name,
                    submitted_date: new Date().toISOString(),
                    is_published: false,
                    rejection_reason: '' // Clear rejection reason on re-submission
                });
                toast.success("הסידור נשלח לאישור מנהל המערכת!");
            }
            
            loadDataForWeek();
        } catch (error) {
            console.error("Error publishing schedule:", error);
            toast.error("שגיאה בשליחת הסידור");
        } finally {
            setIsPublishing(false);
        }
    };
    
    // Callback for the generator
    const handleScheduleGenerated = (newSchedule, errors) => {
        // The generator now returns a full, saved schedule object.
        // We simply reload all data from the database to ensure UI is in sync.
        loadDataForWeek();

        // The errors are still passed in case we need them for other logging in the future.
    };

    const handleSelectApprovedSchedule = (weekStartDate) => {
        const selectedWeek = startOfWeek(new Date(weekStartDate), { weekStartsOn: 0 });
        setCurrentWeek(selectedWeek);
    };

    if (isLoading) {
      return <p>טוען...</p>
    }

    const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_schedule');
    if (!hasAccess) {
        return (
          <Card className="max-w-2xl mx-auto mt-10 border-red-500">
            <CardHeader className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
              <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600">
                עמוד זה מיועד למנהלי מערכת או למשובצים בעלי הרשאת "ניהול סידור שבועי".
              </p>
            </CardContent>
          </Card>
        );
    }
    
    const schedulableEmployees = allEmployees.filter(emp => emp.is_active);
    const isPublished = schedule?.is_published;
    const approvalStatus = schedule?.approval_status || 'draft';
    const isAdmin = currentUser?.role === 'admin';
    
    const getStatusBadge = () => {
        if (isPublished && approvalStatus === 'approved') {
            return <Badge className="text-base bg-green-100 text-green-800">פורסם</Badge>;
        }
        if (approvalStatus === 'pending_approval') {
            return <Badge className="text-base bg-yellow-100 text-yellow-800">ממתין לאישור</Badge>;
        }
        if (approvalStatus === 'rejected') {
            return <Badge className="text-base bg-red-100 text-red-800">נדחה</Badge>;
        }
        return <Badge variant="secondary" className="text-base bg-orange-100 text-orange-800">טיוטה</Badge>;
    };
    
    const getPublishButtonText = () => {
        if (isPublishing) return 'מעדכן...';
        if (isAdmin) {
            return isPublished ? 'עדכון ופרסום מחדש' : 'אישור ופרסום סידור';
        }
        if (approvalStatus === 'rejected') return 'תיקון ושליחה מחדש לאישור';
        return approvalStatus === 'pending_approval' ? 'עדכון ושליחה מחדש' : 'שליחה לאישור';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">ניהול סידור שבועי</h1>
                <p className="text-gray-500 mt-1">
                    יצירה, עריכה ופרסום של סידור העבודה
                </p>
            </div>

            {!isAdmin && approvalStatus === 'rejected' && schedule?.rejection_reason && (
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-red-800">
                            <strong>הסידור נדחה:</strong> {schedule.rejection_reason}
                        </p>
                        <p className="text-xs text-red-600 mt-2">
                            ניתן לבצע שינויים בסידור ולהגיש מחדש לאישור
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-lg border-purple-200 bg-white">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Settings className="w-6 h-6 text-purple-600" />
                            סידור עבודה
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                        <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg mb-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <WeekSelector currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
                                    
                                    {approvedSchedules.length > 0 && (
                                        <Select value={format(currentWeek, 'yyyy-MM-dd')} onValueChange={handleSelectApprovedSchedule}>
                                            <SelectTrigger className="w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <History className="w-4 h-4" />
                                                    <SelectValue placeholder="סידורים קודמים" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {approvedSchedules.map((sched) => (
                                                    <SelectItem key={sched.id} value={sched.week_start_date}>
                                                        שבוע {format(new Date(sched.week_start_date), 'dd/MM/yyyy')}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    {isSaving && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>שומר...</span>
                                        </div>
                                    )}
                                    {schedule && getStatusBadge()}
                                    <Button 
                                        onClick={handlePublishSchedule}
                                        disabled={!schedule || isPublishing || isSaving}
                                        className={isAdmin ? "bg-green-600 hover:bg-green-700" : (approvalStatus === 'rejected' ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700")}
                                    >
                                        {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle className="w-4 h-4 mr-2" />}
                                        {getPublishButtonText()}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                       <Tabs defaultValue="manual" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="auto">סידור אוטומטי</TabsTrigger>
                                <TabsTrigger value="manual">עריכה ידנית</TabsTrigger>
                            </TabsList>
                            <TabsContent value="auto" className="pt-6">
                                 <ScheduleGenerator
                                    currentWeek={currentWeek}
                                    schedule={schedule}
                                    constraints={constraints}
                                    employees={schedulableEmployees}
                                    shiftTemplates={shiftTemplates}
                                    vacationRequests={approvedVacations}
                                    onScheduleGenerated={handleScheduleGenerated}
                                />
                            </TabsContent>
                            <TabsContent value="manual" className="pt-6">
                                <ManualScheduler
                                    currentWeek={currentWeek}
                                    scheduleData={scheduleData}
                                    lockedShifts={lockedShifts}
                                    employees={schedulableEmployees}
                                    shiftTemplates={shiftTemplates}
                                    receptionCoverage={receptionCoverage}
                                    onScheduleDataChange={handleScheduleDataChange}
                                    onLockedShiftsChange={handleLockedShiftsChange}
                                    onReceptionCoverageChange={handleReceptionCoverageChange}
                                    approvedVacations={approvedVacations}
                                    constraints={constraints}
                                />
                            </TabsContent>
                        </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}