import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, User, MapPin, Loader2, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import AppointmentForm from "../components/clinic-calendar/AppointmentForm";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import DateInput from "../components/shared/DateInput";
import { getHolidayForDate } from "../components/utils/holidays";
import { toast } from "sonner";

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  arrived: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  no_show: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-600"
};

const DOCTOR_COLORS = [
  "bg-blue-200 text-blue-900 border-blue-400",
  "bg-green-200 text-green-900 border-green-400",
  "bg-purple-200 text-purple-900 border-purple-400",
  "bg-yellow-200 text-yellow-900 border-yellow-400",
  "bg-pink-200 text-pink-900 border-pink-400",
  "bg-indigo-200 text-indigo-900 border-indigo-400",
  "bg-orange-200 text-orange-900 border-orange-400",
  "bg-teal-200 text-teal-900 border-teal-400"
];

const STATUS_NAMES = {
  scheduled: "נקבע",
  confirmed: "אושר",
  arrived: "הגיע",
  in_progress: "בטיפול",
  completed: "הושלם",
  no_show: "לא הגיע",
  cancelled: "בוטל"
};

export default function ClinicCalendarPage() {
  const [viewMode, setViewMode] = useState("week"); // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [editingAppointment, setEditingAppointment] = useState(null);
  
  const queryClient = useQueryClient();

  // Calculate days to display based on view mode
  const displayDays = React.useMemo(() => {
    if (viewMode === 'day') {
      return [currentDate];
    } else if (viewMode === 'week') {
      return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    } else {
      // month view
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  }, [viewMode, currentDate, currentWeekStart]);

  const weekDays = displayDays;

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const weekEnd = addDays(currentWeekStart, 7);
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const allAppointments = await base44.entities.Appointment.list('-date', 200);
      return allAppointments.filter(apt => {
        // Normalize date to yyyy-MM-dd format for comparison
        const aptDateStr = apt.date ? apt.date.split('T')[0] : apt.date;
        return aptDateStr >= weekStartStr && aptDateStr < weekEndStr;
      });
    }
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 5000)
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const publicProfiles = await base44.entities.PublicProfile.list();
      return publicProfiles.filter(p => p.job === 'doctor' && p.is_active);
    }
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blockedDates', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const allSettings = await base44.entities.CalendarSettings.list();
      return allSettings.filter(s => s.setting_type === 'blocked_date' && s.is_blocked);
    }
  });

  const { data: doctorSchedules = [] } = useQuery({
    queryKey: ['doctorSchedules'],
    queryFn: async () => {
      const schedules = await base44.entities.DoctorSchedule.list();
      return schedules.filter(s => s.is_active !== false);
    }
  });

  const { data: timeSlotSettings = [] } = useQuery({
    queryKey: ['timeSlotSettings'],
    queryFn: async () => {
      const allSettings = await base44.entities.CalendarSettings.list();
      return allSettings.filter(s => s.setting_type === 'time_slots' && s.is_active !== false);
    }
  });

  // Generate time slots based on calendar settings
  const timeSlots = React.useMemo(() => {
    // Default values
    let slotDuration = 20;
    let startTime = '08:00';
    let endTime = '20:00';

    // Use settings if available
    if (timeSlotSettings.length > 0) {
      const setting = timeSlotSettings[0]; // Use first active setting
      slotDuration = setting.slot_duration || 20;
      startTime = setting.start_time || '08:00';
      endTime = setting.end_time || '20:00';
    }

    // Parse start and end times to minutes
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    // Generate slots based on slot duration
    const slots = [];
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }

    return slots;
  }, [timeSlotSettings]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data) => {
      // Get highest appointment number and increment
      const allAppointments = await base44.entities.Appointment.list('-appointment_number', 1);
      const maxAppointmentNumber = allAppointments.length > 0 && allAppointments[0].appointment_number 
        ? allAppointments[0].appointment_number 
        : 0;
      
      // Create appointment with auto-generated number
      const newAppointment = await base44.entities.Appointment.create({
        ...data,
        appointment_number: maxAppointmentNumber + 1
      });
      return newAppointment;
    },
    onMutate: () => {
      toast.loading('שומר תור...', { id: 'appointment-save' });
    },
    onSuccess: async (newAppointment) => {
      // Navigate to the week of the new appointment first
      const appointmentDate = new Date(newAppointment.date);
      const appointmentWeekStart = startOfWeek(appointmentDate, { weekStartsOn: 0 });
      setCurrentWeekStart(appointmentWeekStart);
      
      // Wait for queries to invalidate and refetch
      await queryClient.invalidateQueries(['appointments']);
      await queryClient.invalidateQueries(['medicalVisits']);
      await queryClient.invalidateQueries({ queryKey: ['clientVisits'] });
      
      toast.success('התור נשמר בהצלחה!', { id: 'appointment-save' });
      
      // Close form after data is refreshed
      setIsFormOpen(false);
      setEditingAppointment(null);
    },
    onError: (error) => {
      console.error('Error creating appointment:', error);
      toast.error('שגיאה בשמירת התור', { id: 'appointment-save' });
    }
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onMutate: () => {
      toast.loading('מעדכן תור...', { id: 'appointment-update' });
    },
    onSuccess: async (updatedAppointment) => {
      // Navigate to the week of the updated appointment
      const appointmentDate = new Date(updatedAppointment.date);
      const appointmentWeekStart = startOfWeek(appointmentDate, { weekStartsOn: 0 });
      setCurrentWeekStart(appointmentWeekStart);
      
      // Wait for queries to invalidate and refetch
      await queryClient.invalidateQueries(['appointments']);
      await queryClient.invalidateQueries(['medicalVisits']);
      await queryClient.invalidateQueries({ queryKey: ['clientVisits'] });
      
      toast.success('התור עודכן בהצלחה!', { id: 'appointment-update' });
      setIsFormOpen(false);
      setEditingAppointment(null);
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      toast.error('שגיאה בעדכון התור', { id: 'appointment-update' });
    }
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onMutate: () => {
      toast.loading('מוחק תור...', { id: 'appointment-delete' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('התור נמחק בהצלחה!', { id: 'appointment-delete' });
      setIsFormOpen(false);
      setEditingAppointment(null);
    },
    onError: (error) => {
      console.error('Error deleting appointment:', error);
      toast.error('שגיאה במחיקת התור', { id: 'appointment-delete' });
    }
  });

  const isDoctorWorkingOnDay = (day) => {
    if (selectedDoctor === 'all') return true;
    const dayOfWeek = day.getDay();
    return doctorSchedules.some(schedule => 
      schedule.doctor_id === selectedDoctor && 
      schedule.day_of_week === dayOfWeek &&
      schedule.is_active !== false
    );
  };

  const handleSlotClick = (day, time) => {
    if (selectedDoctor !== 'all' && !isDoctorWorkingOnDay(day)) {
      return; // לא ניתן לקבוע תור ביום שהרופא לא עובד
    }
    setSelectedSlot({ date: format(day, 'yyyy-MM-dd'), time });
    setEditingAppointment(null);
    setIsFormOpen(true);
  };

  const handleAppointmentClick = (appointment) => {
    setEditingAppointment(appointment);
    setSelectedSlot(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data) => {
    if (editingAppointment) {
      updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
    } else {
      createAppointmentMutation.mutate(data);
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handlePrev = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === 'week') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  const handleDateChange = (dateStr) => {
    const newDate = new Date(dateStr);
    setCurrentDate(newDate);
    setCurrentWeekStart(startOfWeek(newDate, { weekStartsOn: 0 }));
  };

  const getAppointmentsForSlot = (day, time) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const currentTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    
    return appointments.filter(apt => {
      // Normalize both dates to yyyy-MM-dd format for comparison
      const aptDateStr = apt.date ? apt.date.split('T')[0] : apt.date;
      
      if (aptDateStr !== dateStr) return false;
      if (selectedDoctor !== 'all' && apt.doctor_id !== selectedDoctor) return false;
      
      // Parse appointment times safely
      if (!apt.start_time) return false;
      const timeParts = apt.start_time.split(':');
      if (timeParts.length < 2) return false;
      
      const aptStartMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
      
      // Show appointment only at its start time
      return currentTimeMinutes === aptStartMinutes;
    });
  };

  const filteredAppointments = selectedDoctor === 'all' 
    ? appointments 
    : appointments.filter(apt => apt.doctor_id === selectedDoctor);

  const isDayBlocked = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return blockedDates.some(block => {
      if (block.date === dateStr) {
        return !block.doctor_id || block.doctor_id === selectedDoctor || selectedDoctor === 'all';
      }
      return false;
    });
  };

  const getBlockedReason = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const block = blockedDates.find(b => b.date === dateStr);
    return block?.block_reason || 'חסום';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">לוח תורים</h1>
          <p className="text-gray-500">ניהול תורים וקביעת זמנים</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setSelectedSlot(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            תור חדש
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* First row - Navigation and Date Display */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handlePrev}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={handleToday}>היום</Button>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-lg font-semibold">
                {viewMode === 'day' && format(currentDate, 'dd/MM/yyyy', { locale: he })}
                {viewMode === 'week' && `${format(currentWeekStart, 'dd/MM/yyyy', { locale: he })} - ${format(addDays(currentWeekStart, 6), 'dd/MM/yyyy', { locale: he })}`}
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: he })}
              </div>

              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">רופא:</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="border rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">כולם</option>
                  {doctors.map(doc => (
                    <option key={doc.user_id} value={doc.user_id}>{doc.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second row - View Mode and Date Picker */}
            <div className="flex justify-between items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                >
                  יום
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  שבוע
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  חודש
                </Button>
              </div>

              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">בחר תאריך:</label>
                <DateInput
                  value={format(currentDate, 'yyyy-MM-dd')}
                  onChange={handleDateChange}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'עריכת תור' : 'תור חדש'}</DialogTitle>
          </DialogHeader>
          {(createAppointmentMutation.isPending || updateAppointmentMutation.isPending || deleteAppointmentMutation.isPending) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <p className="text-sm font-medium text-gray-700">
                  {createAppointmentMutation.isPending && 'שומר תור...'}
                  {updateAppointmentMutation.isPending && 'מעדכן תור...'}
                  {deleteAppointmentMutation.isPending && 'מוחק תור...'}
                </p>
              </div>
            </div>
          )}
          <AppointmentForm
            initialDate={selectedSlot?.date}
            initialTime={selectedSlot?.time}
            appointment={editingAppointment}
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingAppointment(null); }}
            onDelete={(id) => deleteAppointmentMutation.mutate(id)}
          />
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg border overflow-auto max-h-[calc(100vh-350px)]">
        <div className={`grid ${viewMode === 'day' ? 'grid-cols-2' : viewMode === 'month' ? 'grid-cols-8' : 'grid-cols-8'} border-b sticky top-0 bg-white z-30 shadow-md`}>
          {viewMode !== 'month' && <div className="p-2 text-center font-semibold border-l text-sm">שעה</div>}
          {weekDays.map((day, i) => {
            const holiday = getHolidayForDate(day);
            const isBlocked = isDayBlocked(day);
            const doctorNotWorking = selectedDoctor !== 'all' && !isDoctorWorkingOnDay(day);

            // Get available doctors for this day
            const dayOfWeek = day.getDay();
            const availableDoctors = selectedDoctor === 'all' 
              ? doctors.filter(doctor => {
                  const hasSchedule = doctorSchedules.some(schedule => 
                    schedule.doctor_id === doctor.user_id && 
                    schedule.day_of_week === dayOfWeek &&
                    schedule.is_active !== false
                  );
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isDoctorBlocked = blockedDates.some(block => 
                    block.date === dateStr && block.doctor_id === doctor.user_id
                  );
                  return hasSchedule && !isDoctorBlocked;
                })
              : [];

            return (
              <div key={i} className={`p-2 text-center border-l ${
                isSameDay(day, new Date()) ? 'bg-blue-50' : 
                isBlocked ? 'bg-red-50' :
                doctorNotWorking ? 'bg-gray-100' :
                holiday ? 'bg-purple-50' : ''
              }`}>
                <div className="font-semibold">{format(day, 'EEEE', { locale: he })}</div>
                <div className="text-sm text-gray-500">{format(day, 'dd/MM')}</div>
                {holiday && (
                  <div className={`text-xs font-medium mt-1 ${
                    holiday.type === 'holiday' ? 'text-purple-700' : 'text-blue-700'
                  }`}>
                    {holiday.name}
                  </div>
                )}
                {isBlocked && (
                  <div className="text-xs font-medium text-red-700 mt-1">
                    🔒 {getBlockedReason(day)}
                  </div>
                )}
                {doctorNotWorking && (
                  <div className="text-xs font-medium text-gray-600 mt-1">
                    ⏸️ לא עובד
                  </div>
                )}
                {selectedDoctor === 'all' && availableDoctors.length > 0 && (
                  <div className="text-xs text-gray-700 mt-1 space-y-0.5">
                    {availableDoctors.map((doctor, idx) => {
                      const doctorIndex = doctors.findIndex(d => d.user_id === doctor.user_id);
                      const colorClass = DOCTOR_COLORS[doctorIndex % DOCTOR_COLORS.length];
                      return (
                        <div key={doctor.user_id} className={`px-1 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                          {doctor.display_name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="relative">
          {viewMode === 'month' ? (
            // Month view - show days in grid without time slots
            <div className="grid grid-cols-7 gap-1 p-2">
              {displayDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayAppointments = appointments.filter(apt => {
                  const aptDateStr = apt.date ? apt.date.split('T')[0] : apt.date;
                  return aptDateStr === dateStr;
                });
                const isToday = isSameDay(day, new Date());
                const holiday = getHolidayForDate(day);
                
                return (
                  <div
                    key={dateStr}
                    className={`border rounded p-2 min-h-[100px] ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'} ${holiday ? 'bg-purple-50' : ''}`}
                  >
                    <div className="text-sm font-semibold mb-1">{format(day, 'd')}</div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className="text-xs p-1 bg-blue-100 rounded cursor-pointer hover:bg-blue-200"
                          onClick={() => handleAppointmentClick(apt)}
                        >
                          {apt.start_time} - {apt.is_general_meeting ? apt.chief_complaint : apt.client_name}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500">+{dayAppointments.length - 3} עוד</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Day and Week view - show time slots
            timeSlots.map((time, i) => {
              return (
                <div key={time} className={`grid ${viewMode === 'day' ? 'grid-cols-2' : 'grid-cols-8'} border-b min-h-[100px]`}>
                  <div className="p-2 text-center text-sm border-l text-gray-500 bg-gray-50">
                    {time}
                  </div>
                {weekDays.map((day, dayIndex) => {
                  const slotAppointments = getAppointmentsForSlot(day, time);
                  const isBlocked = isDayBlocked(day);
                  const holiday = getHolidayForDate(day);
                  const doctorNotWorking = selectedDoctor !== 'all' && !isDoctorWorkingOnDay(day);

                  // Check if this time slot is within any doctor schedule for this day
                  const dayOfWeek = day.getDay();
                  const activeSchedule = doctorSchedules.find(schedule => {
                    if (schedule.day_of_week !== dayOfWeek) return false;
                    if (selectedDoctor !== 'all' && schedule.doctor_id !== selectedDoctor) return false;

                    const slotMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

                    if (schedule.shift_type === 'full_day') {
                      if (!schedule.start_time || !schedule.end_time) return false;
                      const startMinutes = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
                      const endMinutes = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
                      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                    } else if (schedule.shift_type === 'morning') {
                      if (!schedule.morning_start || !schedule.morning_end) return false;
                      const startMinutes = parseInt(schedule.morning_start.split(':')[0]) * 60 + parseInt(schedule.morning_start.split(':')[1]);
                      const endMinutes = parseInt(schedule.morning_end.split(':')[0]) * 60 + parseInt(schedule.morning_end.split(':')[1]);
                      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                    } else if (schedule.shift_type === 'evening') {
                      if (!schedule.evening_start || !schedule.evening_end) return false;
                      const startMinutes = parseInt(schedule.evening_start.split(':')[0]) * 60 + parseInt(schedule.evening_start.split(':')[1]);
                      const endMinutes = parseInt(schedule.evening_end.split(':')[0]) * 60 + parseInt(schedule.evening_end.split(':')[1]);
                      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                    } else if (schedule.shift_type === 'split') {
                      if (!schedule.morning_start || !schedule.morning_end || !schedule.evening_start || !schedule.evening_end) return false;
                      const morningStart = parseInt(schedule.morning_start.split(':')[0]) * 60 + parseInt(schedule.morning_start.split(':')[1]);
                      const morningEnd = parseInt(schedule.morning_end.split(':')[0]) * 60 + parseInt(schedule.morning_end.split(':')[1]);
                      const eveningStart = parseInt(schedule.evening_start.split(':')[0]) * 60 + parseInt(schedule.evening_start.split(':')[1]);
                      const eveningEnd = parseInt(schedule.evening_end.split(':')[0]) * 60 + parseInt(schedule.evening_end.split(':')[1]);
                      return (slotMinutes >= morningStart && slotMinutes < morningEnd) || (slotMinutes >= eveningStart && slotMinutes < eveningEnd);
                    }
                    return false;
                  });

                  const isSlotBlocked = isBlocked || doctorNotWorking || (selectedDoctor !== 'all' && !activeSchedule);

                  // Get all appointments for this slot/day regardless of doctor when viewing "all"
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const allDoctorAppointments = selectedDoctor === 'all' 
                    ? appointments.filter(apt => {
                        // Normalize both dates to yyyy-MM-dd format for comparison
                        const aptDateStr = apt.date ? apt.date.split('T')[0] : apt.date;
                        if (aptDateStr !== dateStr) return false;
                        if (!apt.start_time) return false;
                        const aptStartMinutes = parseInt(apt.start_time.split(':')[0]) * 60 + parseInt(apt.start_time.split(':')[1]);
                        const currentTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
                        return currentTimeMinutes === aptStartMinutes;
                      })
                    : slotAppointments;

                  // Calculate width based on number of active doctors (not appointments)
                  const activeDoctorCount = selectedDoctor === 'all' ? doctors.length : 1;
                  const doctorWidth = `${100 / activeDoctorCount}%`;

                  return (
                    <div
                      key={dayIndex}
                      className={`border-l p-1 relative ${
                        isSlotBlocked ? 'bg-gray-100/80 cursor-not-allowed' :
                        holiday && activeSchedule ? 'bg-gradient-to-br from-purple-50/40 to-green-100/40 hover:from-purple-50/60 hover:to-green-100/60 cursor-pointer' :
                        holiday ? 'bg-purple-50/40 hover:bg-purple-50/60 cursor-pointer' : 
                        activeSchedule ? 'bg-green-100/40 hover:bg-green-100/60 cursor-pointer' :
                        'hover:bg-gray-50 cursor-pointer'
                      }`}
                      onClick={() => !isSlotBlocked && handleSlotClick(day, time)}
                    >
                      <div className="flex h-full relative">
                        {(() => {
                          // Separate general meetings from regular appointments
                          const generalMeetings = allDoctorAppointments.filter(apt => apt.is_general_meeting);
                          const regularAppointments = allDoctorAppointments.filter(apt => !apt.is_general_meeting);

                          // Calculate total appointments at this time slot (for width distribution)
                          const totalAppointments = allDoctorAppointments.length;

                          return [...generalMeetings, ...regularAppointments].map((apt, idx) => {
                            const slotDuration = timeSlotSettings.length > 0 ? timeSlotSettings[0].slot_duration : 20;
                            const slotsCount = Math.ceil(apt.duration_minutes / slotDuration);
                            const heightInPixels = slotsCount * 60 - 4;

                            // Add opacity for cancelled/no-show
                            const opacityClass = apt.status === 'cancelled' || apt.status === 'no_show' ? 'opacity-50' : '';

                            let aptWidthPercent, rightOffset, doctorColor;

                            if (apt.is_general_meeting) {
                              // General meetings - if multiple, divide width equally
                              const meetingIndex = generalMeetings.findIndex(a => a.id === apt.id);
                              const totalMeetings = generalMeetings.length;
                              aptWidthPercent = totalMeetings > 1 ? (100 / totalMeetings) : 100;
                              rightOffset = totalMeetings > 1 ? (meetingIndex * (100 / totalMeetings)) : 0;
                              doctorColor = 'bg-purple-200 text-purple-900 border-purple-400';
                            } else {
                              // Regular appointments - distribute evenly across available space
                              const doctorIndex = doctors.findIndex(d => d.user_id === apt.doctor_id);
                              doctorColor = DOCTOR_COLORS[doctorIndex % DOCTOR_COLORS.length];

                              // If viewing all doctors and multiple appointments at same time, divide width
                              if (selectedDoctor === 'all') {
                                const appointmentIndex = regularAppointments.findIndex(a => a.id === apt.id);
                                aptWidthPercent = regularAppointments.length > 1 ? (100 / regularAppointments.length) : 100;
                                rightOffset = regularAppointments.length > 1 ? (appointmentIndex * (100 / regularAppointments.length)) : 0;
                              } else {
                                // Single doctor view - show all appointments side by side
                                const sameDoctorAppointments = regularAppointments.filter(a => a.doctor_id === apt.doctor_id);
                                const indexInDoctorColumn = sameDoctorAppointments.findIndex(a => a.id === apt.id);
                                const appointmentsInColumn = sameDoctorAppointments.length;

                                aptWidthPercent = appointmentsInColumn > 1 ? (100 / appointmentsInColumn) : 100;
                                rightOffset = appointmentsInColumn > 1 ? (indexInDoctorColumn * (100 / appointmentsInColumn)) : 0;
                              }
                            }

                              return (
                              <HoverCard key={apt.id} openDelay={200}>
                                <HoverCardTrigger asChild>
                                  <div
                                    className={`text-xs p-1 rounded ${doctorColor} border-2 cursor-pointer hover:opacity-70 transition-opacity absolute top-1 z-10 ${opacityClass}`}
                                    style={{ 
                                      width: `calc(${aptWidthPercent}% - 4px)`,
                                      height: `${heightInPixels}px`,
                                      minHeight: '56px',
                                      right: `calc(${rightOffset}% + 2px)`
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAppointmentClick(apt);
                                    }}
                                  >
                                  {apt.is_general_meeting ? (
                                    <>
                                      <div className="font-bold truncate text-[11px]">📋 {apt.chief_complaint || 'פגישה'}</div>
                                      <div className="font-semibold truncate text-[10px] text-purple-700">
                                        {apt.participants?.length || 0} משתתפים
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="font-bold truncate text-[11px] flex items-center gap-1">
                                        {apt.client_name}
                                        {(() => {
                                          const patient = allPatients.find(p => p.id === apt.patient_id);
                                          return patient?.is_insured && <Shield className="w-3 h-3 text-blue-600" />;
                                        })()}
                                      </div>
                                      <div className="font-semibold truncate text-[10px] text-gray-700">{apt.patient_name}</div>
                                    </>
                                  )}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80" dir="rtl" side="left">
                                <div className="space-y-3">
                                  {apt.is_general_meeting ? (
                                    <div className="border-b pb-2">
                                      <h4 className="font-bold text-base text-purple-900">📋 פגישה כללית</h4>
                                      <p className="text-sm text-purple-700 mt-1">{apt.chief_complaint}</p>
                                    </div>
                                  ) : (
                                    <div className="border-b pb-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-bold text-base flex items-center gap-2">
                                          {apt.patient_name}
                                          {(() => {
                                            const patient = allPatients.find(p => p.id === apt.patient_id);
                                            return patient?.is_insured && (
                                              <Shield className="w-4 h-4 text-blue-600" title="מבוטח" />
                                            );
                                          })()}
                                        </h4>
                                      </div>
                                      <p className="text-sm text-gray-600 mr-6">
                                        <span className="font-semibold">לקוח:</span> {apt.client_name}
                                      </p>
                                    </div>
                                  )}
                                  <div className="text-sm space-y-2">
                                    {apt.is_general_meeting ? (
                                      <>
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-700 min-w-[80px]">משתתפים:</span>
                                          <div className="flex-1">
                                            {apt.participants && apt.participants.length > 0 ? (
                                              <div className="space-y-1">
                                                {apt.participants.map((p, idx) => (
                                                  <div key={idx} className="text-gray-900">
                                                    • {p.name} ({p.job === 'doctor' ? 'רופא' : 
                                                                p.job === 'assistant' ? 'עוזר/ת' : 
                                                                p.job === 'receptionist' ? 'פקידת קבלה' : p.job})
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-gray-500">אין משתתפים רשומים</span>
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-700 min-w-[80px]">טלפון:</span>
                                          <span className="text-gray-900">{apt.client_phone}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-700 min-w-[80px]">רופא:</span>
                                          <span className="text-gray-900">{apt.doctor_name}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-700 min-w-[80px]">סוג ביקור:</span>
                                          <span className="text-gray-900">{apt.appointment_type_name}</span>
                                        </div>
                                      </>
                                    )}
                                    <div className="flex items-start gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[80px]">משך:</span>
                                      <span className="text-gray-900">{apt.duration_minutes} דקות</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="font-semibold text-gray-700 min-w-[80px]">שעה:</span>
                                      <span className="text-gray-900">{apt.start_time} - {apt.end_time}</span>
                                    </div>
                                    {apt.room_name && (
                                      <div className="flex items-start gap-2">
                                        <span className="font-semibold text-gray-700 min-w-[80px]">חדר:</span>
                                        <span className="text-gray-900">{apt.room_name}</span>
                                      </div>
                                    )}
                                    {apt.chief_complaint && !apt.is_general_meeting && (
                                      <div className="flex items-start gap-2">
                                        <span className="font-semibold text-gray-700 min-w-[80px]">סיבת הגעה:</span>
                                        <span className="text-gray-900">{apt.chief_complaint}</span>
                                      </div>
                                    )}
                                    {apt.reception_notes && (
                                      <div className="flex items-start gap-2">
                                        <span className="font-semibold text-gray-700 min-w-[80px]">{apt.is_general_meeting ? 'פרטים:' : 'הערות:'}</span>
                                        <span className="text-gray-900">{apt.reception_notes}</span>
                                      </div>
                                    )}
                                    <div className="flex items-start gap-2 pt-1">
                                      <span className="font-semibold text-gray-700 min-w-[80px]">סטטוס:</span>
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[apt.status]}`}>
                                        {STATUS_NAMES[apt.status]}
                                      </span>
                                    </div>
                                  </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-4 flex-wrap">
        {Object.entries(STATUS_NAMES).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${STATUS_COLORS[key]}`}></div>
            <span className="text-sm">{value}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-50/40 border border-purple-200"></div>
          <span className="text-sm">חג</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 border border-red-200"></div>
          <span className="text-sm">יום חסום</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100/40 border border-green-200"></div>
          <span className="text-sm">שעות משמרת</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
          <span className="text-sm">רופא לא עובד</span>
        </div>
      </div>
    </div>
  );
}