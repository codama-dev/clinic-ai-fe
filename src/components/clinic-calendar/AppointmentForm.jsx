import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Search, AlertTriangle, Plus, Trash2, Hash, Pencil, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClientForm from "./ClientForm";
import PatientForm from "./PatientForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DateInput from "../shared/DateInput";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AppointmentForm({ initialDate, initialTime, appointment, onSubmit, onCancel, onDelete }) {
  const [isGeneralMeeting, setIsGeneralMeeting] = useState(appointment?.is_general_meeting || false);
  const [selectedParticipants, setSelectedParticipants] = useState(appointment?.participants || []);
  
  const [formData, setFormData] = useState({
    appointment_number: appointment?.appointment_number || null,
    date: initialDate || appointment?.date || new Date().toISOString().split('T')[0],
    start_time: initialTime || appointment?.start_time || '09:00',
    end_time: appointment?.end_time || '09:20',
    client_id: appointment?.client_id || '',
    client_name: appointment?.client_name || '',
    client_phone: appointment?.client_phone || '',
    patient_id: appointment?.patient_id || '',
    patient_name: appointment?.patient_name || '',
    doctor_id: appointment?.doctor_id || '',
    doctor_name: appointment?.doctor_name || '',
    appointment_type_id: appointment?.appointment_type_id || '',
    appointment_type_name: appointment?.appointment_type_name || '',
    room_id: appointment?.room_id || '',
    room_name: appointment?.room_name || '',
    duration_minutes: appointment?.duration_minutes || 20,
    chief_complaint: appointment?.chief_complaint || '',
    reception_notes: appointment?.reception_notes || '',
    status: appointment?.status || 'scheduled',
    is_general_meeting: appointment?.is_general_meeting || false,
    participants: appointment?.participants || []
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const [markAsNoShow, setMarkAsNoShow] = useState(appointment?.status === 'no_show' || false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 5000)
  });

  const { data: patients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients', formData.client_id],
    queryFn: async () => {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      if (!selectedClient) return [];
      
      const allPatients = await base44.entities.Patient.list();
      return allPatients.filter(p => 
        p.client_number === selectedClient.client_number && p.status === 'active'
      );
    },
    enabled: !!formData.client_id
  });

  const { data: allDoctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const publicProfiles = await base44.entities.PublicProfile.list();
      return publicProfiles.filter(p => p.job === 'doctor' && p.is_active);
    }
  });

  const { data: doctorSchedules = [] } = useQuery({
    queryKey: ['doctorSchedules'],
    queryFn: () => base44.entities.DoctorSchedule.list()
  });

  const { data: vacationRequests = [] } = useQuery({
    queryKey: ['vacationRequests'],
    queryFn: () => base44.entities.VacationRequest.list()
  });

  const { data: constraints = [] } = useQuery({
    queryKey: ['constraints'],
    queryFn: () => base44.entities.Constraint.list()
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blockedDates'],
    queryFn: async () => {
      const allSettings = await base44.entities.CalendarSettings.list();
      return allSettings.filter(s => s.setting_type === 'blocked_date' && s.is_blocked);
    }
  });

  // Filter available doctors based on date, time, and constraints
  const doctors = React.useMemo(() => {
    if (!formData.date || !formData.start_time) return allDoctors;

    const selectedDate = new Date(formData.date);
    const dayOfWeek = selectedDate.getDay();
    const dateStr = formData.date;
    
    const [hours, minutes] = formData.start_time.split(':').map(Number);
    const slotMinutes = hours * 60 + minutes;

    return allDoctors.filter(doctor => {
      const daySchedule = doctorSchedules.find(s => 
        s.doctor_id === doctor.user_id && 
        s.day_of_week === dayOfWeek &&
        s.is_active !== false
      );

      if (!daySchedule) return false;

      const isInWorkingHours = (() => {
        if (daySchedule.shift_type === 'full_day') {
          const startMinutes = parseInt(daySchedule.start_time.split(':')[0]) * 60 + parseInt(daySchedule.start_time.split(':')[1]);
          const endMinutes = parseInt(daySchedule.end_time.split(':')[0]) * 60 + parseInt(daySchedule.end_time.split(':')[1]);
          return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        } else if (daySchedule.shift_type === 'morning') {
          const startMinutes = parseInt(daySchedule.morning_start.split(':')[0]) * 60 + parseInt(daySchedule.morning_start.split(':')[1]);
          const endMinutes = parseInt(daySchedule.morning_end.split(':')[0]) * 60 + parseInt(daySchedule.morning_end.split(':')[1]);
          return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        } else if (daySchedule.shift_type === 'evening') {
          const startMinutes = parseInt(daySchedule.evening_start.split(':')[0]) * 60 + parseInt(daySchedule.evening_start.split(':')[1]);
          const endMinutes = parseInt(daySchedule.evening_end.split(':')[0]) * 60 + parseInt(daySchedule.evening_end.split(':')[1]);
          return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        } else if (daySchedule.shift_type === 'split') {
          const morningStart = parseInt(daySchedule.morning_start.split(':')[0]) * 60 + parseInt(daySchedule.morning_start.split(':')[1]);
          const morningEnd = parseInt(daySchedule.morning_end.split(':')[0]) * 60 + parseInt(daySchedule.morning_end.split(':')[1]);
          const eveningStart = parseInt(daySchedule.evening_start.split(':')[0]) * 60 + parseInt(daySchedule.evening_start.split(':')[1]);
          const eveningEnd = parseInt(daySchedule.evening_end.split(':')[0]) * 60 + parseInt(daySchedule.evening_end.split(':')[1]);
          return (slotMinutes >= morningStart && slotMinutes < morningEnd) || 
                 (slotMinutes >= eveningStart && slotMinutes < eveningEnd);
        }
        return false;
      })();

      if (!isInWorkingHours) return false;

      const isOnVacation = vacationRequests.some(vacation => 
        vacation.employee_email === doctor.email &&
        vacation.status === 'approved' &&
        new Date(vacation.start_date) <= selectedDate &&
        new Date(vacation.end_date) >= selectedDate
      );

      if (isOnVacation) return false;

      const isBlocked = blockedDates.some(block => 
        block.date === dateStr && 
        (!block.doctor_id || block.doctor_id === doctor.user_id)
      );

      if (isBlocked) return false;

      const hasConstraint = constraints.some(constraint => {
        if (constraint.employee_email !== doctor.email) return false;
        
        const weekStartDate = new Date(constraint.week_start_date);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        if (selectedDate < weekStartDate || selectedDate > weekEndDate) return false;
        
        const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const constraintDay = daysMap[dayOfWeek];
        
        if (constraint.unavailable_day !== constraintDay) return false;
        
        if (constraint.unavailable_shift === 'morning' && daySchedule.shift_type === 'morning') return true;
        if (constraint.unavailable_shift === 'evening' && daySchedule.shift_type === 'evening') return true;
        if (constraint.unavailable_shift === 'morning' && daySchedule.shift_type === 'split') {
          const morningStart = parseInt(daySchedule.morning_start.split(':')[0]) * 60 + parseInt(daySchedule.morning_start.split(':')[1]);
          const morningEnd = parseInt(daySchedule.morning_end.split(':')[0]) * 60 + parseInt(daySchedule.morning_end.split(':')[1]);
          return slotMinutes >= morningStart && slotMinutes < morningEnd;
        }
        if (constraint.unavailable_shift === 'evening' && daySchedule.shift_type === 'split') {
          const eveningStart = parseInt(daySchedule.evening_start.split(':')[0]) * 60 + parseInt(daySchedule.evening_start.split(':')[1]);
          const eveningEnd = parseInt(daySchedule.evening_end.split(':')[0]) * 60 + parseInt(daySchedule.evening_end.split(':')[1]);
          return slotMinutes >= eveningStart && slotMinutes < eveningEnd;
        }
        
        return false;
      });

      if (hasConstraint) return false;

      return true;
    });
  }, [allDoctors, formData.date, formData.start_time, doctorSchedules, vacationRequests, blockedDates, constraints]);

  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['appointmentTypes'],
    queryFn: () => base44.entities.AppointmentType.list()
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const allRooms = await base44.entities.Room.list('-created_date', 100);
      return allRooms.filter(r => r.status === 'available');
    }
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: async () => {
      const publicProfiles = await base44.entities.PublicProfile.list();
      return publicProfiles.filter(p => p.is_active);
    }
  });

  const { data: lastVisit } = useQuery({
    queryKey: ['lastVisit', formData.patient_id],
    queryFn: async () => {
      const visits = await base44.entities.MedicalVisit.list('-visit_date', 1);
      const patientVisits = visits.filter(v => v.patient_id === formData.patient_id);
      return patientVisits[0] || null;
    },
    enabled: !!formData.patient_id && formData.appointment_type_name === 'מעקב'
  });

  const { data: noShowHistory } = useQuery({
    queryKey: ['noShowHistory', formData.client_id],
    queryFn: async () => {
      const allAppointments = await base44.entities.Appointment.list('-date', 100);
      const clientNoShows = allAppointments.filter(
        apt => apt.client_id === formData.client_id && apt.status === 'no_show'
      );
      return clientNoShows;
    },
    enabled: !!formData.client_id
  });

  const createClientMutation = useMutation({
    mutationFn: async ({ clientData, patients }) => {
      // שלב 1: מקצה מספר ללקוח
      const allClients = await base44.entities.Client.list('-created_date', 5000);
      const clientNumbers = allClients
        .map(c => c.client_number)
        .filter(num => num != null && num > 0);
      const maxClientNumber = clientNumbers.length > 0 ? Math.max(...clientNumbers) : 0;
      
      const newClient = await base44.entities.Client.create({
        ...clientData,
        client_number: maxClientNumber + 1
      });
      
      // שלב 2: מקצה מספרים למטופלים ומשייך אותם ללקוח
      let createdPatients = [];
      if (patients && patients.length > 0) {
        const allPatients = await base44.entities.Patient.list('-created_date', 5000);
        const patientNumbers = allPatients
          .map(p => p.patient_number)
          .filter(num => num != null && num > 0);
        let nextPatientNumber = patientNumbers.length > 0 ? Math.max(...patientNumbers) + 1 : 1;
        
        const validPatients = patients.filter(p => p.name && p.species);
        for (const patient of validPatients) {
          const { tempId, uploading, ...patientData } = patient;
          const createdPatient = await base44.entities.Patient.create({
            ...patientData,
            client_id: newClient.id,
            client_number: newClient.client_number,
            client_name: newClient.full_name,
            patient_number: nextPatientNumber
          });
          createdPatients.push(createdPatient);
          nextPatientNumber++;
        }
      }
      
      return { newClient, createdPatients };
    },
    onSuccess: async ({ newClient, createdPatients }) => {
      // רענן נתונים ממטמון
      await Promise.all([
        queryClient.invalidateQueries(['clients']),
        queryClient.invalidateQueries(['patients'])
      ]);
      
      // המתן לרענון מלא
      await queryClient.refetchQueries(['clients']);
      await queryClient.refetchQueries(['patients', newClient.id]); // Refetch patients specifically for the new client
      
      // עדכן את הטופס עם הלקוח והמטופל החדשים
      const firstPatient = createdPatients[0];
      setFormData(prev => ({
        ...prev,
        client_id: newClient.id,
        client_name: newClient.full_name,
        client_phone: newClient.phone,
        patient_id: firstPatient?.id || '',
        patient_name: firstPatient?.name || ''
      }));
      setClientSearch(newClient.full_name);
      setIsNewClientDialogOpen(false);
      setShowClientResults(false);
    }
  });

  const handleNewClientSubmit = (clientData, patients) => {
    createClientMutation.mutate({ clientData, patients });
  };

  const createPatientMutation = useMutation({
    mutationFn: async (data) => {
      const allPatients = await base44.entities.Patient.list('-created_date', 5000);
      const patientNumbers = allPatients
        .map(p => p.patient_number)
        .filter(num => num != null && num > 0);
      const nextPatientNumber = patientNumbers.length > 0 ? Math.max(...patientNumbers) + 1 : 1;
      
      return await base44.entities.Patient.create({
        ...data,
        patient_number: nextPatientNumber
      });
    },
    onSuccess: async (newPatient) => {
      await queryClient.invalidateQueries(['patients']);
      await queryClient.refetchQueries(['patients', formData.client_id]); // Refetch patients for the current client
      
      setFormData(prev => ({
        ...prev,
        patient_id: newPatient.id,
        patient_name: newPatient.name
      }));
      setIsNewPatientDialogOpen(false);
    }
  });

  const handleNewPatientSubmit = (patientData) => {
    createPatientMutation.mutate(patientData);
  };

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setEditingField(null);
      setEditValues({});
    }
  });

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: currentValue });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValues({});
  };

  const saveEdit = (field) => {
    const selectedClient = clients.find(c => c.id === formData.client_id);
    if (!selectedClient) return;

    updateClientMutation.mutate({
      id: formData.client_id,
      data: { [field]: editValues[field] }
    });
  };

  // Auto-select "מעקב" appointment type if this is a follow-up appointment
  useEffect(() => {
    if (appointmentTypes.length > 0 && !formData.appointment_type_id) {
      const isFollowUp = appointment?.notes?.includes('ביקור מעקב') || appointment?.chief_complaint?.includes('מעקב');
      
      if (isFollowUp) {
        const followUpType = appointmentTypes.find(t => 
          t.name === 'מעקב' || t.name.includes('מעקב')
        );
        
        if (followUpType) {
          handleAppointmentTypeSelect(followUpType.id);
        }
      }
    }
  }, [appointmentTypes, appointment]);

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  );

  const handleClientSelect = (client) => {
    setFormData({
      ...formData,
      client_id: client.id,
      client_name: client.full_name,
      client_phone: client.phone,
      patient_id: '',
      patient_name: ''
    });
    setClientSearch(client.full_name);
    setShowClientResults(false);
  };

  const handlePatientSelect = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setFormData({
        ...formData,
        patient_id: patient.id,
        patient_name: patient.name
      });
    }
  };

  const handleDoctorSelect = (doctorId) => {
    const doctor = doctors.find(d => d.user_id === doctorId);
    if (doctor) {
      setFormData({
        ...formData,
        doctor_id: doctor.user_id,
        doctor_name: doctor.display_name
      });
    }
  };

  const handleAppointmentTypeSelect = (typeId) => {
    const type = appointmentTypes.find(t => t.id === typeId);
    if (type) {
      const duration = type.duration_minutes || 20;
      const [hours, minutes] = formData.start_time.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      setFormData({
        ...formData,
        appointment_type_id: type.id,
        appointment_type_name: type.name,
        duration_minutes: duration,
        end_time: `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
      });
    }
  };

  const toggleParticipant = (employee) => {
    const isSelected = selectedParticipants.some(p => p.user_id === employee.user_id);
    if (isSelected) {
      setSelectedParticipants(selectedParticipants.filter(p => p.user_id !== employee.user_id));
    } else {
      setSelectedParticipants([...selectedParticipants, {
        user_id: employee.user_id,
        name: employee.display_name,
        job: employee.job
      }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation based on meeting type
    if (isGeneralMeeting) {
      if (!selectedParticipants || selectedParticipants.length === 0) {
        alert('נא לבחור לפחות משתתף אחד לפגישה');
        return;
      }
      if (!formData.chief_complaint) {
        alert('נא למלא נושא הפגישה');
        return;
      }
    } else {
      if (!formData.client_id || !formData.patient_id || !formData.doctor_id || !formData.appointment_type_id) {
        alert('נא למלא את כל השדות החובה');
        return;
      }
    }
    
    // אם סימנו no_show, עדכן את הלקוח
    if (markAsNoShow && formData.client_id) {
      try {
        await base44.entities.Client.update(formData.client_id, {
          has_no_show_history: true
        });
      } catch (error) {
        console.error('Failed to update client no-show status:', error);
      }
    }
    
    const baseData = {
      ...formData,
      status: markAsNoShow ? 'no_show' : formData.status || 'scheduled',
      is_general_meeting: isGeneralMeeting
    };
    
    // Remove participants field entirely for non-general meetings
    if (!isGeneralMeeting) {
      delete baseData.participants;
    }
    
    // Only add participants if it's a general meeting
    const finalData = isGeneralMeeting 
      ? { ...baseData, participants: selectedParticipants }
      : baseData;
    
    onSubmit(finalData);
  };

  const handleCancelAppointment = async () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את התור?')) {
      if (onDelete) {
        onDelete(appointment.id);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      {!appointment && (
      <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            id="general_meeting"
            checked={isGeneralMeeting}
            onCheckedChange={(checked) => {
              setIsGeneralMeeting(checked);
              setFormData({ ...formData, is_general_meeting: checked });
              if (checked) {
                // Clear client/patient fields when switching to general meeting
                setFormData(prev => ({
                  ...prev,
                  client_id: '',
                  client_name: '',
                  client_phone: '',
                  patient_id: '',
                  patient_name: '',
                  appointment_type_id: '',
                  appointment_type_name: '',
                  is_general_meeting: true
                }));
                setSelectedParticipants([]);
              } else {
                setSelectedParticipants([]);
                setFormData(prev => ({ ...prev, is_general_meeting: false, participants: [] }));
              }
            }}
          />
          <Label htmlFor="general_meeting" className="cursor-pointer font-semibold text-purple-900">
            פגישה כללית (לא משוייכת ללקוח)
          </Label>
        </div>
        {isGeneralMeeting && (
          <p className="text-sm text-purple-700 mt-2 mr-8">
            פגישה פנימית עם צוות המרפאה - ללא קשר ללקוח או מטופל
            </p>
            )}
            </div>
            )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">תאריך *</Label>
          <DateInput
            id="date"
            value={formData.date}
            onChange={(value) => setFormData({ ...formData, date: value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="start_time">שעה *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
          />
        </div>
      </div>

      {isGeneralMeeting ? (
        <div className="space-y-4">
          <div>
            <Label>נושא הפגישה *</Label>
            <Input
              value={formData.chief_complaint}
              onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
              placeholder="למשל: ישיבת צוות, הדרכה..."
              required
            />
          </div>

          <div>
            <Label>משך הפגישה (דקות) *</Label>
            <Input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => {
                const duration = parseInt(e.target.value) || 20;
                const [hours, minutes] = formData.start_time.split(':').map(Number);
                const endMinutes = hours * 60 + minutes + duration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                setFormData({
                  ...formData,
                  duration_minutes: duration,
                  end_time: `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
                });
              }}
              min="10"
              step="5"
            />
          </div>

          <div>
            <Label>משתתפים * (בחר לפחות משתתף אחד)</Label>
            <div className="border rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
              <div className="space-y-2">
                {allEmployees.map(employee => {
                  const isSelected = selectedParticipants.some(p => p.user_id === employee.user_id);
                  return (
                    <div key={employee.user_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={`participant-${employee.user_id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleParticipant(employee)}
                      />
                      <Label htmlFor={`participant-${employee.user_id}`} className="cursor-pointer flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{employee.display_name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {employee.job === 'doctor' ? 'רופא' : 
                             employee.job === 'assistant' ? 'עוזר/ת' : 
                             employee.job === 'receptionist' ? 'פקידת קבלה' : employee.job}
                          </span>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedParticipants.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedParticipants.map(p => (
                  <div key={p.user_id} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {p.name}
                    <button
                      type="button"
                      onClick={() => setSelectedParticipants(selectedParticipants.filter(sp => sp.user_id !== p.user_id))}
                      className="hover:bg-purple-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="meeting_notes">פרטים נוספים</Label>
            <Textarea
              id="meeting_notes"
              value={formData.reception_notes}
              onChange={(e) => setFormData({ ...formData, reception_notes: e.target.value })}
              placeholder="הערות על הפגישה..."
              rows={3}
            />
          </div>
        </div>
      ) : (
        <>
          <div>
            {!formData.client_id ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="clientSearch">חיפוש לקוח (לפי שם או טלפון) *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewClientDialogOpen(true)}
              >
                <Plus className="w-4 h-4 ml-1" />
                לקוח חדש
              </Button>
            </div>
            <div className="relative">
              <Input
                id="clientSearch"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientResults(true);
                }}
                placeholder="הקלד שם או טלפון..."
              />
              {showClientResults && clientSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredClients.length === 0 ? (
                    <div className="p-3 text-center text-gray-500">לא נמצאו לקוחות</div>
                  ) : (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        className="p-3 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleClientSelect(client)}
                      >
                        <p className="font-semibold">{client.full_name}</p>
                        <p className="text-sm text-gray-500">{client.phone}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            {(() => {
              const selectedClient = clients.find(c => c.id === formData.client_id);
              return (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-blue-900">
                      פרטי הלקוח {selectedClient?.client_number && `#${selectedClient.client_number}`}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowClientDetails(!showClientDetails)}
                      className="text-blue-700 hover:text-blue-900 font-semibold"
                    >
                      {showClientDetails ? 'הסתר פרטים ▲' : 'הצג פרטים נוספים ▼'}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base">
                      <span className="font-semibold">שם:</span> {formData.client_name}
                    </p>
                    <p className="text-base">
                      <span className="font-semibold">טלפון:</span> <span dir="ltr">{formData.client_phone}</span>
                    </p>
                    {showClientDetails && (
                      <div className="mt-3 pt-3 border-t border-blue-300 space-y-2">
                        <div className="text-base flex items-center gap-2">
                          <span className="font-semibold">טלפון משני:</span>
                          {editingField === 'phone_secondary' ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editValues.phone_secondary || ''}
                                onChange={(e) => setEditValues({ ...editValues, phone_secondary: e.target.value })}
                                className="h-8"
                                dir="ltr"
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit('phone_secondary')}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span dir="ltr">{selectedClient?.phone_secondary || 'לא מוגדר'}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6" 
                                onClick={() => startEdit('phone_secondary', selectedClient?.phone_secondary || '')}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>

                        <div className="text-base flex items-center gap-2">
                          <span className="font-semibold">אימייל:</span>
                          {editingField === 'email' ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editValues.email || ''}
                                onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                                className="h-8"
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit('email')}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span>{selectedClient?.email || 'לא מוגדר'}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6" 
                                onClick={() => startEdit('email', selectedClient?.email || '')}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>

                        <div className="text-base flex items-center gap-2">
                          <span className="font-semibold">ת.ז:</span>
                          {editingField === 'id_number' ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editValues.id_number || ''}
                                onChange={(e) => setEditValues({ ...editValues, id_number: e.target.value })}
                                className="h-8"
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit('id_number')}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span>{selectedClient?.id_number || 'לא מוגדר'}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6" 
                                onClick={() => startEdit('id_number', selectedClient?.id_number || '')}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>

                        <div className="text-base flex items-center gap-2">
                          <span className="font-semibold">כתובת:</span>
                          {editingField === 'address' ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editValues.address || ''}
                                onChange={(e) => setEditValues({ ...editValues, address: e.target.value })}
                                className="h-8"
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit('address')}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span>{selectedClient?.address || 'לא מוגדר'}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6" 
                                onClick={() => startEdit('address', selectedClient?.address || '')}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>

                        <div className="text-base flex items-center gap-2">
                          <span className="font-semibold">עיר:</span>
                          {editingField === 'city' ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editValues.city || ''}
                                onChange={(e) => setEditValues({ ...editValues, city: e.target.value })}
                                className="h-8"
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit('city')}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span>{selectedClient?.city || 'לא מוגדר'}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6" 
                                onClick={() => startEdit('city', selectedClient?.city || '')}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                        {selectedClient?.balance !== undefined && selectedClient?.balance !== 0 && (
                          <p className="text-base">
                            <span className="font-semibold">יתרה:</span>{' '}
                            <span className={selectedClient.balance > 0 ? 'text-red-700 font-bold' : 'text-green-700 font-bold'}>
                              ₪{selectedClient.balance.toFixed(2)} {selectedClient.balance > 0 ? '(חוב)' : '(זכות)'}
                            </span>
                          </p>
                        )}
                        <div className="flex gap-3 text-sm">
                          {selectedClient?.has_no_show_history && (
                            <span className="text-orange-700">⚠ היסטוריית אי התייצבות</span>
                          )}
                        </div>
                        {selectedClient?.notes && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded">
                            <p className="text-sm font-semibold text-yellow-900 mb-1">הערות:</p>
                            <p className="text-sm text-gray-800">{selectedClient.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>לקוח חדש</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSubmit={handleNewClientSubmit}
            onCancel={() => setIsNewClientDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {noShowHistory && noShowHistory.length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900">⚠️ אזהרה - לקוח לא הגיע בעבר</h3>
              <p className="text-sm text-red-800 mt-1">
                ללקוח זה יש {noShowHistory.length} תורים שלא הגיע אליהם. 
                מומלץ לאשר את התור טלפונית לפני הקביעה.
              </p>
              <div className="mt-2 text-xs text-red-700">
                <p className="font-medium">תורים שלא הגיע:</p>
                {noShowHistory.slice(0, 3).map((apt, idx) => (
                  <p key={idx}>• {(() => {
                    const d = new Date(apt.date);
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  })()} - {apt.appointment_type_name}</p>
                ))}
                {noShowHistory.length > 3 && (
                  <p>ועוד {noShowHistory.length - 3} תורים...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {formData.client_id && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="patient">מטופל *</Label>
            {!appointment && formData.appointment_type_name !== 'מעקב' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewPatientDialogOpen(true)}
              >
                <Plus className="w-4 h-4 ml-1" />
                מטופל חדש
              </Button>
            )}
          </div>
          {isPatientsLoading ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-800">
              <p className="text-sm">טוען מטופלים...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800">
              <p className="text-sm mb-2">אין מטופלים רשומים ללקוח זה</p>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsNewPatientDialogOpen(true)}
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף מטופל
              </Button>
            </div>
          ) : appointment || (formData.appointment_type_name === 'מעקב' && formData.patient_name) ? (
            <div className="p-3 bg-gray-100 border-2 border-gray-300 rounded-lg">
              <p className="font-semibold text-gray-900">{formData.patient_name}</p>
              <p className="text-sm text-gray-600">{appointment ? 'לא ניתן לשינוי בעריכת תור' : 'מטופל למעקב - לא ניתן לשינוי'}</p>
            </div>
          ) : (
            <Select onValueChange={handlePatientSelect} value={formData.patient_id}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מטופל" />
              </SelectTrigger>
              <SelectContent>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name} ({patient.species}{patient.breed ? ` - ${patient.breed}` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>מטופל חדש ללקוח: {formData.client_name}</DialogTitle>
          </DialogHeader>
          {formData.client_id && (
            <PatientForm
              clientId={formData.client_id}
              clientName={formData.client_name}
              clientNumber={clients.find(c => c.id === formData.client_id)?.client_number}
              onSubmit={handleNewPatientSubmit}
              onCancel={() => setIsNewPatientDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

          <div>
            <Label htmlFor="doctor">רופא *</Label>
            <Select onValueChange={handleDoctorSelect} value={formData.doctor_id}>
              <SelectTrigger>
                <SelectValue placeholder="בחר רופא" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.user_id} value={doctor.user_id}>
                    {doctor.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="appointmentType">סוג ביקור *</Label>
            <Select onValueChange={handleAppointmentTypeSelect} value={formData.appointment_type_id}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג ביקור" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.duration_minutes} דקות - ₪{type.base_price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.appointment_type_name === 'מעקב' && lastVisit && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <Search className="w-4 h-4" />
                ביקור אחרון
              </h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">תאריך:</span> {(() => {
                  const d = new Date(lastVisit.visit_date);
                  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                })()}</p>
                <p><span className="font-medium">רופא:</span> {lastVisit.doctor_name}</p>
                {lastVisit.chief_complaint && (
                  <p><span className="font-medium">סיבת הגעה:</span> {lastVisit.chief_complaint}</p>
                )}
                {lastVisit.findings_and_tests && (
                  <p><span className="font-medium">ממצאים:</span> {lastVisit.findings_and_tests}</p>
                )}
                {lastVisit.diagnosis && (
                  <p><span className="font-medium">אבחנה:</span> {lastVisit.diagnosis}</p>
                )}
                {lastVisit.treatment && (
                  <p><span className="font-medium">טיפול שניתן:</span> {lastVisit.treatment}</p>
                )}
                {lastVisit.medications && lastVisit.medications.length > 0 && (
                  <div>
                    <p className="font-medium">תרופות שנרשמו:</p>
                    <ul className="list-disc list-inside mr-4">
                      {lastVisit.medications.map((med, idx) => (
                        <li key={idx}>{med.name} - {med.dosage} ({med.frequency})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <Label htmlFor="room">חדר</Label>
        <Select
          value={formData.room_id}
          onValueChange={(value) => {
            const selectedRoom = rooms.find(r => r.id === value);
            setFormData({
              ...formData,
              room_id: value,
              room_name: selectedRoom?.name || ''
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="בחר חדר (אופציונלי)" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map(room => (
              <SelectItem key={room.id} value={room.id}>
                {room.name} ({room.room_type === 'examination' ? 'בדיקה' :
                             room.room_type === 'surgery' ? 'ניתוח' :
                             room.room_type === 'laboratory' ? 'מעבדה' :
                             room.room_type === 'imaging' ? 'הדמיה' : 'קבלה'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {appointment && !isGeneralMeeting && (
        <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="no_show"
              checked={markAsNoShow}
              onCheckedChange={setMarkAsNoShow}
            />
            <Label
              htmlFor="no_show"
              className="text-sm font-bold leading-none cursor-pointer text-orange-900"
            >
              ⚠️ סמן כ"לא הגיע" - לקוח לא התייצב לתור
            </Label>
          </div>
          {markAsNoShow && (
            <p className="text-xs text-orange-700 mt-2 mr-6">
              סימון זה יתעד שהלקוח לא הגיע ויוצג בתיק הלקוח כאזהרה
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between gap-2">
        <div>
          {appointment && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleCancelAppointment}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק תור
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4 ml-2" />
            שמור
          </Button>
        </div>
      </div>
    </form>
  );
}