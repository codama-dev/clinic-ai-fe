import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeeklySchedule } from '@/entities/WeeklySchedule';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, ShieldAlert, Eye, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { format, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ChangesSummary = ({ currentSchedule, previousSchedule }) => {
    if (!previousSchedule || Object.keys(previousSchedule).length === 0) {
        return null;
    }

    const changes = [];
    const DAYS_HE = {
        sunday: "יום א'", monday: "יום ב'", tuesday: "יום ג'", 
        wednesday: "יום ד'", thursday: "יום ה'", friday: "יום ו'"
    };

    Object.keys(DAYS_HE).forEach(dayKey => {
        ['morning', 'evening'].forEach(shiftType => {
            const current = currentSchedule[dayKey]?.[shiftType] || [];
            const previous = previousSchedule[dayKey]?.[shiftType] || [];

            const added = current.filter(name => !previous.includes(name));
            const removed = previous.filter(name => !current.includes(name));

            if (added.length > 0 || removed.length > 0) {
                changes.push({
                    day: DAYS_HE[dayKey],
                    shift: shiftType === 'morning' ? 'בוקר' : 'ערב',
                    added,
                    removed
                });
            }
        });
    });

    if (changes.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                שינויים שבוצעו מאז הסידור המאושר האחרון:
            </h4>
            <div className="space-y-2 text-sm">
                {changes.map((change, idx) => (
                    <div key={idx} className="border-r-2 border-yellow-400 pr-3">
                        <p className="font-semibold text-gray-800">{change.day} - {change.shift}:</p>
                        {change.added.length > 0 && (
                            <p className="text-green-700">
                                ➕ נוספו: {change.added.join(', ')}
                            </p>
                        )}
                        {change.removed.length > 0 && (
                            <p className="text-red-700">
                                ➖ הוסרו: {change.removed.join(', ')}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function ApproveSchedulesPage() {
    const [pendingSchedules, setPendingSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const user = await User.me();
            setCurrentUser(user);

            if (user.role === 'admin' || user.permissions?.includes('approve_schedules')) {
                const schedules = await WeeklySchedule.filter({ approval_status: 'pending_approval' });
                // Sort by submitted date, most recent first
                schedules.sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date));
                setPendingSchedules(schedules);
            }
        } catch (error) {
            console.error("Error loading pending schedules:", error);
        }
        setIsLoading(false);
    };

    const handleApprove = async (schedule) => {
        setIsProcessing(true);
        try {
            await WeeklySchedule.update(schedule.id, {
                approval_status: 'approved',
                is_published: true,
                approved_by: currentUser.display_name || currentUser.full_name,
                publication_date: new Date().toISOString(),
                previous_approved_schedule_data: {} // Clear after approval
            });
            toast.success(`סידור לשבוע ${format(new Date(schedule.week_start_date), 'dd/MM/yyyy', { locale: he })} אושר ופורסם!`);
            loadData();
        } catch (error) {
            console.error("Error approving schedule:", error);
            toast.error("שגיאה באישור הסידור");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectClick = (schedule) => {
        setSelectedSchedule(schedule);
        setRejectionReason('');
        setShowRejectDialog(true);
    };

    const handleRejectConfirm = async () => {
        if (!rejectionReason.trim()) {
            toast.error("יש להזין סיבת דחייה");
            return;
        }

        setIsProcessing(true);
        try {
            await WeeklySchedule.update(selectedSchedule.id, {
                approval_status: 'rejected',
                rejection_reason: rejectionReason,
                is_published: false
            });
            toast.success("הסידור נדחה. המשתמש יקבל הודעה על הדחייה.");
            setShowRejectDialog(false);
            setSelectedSchedule(null);
            setRejectionReason('');
            loadData();
        } catch (error) {
            console.error("Error rejecting schedule:", error);
            toast.error("שגיאה בדחיית הסידור");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewSchedule = (schedule) => {
        // Navigate to the schedule manager with the specific week
        const weekStartDate = new Date(schedule.week_start_date);
        navigate(`${createPageUrl("WeeklyScheduleManager")}?week=${format(weekStartDate, 'yyyy-MM-dd')}`);
    };

    if (isLoading) {
        return <p>טוען...</p>;
    }

    if (currentUser?.role !== 'admin' && !currentUser?.permissions?.includes('approve_schedules')) {
        return (
            <Card className="max-w-2xl mx-auto mt-10 border-red-500">
                <CardHeader className="text-center">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
                    <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-gray-600">עמוד זה מיועד למנהלי מערכת ומשתמשים עם הרשאת אישור סידורים בלבד.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">אישור סידורים</h1>
                <p className="text-gray-500">סידורים שנשלחו על ידי מנהלים וממתינים לאישורך</p>
            </div>

            {pendingSchedules.length === 0 ? (
                <Card className="text-center py-16">
                    <CardContent>
                        <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-xl font-medium text-gray-600">אין סידורים ממתינים</p>
                        <p className="text-gray-500 mt-2">כל הסידורים טופלו או שלא נשלחו סידורים חדשים.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {pendingSchedules.map((schedule) => {
                        const weekStart = new Date(schedule.week_start_date);
                        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
                        const hasChanges = schedule.previous_approved_schedule_data && 
                                         Object.keys(schedule.previous_approved_schedule_data).length > 0;
                        
                        return (
                            <Card key={schedule.id} className="border-yellow-200">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-yellow-600" />
                                                שבוע {format(weekStart, 'dd/MM', { locale: he })} - {format(weekEnd, 'dd/MM', { locale: he })}
                                                {hasChanges && (
                                                    <Badge className="bg-orange-100 text-orange-800">יש שינויים</Badge>
                                                )}
                                            </CardTitle>
                                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                                                <p><strong>נשלח על ידי:</strong> {schedule.submitted_by}</p>
                                                <p><strong>תאריך שליחה:</strong> {format(new Date(schedule.submitted_date), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                                            </div>
                                            {hasChanges && (
                                                <ChangesSummary 
                                                    currentSchedule={schedule.schedule_data}
                                                    previousSchedule={schedule.previous_approved_schedule_data}
                                                />
                                            )}
                                        </div>
                                        <Badge className="bg-yellow-100 text-yellow-800">ממתין לאישור</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleViewSchedule(schedule)}
                                            className="flex-1"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            צפייה בסידור
                                        </Button>
                                        <Button
                                            onClick={() => handleApprove(schedule)}
                                            disabled={isProcessing}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            אישור ופרסום
                                        </Button>
                                        <Button
                                            onClick={() => handleRejectClick(schedule)}
                                            disabled={isProcessing}
                                            variant="destructive"
                                            className="flex-1"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            דחייה
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>דחיית סידור</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-600">
                            אנא הזן סיבה לדחיית הסידור. הסיבה תוצג למשתמש ששלח את הסידור.
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="rejection_reason">סיבת הדחייה</Label>
                            <Textarea
                                id="rejection_reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="לדוגמה: חוסר באיוש במשמרת בוקר ביום רביעי, נדרש לתקן..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing}>
                            ביטול
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleRejectConfirm}
                            disabled={isProcessing || !rejectionReason.trim()}
                        >
                            אישור דחייה
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}