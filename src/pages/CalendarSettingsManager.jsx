import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Lock, Briefcase, Plus, Edit, Trash2, AlertCircle, ListChecks, DollarSign, PartyPopper, DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TimeSlotSettingsForm from "../components/calendar-settings/TimeSlotSettingsForm";
import BlockedDatesForm from "../components/calendar-settings/BlockedDatesForm";
import WorkingHoursForm from "../components/calendar-settings/WorkingHoursForm";
import AppointmentTypeForm from "../components/appointments/AppointmentTypeForm";
import DoctorScheduleManager from "../components/calendar-settings/DoctorScheduleManager";
import RoomForm from "../components/calendar-settings/RoomForm";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CalendarSettingsManagerPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("time_slots");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const { specialDays } = await import('../components/utils/holidays');
        setHolidays(specialDays || []);
      } catch (error) {
        console.error("Failed to load holidays:", error);
      }
    };
    loadHolidays();
  }, []);

  const upcomingHolidays = useMemo(() => {
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    return holidays.filter(h => {
      const holidayDate = new Date(h.date);
      return holidayDate >= today && holidayDate <= oneYearFromNow;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [holidays]);

  const { data: allSettings = [], isLoading } = useQuery({
    queryKey: ['calendarSettings'],
    queryFn: () => base44.entities.CalendarSettings.list('-created_date', 200)
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const publicProfiles = await base44.entities.PublicProfile.list();
      return publicProfiles.filter(p => p.job === 'doctor' && p.is_active);
    }
  });

  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['appointmentTypes'],
    queryFn: () => base44.entities.AppointmentType.list('-created_date', 100),
    enabled: activeTab === 'appointment_types'
  });

  const { data: doctorSchedules = [] } = useQuery({
    queryKey: ['doctorSchedules'],
    queryFn: () => base44.entities.DoctorSchedule.list('-created_date', 500),
    enabled: activeTab === 'doctor_schedules'
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list('-created_date', 100),
    enabled: activeTab === 'rooms'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarSettings']);
      setIsFormOpen(false);
      setEditingItem(null);
      toast.success('ההגדרה נוספה בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarSettings']);
      setIsFormOpen(false);
      setEditingItem(null);
      toast.success('ההגדרה עודכנה בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarSettings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarSettings']);
      toast.success('ההגדרה נמחקה בהצלחה');
    }
  });

  const createAppointmentTypeMutation = useMutation({
    mutationFn: (data) => base44.entities.AppointmentType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointmentTypes']);
      setIsFormOpen(false);
      setEditingItem(null);
      toast.success('סוג הביקור נוסף בהצלחה');
    }
  });

  const updateAppointmentTypeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppointmentType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointmentTypes']);
      setIsFormOpen(false);
      setEditingItem(null);
      toast.success('סוג הביקור עודכן בהצלחה');
    }
  });

  const deleteAppointmentTypeMutation = useMutation({
    mutationFn: (id) => base44.entities.AppointmentType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointmentTypes']);
      toast.success('סוג הביקור נמחק בהצלחה');
    }
  });

  const saveDoctorScheduleMutation = useMutation({
    mutationFn: ({ data, id }) => {
      if (id) {
        return base44.entities.DoctorSchedule.update(id, data);
      } else {
        return base44.entities.DoctorSchedule.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorSchedules']);
      toast.success('המשמרת נשמרה בהצלחה');
    }
  });

  const deleteDoctorScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.DoctorSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorSchedules']);
      toast.success('המשמרת נמחקה בהצלחה');
    }
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.Room.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms']);
      setIsFormOpen(false);
      setEditingItem(null);
      toast.success('החדר נוסף בהצלחה');
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Room.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms']);
      setIsFormOpen(false);
      setEditingItem(null);
      toast.success('החדר עודכן בהצלחה');
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => base44.entities.Room.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms']);
      toast.success('החדר נמחק בהצלחה');
    }
  });

  const handleSubmit = (data) => {
    if (activeTab === 'appointment_types') {
      if (editingItem) {
        updateAppointmentTypeMutation.mutate({ id: editingItem.id, data });
      } else {
        createAppointmentTypeMutation.mutate(data);
      }
    } else if (activeTab === 'rooms') {
      if (editingItem) {
        updateRoomMutation.mutate({ id: editingItem.id, data });
      } else {
        createRoomMutation.mutate(data);
      }
    } else {
      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id, data });
      } else {
        createMutation.mutate(data);
      }
    }
  };

  const handleDelete = (item) => {
    if (activeTab === 'appointment_types') {
      if (window.confirm(`האם למחוק את סוג הביקור "${item.name}"?`)) {
        deleteAppointmentTypeMutation.mutate(item.id);
      }
    } else if (activeTab === 'rooms') {
      if (window.confirm(`האם למחוק את החדר "${item.name}"?`)) {
        deleteRoomMutation.mutate(item.id);
      }
    } else {
      if (window.confirm(`האם למחוק הגדרה זו?`)) {
        deleteMutation.mutate(item.id);
      }
    }
  };

  const handleEditHoliday = (holiday) => {
    setEditingHoliday({ ...holiday });
    setIsHolidayDialogOpen(true);
  };

  const handleSaveHoliday = () => {
    if (!editingHoliday) return;
    
    const updatedHolidays = holidays.map(h => 
      h.date === editingHoliday.originalDate ? editingHoliday : h
    );
    setHolidays(updatedHolidays);
    setIsHolidayDialogOpen(false);
    setEditingHoliday(null);
    toast.success('תאריך החג עודכן בהצלחה');
  };

  const timeSlotSettings = allSettings.filter(s => s.setting_type === 'time_slots');
  const blockedDates = allSettings.filter(s => s.setting_type === 'blocked_date');
  const workingHours = allSettings.filter(s => s.setting_type === 'working_hours');

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_appointments');

  if (!currentUser) {
    return <div className="text-center py-12">טוען...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">אין הרשאת גישה</h2>
            <p className="text-gray-600">אין לך הרשאה לנהל הגדרות יומן.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ניהול יומן תורים</h1>
        <p className="text-gray-500">הגדרת מרווחי זמן, חסימת תאריכים ושעות עבודה</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="appointment_types" className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            סוגי ביקור
          </TabsTrigger>
          <TabsTrigger value="time_slots" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            מרווחי זמן
          </TabsTrigger>
          <TabsTrigger value="blocked_dates" className="flex items-center gap-2">
            <PartyPopper className="w-4 h-4" />
            חגים ותאריכים חסומים
          </TabsTrigger>
          <TabsTrigger value="doctor_schedules" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            ניהול יומן רופאים
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4" />
            הגדרת חדרים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointment_types">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>ניהול סוגי ביקור</CardTitle>
                <Button onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  סוג ביקור חדש
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8">טוען...</p>
              ) : appointmentTypes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין סוגי ביקור מוגדרים</p>
              ) : (
                <Table dir="rtl">
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-16 text-right">#</TableHead>
                     <TableHead className="text-right">שם הביקור</TableHead>
                     <TableHead className="text-right">משך</TableHead>
                     <TableHead className="text-right">מחיר</TableHead>
                     <TableHead className="text-right">תיאור</TableHead>
                     <TableHead className="text-right">סטטוס</TableHead>
                     <TableHead className="text-center">פעולות</TableHead>
                   </TableRow>
                 </TableHeader>
                  <TableBody>
                    {appointmentTypes.map((type, index) => (
                      <TableRow key={type.id} className="hover:bg-gray-50">
                        <TableCell className="text-gray-500 font-medium text-right">{index + 1}</TableCell>
                        <TableCell className="font-medium text-right">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: type.color }}
                            />
                            {type.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{type.duration_minutes} דק'</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 font-semibold">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            <span>₪{type.base_price}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {type.description ? (
                            <span className="text-sm text-gray-600 truncate block">{type.description}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={type.is_active ? 'default' : 'secondary'}>
                            {type.is_active ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingItem(type); setIsFormOpen(true); }}
                              title="ערוך"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(type)}
                              title="מחק"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time_slots">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>הגדרות מרווחי זמן</CardTitle>
                <Button onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוספת הגדרה
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8">טוען...</p>
              ) : timeSlotSettings.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין הגדרות מרווחי זמן</p>
              ) : (
                <div className="space-y-3">
                  {timeSlotSettings.map(setting => (
                    <div key={setting.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold">
                              {setting.doctor_name || 'כל הרופאים'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            {setting.day_of_week !== undefined && (
                              <p>יום: {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][setting.day_of_week]}</p>
                            )}
                            {setting.start_time && setting.end_time && (
                              <p>שעות: {setting.start_time} - {setting.end_time}</p>
                            )}
                            <p>משך משבצת: {setting.slot_duration || 20} דקות</p>
                            {setting.recurrence_type && setting.recurrence_type !== 'none' && (
                              <p className="text-purple-600 font-medium">
                                🔁 חזרתיות: {setting.recurrence_type === 'weekly' ? 'שבועי' : setting.recurrence_type === 'monthly' ? 'חודשי' : 'שנתי'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingItem(setting); setIsFormOpen(true); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(setting)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked_dates">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PartyPopper className="w-5 h-5 text-purple-600" />
                  <CardTitle>חגים ומועדים</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingHolidays.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">אין חגים מוגדרים</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingHolidays.slice(0, 15).map((holiday, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={holiday.type === 'holiday' ? 'default' : 'secondary'} className="bg-purple-100 text-purple-800">
                            {holiday.type === 'holiday' ? '🎉 חג' : '🇮🇱 לאומי'}
                          </Badge>
                          <span className="font-medium">{holiday.name}</span>
                          <span className="text-sm text-gray-600">
                            {new Date(holiday.date).toLocaleDateString('he-IL', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingHoliday({ ...holiday, originalDate: holiday.date });
                            setIsHolidayDialogOpen(true);
                          }}
                          title="ערוך תאריך"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>תאריכים חסומים נוספים</CardTitle>
                  <Button onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    חסימת תאריך
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8">טוען...</p>
                ) : blockedDates.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">אין תאריכים חסומים נוספים</p>
                ) : (
                  <div className="space-y-3">
                    {blockedDates.map(setting => (
                      <div key={setting.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Lock className="w-4 h-4 text-red-600" />
                              <span className="font-semibold">
                                {setting.date ? new Date(setting.date).toLocaleDateString('he-IL') : 'תאריך לא צוין'}
                              </span>
                              {setting.day_of_week !== undefined && (
                                <Badge variant="outline">
                                  {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][setting.day_of_week]}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="font-medium">רופא: </span>
                                {setting.doctor_name ? setting.doctor_name : 'כל הרופאים'}
                              </p>
                              {setting.block_reason && <p className="text-red-600">סיבה: {setting.block_reason}</p>}
                              {setting.recurrence_type && setting.recurrence_type !== 'none' && (
                                <p className="text-purple-600 font-medium">
                                  🔁 חזרתיות: {setting.recurrence_type === 'weekly' ? 'שבועי' : setting.recurrence_type === 'monthly' ? 'חודשי' : 'שנתי'}
                                  {setting.recurrence_end_date && ` (עד ${new Date(setting.recurrence_end_date).toLocaleDateString('he-IL')})`}
                                </p>
                              )}
                              {setting.notes && <p>הערות: {setting.notes}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingItem(setting); setIsFormOpen(true); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(setting)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="doctor_schedules">
          <DoctorScheduleManager
            doctors={doctors}
            schedules={doctorSchedules}
            onSave={(data, id) => saveDoctorScheduleMutation.mutate({ data, id })}
            onDelete={(id) => deleteDoctorScheduleMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>ניהול חדרים</CardTitle>
                <Button onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  חדר חדש
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8">טוען...</p>
              ) : rooms.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין חדרים מוגדרים</p>
              ) : (
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-right">#</TableHead>
                      <TableHead className="text-right">שם החדר</TableHead>
                      <TableHead className="text-right">סוג חדר</TableHead>
                      <TableHead className="text-right">קיבולת</TableHead>
                      <TableHead className="text-right">ציוד</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-center">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room, index) => (
                      <TableRow key={room.id} className="hover:bg-gray-50">
                        <TableCell className="text-gray-500 font-medium text-right">{index + 1}</TableCell>
                        <TableCell className="font-medium text-right">{room.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {room.room_type === 'examination' ? 'חדר בדיקה' :
                             room.room_type === 'surgery' ? 'חדר ניתוח' :
                             room.room_type === 'laboratory' ? 'מעבדה' :
                             room.room_type === 'imaging' ? 'הדמיה' :
                             room.room_type === 'reception' ? 'קבלה' : room.room_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{room.capacity || 1}</TableCell>
                        <TableCell className="text-right max-w-xs">
                          {room.equipment ? (
                            <span className="text-sm text-gray-600 truncate block">{room.equipment}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={
                            room.status === 'available' ? 'default' :
                            room.status === 'maintenance' ? 'secondary' : 'destructive'
                          }>
                            {room.status === 'available' ? 'זמין' :
                             room.status === 'maintenance' ? 'תחזוקה' : 'לא זמין'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingItem(room); setIsFormOpen(true); }}
                              title="ערוך"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(room)}
                              title="מחק"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'עריכת הגדרה' : 
                activeTab === 'appointment_types' ? 'סוג ביקור חדש' :
                activeTab === 'time_slots' ? 'הגדרת מרווחי זמן' :
                activeTab === 'blocked_dates' ? 'חסימת תאריך' :
                activeTab === 'rooms' ? 'חדר חדש' :
                'הגדרת שעות פעילות'}
            </DialogTitle>
          </DialogHeader>
          {activeTab === 'appointment_types' && (
            <AppointmentTypeForm
              appointmentType={editingItem}
              onSubmit={handleSubmit}
              onCancel={() => { setIsFormOpen(false); setEditingItem(null); }}
            />
          )}
          {activeTab === 'time_slots' && (
            <TimeSlotSettingsForm
              setting={editingItem}
              doctors={doctors}
              onSubmit={(data) => handleSubmit({ ...data, setting_type: 'time_slots' })}
              onCancel={() => { setIsFormOpen(false); setEditingItem(null); }}
            />
          )}
          {activeTab === 'blocked_dates' && (
            <BlockedDatesForm
              setting={editingItem}
              doctors={doctors}
              onSubmit={(data) => handleSubmit({ ...data, setting_type: 'blocked_date', is_blocked: true })}
              onCancel={() => { setIsFormOpen(false); setEditingItem(null); }}
            />
          )}
          {activeTab === 'working_hours' && (
            <WorkingHoursForm
              setting={editingItem}
              doctors={doctors}
              onSubmit={(data) => handleSubmit({ ...data, setting_type: 'working_hours' })}
              onCancel={() => { setIsFormOpen(false); setEditingItem(null); }}
            />
          )}
          {activeTab === 'rooms' && (
            <RoomForm
              room={editingItem}
              onSubmit={handleSubmit}
              onCancel={() => { setIsFormOpen(false); setEditingItem(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת תאריך חג</DialogTitle>
          </DialogHeader>
          {editingHoliday && (
            <div className="space-y-4">
              <div>
                <Label>שם החג</Label>
                <Input value={editingHoliday.name} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>תאריך</Label>
                <Input
                  type="date"
                  value={editingHoliday.date}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsHolidayDialogOpen(false);
                    setEditingHoliday(null);
                  }}
                >
                  ביטול
                </Button>
                <Button onClick={handleSaveHoliday}>
                  שמור
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}