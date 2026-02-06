import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stethoscope, Plus, Edit, Trash2, Save, X, Calendar } from "lucide-react";

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const WORKING_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

export default function DoctorScheduleManager({ doctors, schedules, onSave, onDelete }) {
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [daySchedules, setDaySchedules] = useState({});
  const [useSameHoursForAll, setUseSameHoursForAll] = useState(false);
  const [commonSchedule, setCommonSchedule] = useState({
    shift_type: 'full_day',
    start_time: '08:00',
    end_time: '20:00',
    morning_start: '08:00',
    morning_end: '14:00',
    evening_start: '14:00',
    evening_end: '20:00'
  });
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [formData, setFormData] = useState({
    doctor_id: '',
    doctor_name: '',
    day_of_week: '',
    shift_type: 'full_day',
    start_time: '08:00',
    end_time: '20:00',
    morning_start: '08:00',
    morning_end: '14:00',
    evening_start: '14:00',
    evening_end: '20:00',
    notes: ''
  });

  React.useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { base44 } = await import('@/api/base44Client');
        const templates = await base44.entities.ShiftTemplate.list();
        setShiftTemplates(templates.filter(t => t.is_active));
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  const getShiftTimesByType = (shiftType) => {
    if (shiftType === 'morning') {
      const morningTemplate = shiftTemplates.find(t => t.name.includes('בוקר'));
      if (morningTemplate) {
        return {
          start: morningTemplate.start_time,
          end: morningTemplate.end_time
        };
      }
      return { start: '08:00', end: '14:00' };
    }
    if (shiftType === 'evening') {
      const eveningTemplate = shiftTemplates.find(t => t.name.includes('ערב'));
      if (eveningTemplate) {
        return {
          start: eveningTemplate.start_time,
          end: eveningTemplate.end_time
        };
      }
      return { start: '14:00', end: '20:00' };
    }
    return null;
  };

  const filteredSchedules = selectedDoctor 
    ? schedules.filter(s => s.doctor_id === selectedDoctor)
    : schedules;

  const groupedByDoctor = doctors.map(doctor => ({
    doctor,
    schedules: schedules.filter(s => s.doctor_id === doctor.user_id)
  }));

  const handleOpenForm = (schedule = null, bulkMode = false) => {
    setIsBulkMode(bulkMode);
    setSelectedDays([]);
    setDaySchedules({});
    setUseSameHoursForAll(false);
    setCommonSchedule({
      shift_type: 'full_day',
      start_time: '08:00',
      end_time: '20:00',
      morning_start: '08:00',
      morning_end: '14:00',
      evening_start: '14:00',
      evening_end: '20:00'
    });
    setUseTemplate(false);
    setSelectedTemplate('');
    
    if (schedule) {
      setFormData(schedule);
      setEditingSchedule(schedule);
    } else {
      setFormData({
        doctor_id: selectedDoctor || '',
        doctor_name: selectedDoctor ? doctors.find(d => d.user_id === selectedDoctor)?.display_name : '',
        day_of_week: '',
        shift_type: 'full_day',
        start_time: '08:00',
        end_time: '20:00',
        morning_start: '08:00',
        morning_end: '14:00',
        evening_start: '14:00',
        evening_end: '20:00',
        notes: ''
      });
      setEditingSchedule(null);
    }
    setIsFormOpen(true);
  };

  const handleTemplateSelect = (templateId) => {
    const template = shiftTemplates.find(t => t.id === templateId);
    if (!template) return;

    setFormData({
      ...formData,
      start_time: template.start_time,
      end_time: template.end_time,
      shift_type: 'full_day'
    });
  };

  const toggleDay = (dayIndex) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex];
      
      // Initialize schedule for newly added day
      if (!prev.includes(dayIndex)) {
        setDaySchedules(schedules => ({
          ...schedules,
          [dayIndex]: {
            shift_type: 'full_day',
            start_time: '08:00',
            end_time: '20:00',
            morning_start: '08:00',
            morning_end: '14:00',
            evening_start: '14:00',
            evening_end: '20:00'
          }
        }));
      }
      
      return newDays;
    });
  };

  const updateCommonSchedule = (field, value) => {
    setCommonSchedule(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-set times for morning/evening shifts from templates
      if (field === 'shift_type') {
        const shiftTimes = getShiftTimesByType(value);
        if (shiftTimes) {
          updated.start_time = shiftTimes.start;
          updated.end_time = shiftTimes.end;
          if (value === 'morning') {
            updated.morning_start = shiftTimes.start;
            updated.morning_end = shiftTimes.end;
          } else if (value === 'evening') {
            updated.evening_start = shiftTimes.start;
            updated.evening_end = shiftTimes.end;
          }
        }
      }

      return updated;
    });
  };

  const updateDaySchedule = (dayIndex, field, value) => {
    setDaySchedules(prev => {
      const updated = {
        ...prev,
        [dayIndex]: {
          ...prev[dayIndex],
          [field]: value
        }
      };

      // Auto-set times for morning/evening shifts from templates
      if (field === 'shift_type') {
        const shiftTimes = getShiftTimesByType(value);
        if (shiftTimes) {
          updated[dayIndex] = {
            ...updated[dayIndex],
            start_time: shiftTimes.start,
            end_time: shiftTimes.end,
            morning_start: value === 'morning' ? shiftTimes.start : updated[dayIndex].morning_start,
            morning_end: value === 'morning' ? shiftTimes.end : updated[dayIndex].morning_end,
            evening_start: value === 'evening' ? shiftTimes.start : updated[dayIndex].evening_start,
            evening_end: value === 'evening' ? shiftTimes.end : updated[dayIndex].evening_end
          };
        }
      }

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.doctor_id) {
      alert('נא לבחור רופא');
      return;
    }

    const doctor = doctors.find(d => d.user_id === formData.doctor_id);
    
    if (isBulkMode) {
      if (selectedDays.length === 0) {
        alert('נא לבחור לפחות יום אחד');
        return;
      }
      
      // Save multiple schedules with individual or common settings
      selectedDays.forEach(dayIndex => {
        const daySettings = useSameHoursForAll ? commonSchedule : (daySchedules[dayIndex] || {});
        const dataToSave = {
          doctor_id: formData.doctor_id,
          doctor_name: doctor?.display_name || formData.doctor_name,
          day_of_week: dayIndex,
          shift_type: daySettings.shift_type || 'full_day',
          start_time: daySettings.start_time || '08:00',
          end_time: daySettings.end_time || '20:00',
          morning_start: daySettings.morning_start || '08:00',
          morning_end: daySettings.morning_end || '14:00',
          evening_start: daySettings.evening_start || '14:00',
          evening_end: daySettings.evening_end || '20:00',
          notes: formData.notes || ''
        };
        onSave(dataToSave, null);
      });
    } else {
      if (formData.day_of_week === '') {
        alert('נא לבחור יום');
        return;
      }
      
      const dataToSave = {
        ...formData,
        doctor_name: doctor?.display_name || formData.doctor_name,
        day_of_week: Number(formData.day_of_week)
      };
      
      onSave(dataToSave, editingSchedule?.id);
    }
    
    setIsFormOpen(false);
    setEditingSchedule(null);
    setIsBulkMode(false);
    setSelectedDays([]);
    setDaySchedules({});
  };

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">הגדרת יומני רופאים</p>
              <p className="text-blue-700">
                כאן תוכל להגדיר עבור כל רופא את הימים והשעות שבהם הוא עובד. 
                התורים ביומן יהיו זמינים רק בשעות שהוגדרו עבור כל רופא.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 flex-1">
              <CardTitle>יומני רופאים</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">סינון לפי רופא:</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="כל הרופאים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>כל הרופאים</SelectItem>
                    {doctors.map(doctor => (
                      <SelectItem key={doctor.user_id} value={doctor.user_id}>
                        {doctor.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOpenForm(null, false)}>
                <Plus className="w-4 h-4 ml-2" />
                הוספת משמרת יחידה
              </Button>
              <Button onClick={() => handleOpenForm(null, true)} variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                הגדרת יומן רופא
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groupedByDoctor.length === 0 ? (
            <p className="text-center text-gray-500 py-8">אין רופאים מוגדרים</p>
          ) : groupedByDoctor.filter(g => !selectedDoctor || g.doctor.user_id === selectedDoctor).length === 0 ? (
            <p className="text-center text-gray-500 py-8">לא נמצאו הגדרות</p>
          ) : (
            <div className="space-y-6">
              {groupedByDoctor
                .filter(g => !selectedDoctor || g.doctor.user_id === selectedDoctor)
                .map(({ doctor, schedules: doctorSchedules }) => (
                  <div key={doctor.user_id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Stethoscope className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold">{doctor.display_name}</h3>
                      <Badge variant="outline" className="mr-auto">
                        {doctorSchedules.length} משמרות
                      </Badge>
                    </div>
                    
                    {doctorSchedules.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        לא הוגדרו משמרות לרופא זה
                      </p>
                    ) : (
                      <Table dir="rtl">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">יום</TableHead>
                            <TableHead className="text-right">סוג משמרת</TableHead>
                            <TableHead className="text-right">שעות</TableHead>
                            <TableHead className="text-center">פעולות</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {doctorSchedules
                            .sort((a, b) => a.day_of_week - b.day_of_week)
                            .map(schedule => (
                              <TableRow key={schedule.id}>
                                <TableCell className="font-medium text-right">
                                  {DAYS_OF_WEEK[schedule.day_of_week]}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className={
                                    schedule.shift_type === 'morning' ? 'bg-orange-50 text-orange-700' :
                                    schedule.shift_type === 'evening' ? 'bg-purple-50 text-purple-700' :
                                    schedule.shift_type === 'split' ? 'bg-blue-50 text-blue-700' :
                                    'bg-green-50 text-green-700'
                                  }>
                                    {schedule.shift_type === 'morning' ? '🌅 בוקר' :
                                     schedule.shift_type === 'evening' ? '🌆 ערב' :
                                     schedule.shift_type === 'split' ? '🔄 מפוצל' :
                                     '☀️ יום מלא'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {schedule.shift_type === 'split' ? (
                                    <div className="text-sm space-y-1">
                                      <div>🌅 {schedule.morning_start} - {schedule.morning_end}</div>
                                      <div>🌆 {schedule.evening_start} - {schedule.evening_end}</div>
                                    </div>
                                  ) : schedule.shift_type === 'morning' ? (
                                    <span>{schedule.morning_start} - {schedule.morning_end}</span>
                                  ) : schedule.shift_type === 'evening' ? (
                                    <span>{schedule.evening_start} - {schedule.evening_end}</span>
                                  ) : (
                                    <span>{schedule.start_time} - {schedule.end_time}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenForm(schedule)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (window.confirm('האם למחוק משמרת זו?')) {
                                          onDelete(schedule.id);
                                        }
                                      }}
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
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'עריכת משמרת' : isBulkMode ? 'הוספת ימים מרובים' : 'הוספת משמרת חדשה'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>רופא *</Label>
              <Select 
                value={formData.doctor_id}
                onValueChange={(value) => {
                  const doctor = doctors.find(d => d.user_id === value);
                  setFormData({ ...formData, doctor_id: value, doctor_name: doctor?.display_name || '' });
                }}
              >
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

            {isBulkMode ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>בחר ימים *</Label>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const workingDayIndices = [0, 1, 2, 3, 4, 5];
                        setSelectedDays(workingDayIndices);
                        workingDayIndices.forEach(dayIndex => {
                          if (!daySchedules[dayIndex]) {
                            setDaySchedules(schedules => ({
                              ...schedules,
                              [dayIndex]: {
                                shift_type: 'full_day',
                                start_time: '08:00',
                                end_time: '20:00',
                                morning_start: '08:00',
                                morning_end: '14:00',
                                evening_start: '14:00',
                                evening_end: '20:00'
                              }
                            }));
                          }
                        });
                      }}
                      className="text-xs"
                    >
                      בחר כל השבוע (ראשון-שישי)
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border">
                    {WORKING_DAYS.map((day, index) => (
                      <div
                        key={index}
                        onClick={() => toggleDay(index)}
                        className={`p-3 rounded-md border-2 cursor-pointer transition-all ${
                          selectedDays.includes(index)
                            ? 'bg-purple-100 border-purple-500 text-purple-900 font-semibold'
                            : 'bg-white border-gray-300 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{day}</span>
                          {selectedDays.includes(index) && (
                            <span className="text-purple-600">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedDays.length > 0 && (
                    <p className="text-sm text-purple-600">
                      נבחרו {selectedDays.length} ימים
                    </p>
                  )}
                </div>

                {selectedDays.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">הגדרת שעות</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useSameHoursForAll"
                          checked={useSameHoursForAll}
                          onChange={(e) => setUseSameHoursForAll(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="useSameHoursForAll" className="cursor-pointer text-sm">
                          שעות זהות לכל הימים
                        </Label>
                      </div>
                    </div>

                    {useSameHoursForAll ? (
                      <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50/30 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold text-purple-900">הגדרה משותפת לכל הימים הנבחרים</span>
                        </div>
                        
                        <div>
                          <Label className="text-sm">סוג משמרת</Label>
                          <Select 
                            value={commonSchedule.shift_type}
                            onValueChange={(value) => updateCommonSchedule('shift_type', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_day">יום מלא</SelectItem>
                              <SelectItem value="morning">משמרת בוקר</SelectItem>
                              <SelectItem value="evening">משמרת ערב</SelectItem>
                              <SelectItem value="split">מפוצל (בוקר + ערב)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {commonSchedule.shift_type === 'full_day' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">שעת התחלה</Label>
                              <Input
                                type="time"
                                value={commonSchedule.start_time}
                                onChange={(e) => updateCommonSchedule('start_time', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">שעת סיום</Label>
                              <Input
                                type="time"
                                value={commonSchedule.end_time}
                                onChange={(e) => updateCommonSchedule('end_time', e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {commonSchedule.shift_type === 'morning' && (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                            <div className="text-sm text-gray-700">
                              <span className="font-semibold">שעות משמרת בוקר (מוגדרות מראש):</span>
                              <div className="mt-1 text-base font-medium">
                                {(() => {
                                  const times = getShiftTimesByType('morning');
                                  return `${times.start} - ${times.end}`;
                                })()}
                              </div>
                            </div>
                          </div>
                        )}

                        {commonSchedule.shift_type === 'evening' && (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                            <div className="text-sm text-gray-700">
                              <span className="font-semibold">שעות משמרת ערב (מוגדרות מראש):</span>
                              <div className="mt-1 text-base font-medium">
                                {(() => {
                                  const times = getShiftTimesByType('evening');
                                  return `${times.start} - ${times.end}`;
                                })()}
                              </div>
                            </div>
                          </div>
                        )}

                        {commonSchedule.shift_type === 'split' && (
                          <div className="space-y-3">
                            <div className="p-2 bg-orange-50 rounded border border-orange-200">
                              <Label className="text-xs font-semibold">🌅 משמרת בוקר</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <Input
                                  type="time"
                                  value={commonSchedule.morning_start}
                                  onChange={(e) => {
                                    updateCommonSchedule('morning_start', e.target.value);
                                    updateCommonSchedule('start_time', e.target.value);
                                  }}
                                />
                                <Input
                                  type="time"
                                  value={commonSchedule.morning_end}
                                  onChange={(e) => updateCommonSchedule('morning_end', e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded border border-purple-200">
                              <Label className="text-xs font-semibold">🌆 משמרת ערב</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <Input
                                  type="time"
                                  value={commonSchedule.evening_start}
                                  onChange={(e) => updateCommonSchedule('evening_start', e.target.value)}
                                />
                                <Input
                                  type="time"
                                  value={commonSchedule.evening_end}
                                  onChange={(e) => {
                                    updateCommonSchedule('evening_end', e.target.value);
                                    updateCommonSchedule('end_time', e.target.value);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t">
                          <p className="text-sm text-purple-700">
                            ההגדרות יחולו על: {selectedDays.map(d => DAYS_OF_WEEK[d]).join(', ')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Label className="text-base">הגדרת שעות לכל יום בנפרד</Label>
                        {selectedDays.sort((a, b) => a - b).map(dayIndex => {
                      const daySettings = daySchedules[dayIndex] || {};
                      return (
                        <div key={dayIndex} className="p-4 border rounded-lg bg-white space-y-3">
                          <h4 className="font-semibold text-purple-700">{DAYS_OF_WEEK[dayIndex]}</h4>
                          
                          <div>
                            <Label className="text-sm">סוג משמרת</Label>
                            <Select 
                              value={daySettings.shift_type || 'full_day'}
                              onValueChange={(value) => updateDaySchedule(dayIndex, 'shift_type', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full_day">יום מלא</SelectItem>
                                <SelectItem value="morning">משמרת בוקר</SelectItem>
                                <SelectItem value="evening">משמרת ערב</SelectItem>
                                <SelectItem value="split">מפוצל (בוקר + ערב)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {daySettings.shift_type === 'full_day' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm">שעת התחלה</Label>
                                <Input
                                  type="time"
                                  value={daySettings.start_time || '08:00'}
                                  onChange={(e) => updateDaySchedule(dayIndex, 'start_time', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-sm">שעת סיום</Label>
                                <Input
                                  type="time"
                                  value={daySettings.end_time || '20:00'}
                                  onChange={(e) => updateDaySchedule(dayIndex, 'end_time', e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          {daySettings.shift_type === 'morning' && (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                              <div className="text-sm text-gray-700">
                                <span className="font-semibold">שעות משמרת בוקר (מוגדרות מראש):</span>
                                <div className="mt-1 text-base font-medium">
                                  {(() => {
                                    const times = getShiftTimesByType('morning');
                                    return `${times.start} - ${times.end}`;
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          {daySettings.shift_type === 'evening' && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                              <div className="text-sm text-gray-700">
                                <span className="font-semibold">שעות משמרת ערב (מוגדרות מראש):</span>
                                <div className="mt-1 text-base font-medium">
                                  {(() => {
                                    const times = getShiftTimesByType('evening');
                                    return `${times.start} - ${times.end}`;
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          {daySettings.shift_type === 'split' && (
                            <div className="space-y-3">
                              <div className="p-2 bg-orange-50 rounded border border-orange-200">
                                <Label className="text-xs font-semibold">🌅 משמרת בוקר</Label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <Input
                                    type="time"
                                    value={daySettings.morning_start || '08:00'}
                                    onChange={(e) => {
                                      updateDaySchedule(dayIndex, 'morning_start', e.target.value);
                                      updateDaySchedule(dayIndex, 'start_time', e.target.value);
                                    }}
                                  />
                                  <Input
                                    type="time"
                                    value={daySettings.morning_end || '14:00'}
                                    onChange={(e) => updateDaySchedule(dayIndex, 'morning_end', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="p-2 bg-purple-50 rounded border border-purple-200">
                                <Label className="text-xs font-semibold">🌆 משמרת ערב</Label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <Input
                                    type="time"
                                    value={daySettings.evening_start || '14:00'}
                                    onChange={(e) => updateDaySchedule(dayIndex, 'evening_start', e.target.value)}
                                  />
                                  <Input
                                    type="time"
                                    value={daySettings.evening_end || '20:00'}
                                    onChange={(e) => {
                                      updateDaySchedule(dayIndex, 'evening_end', e.target.value);
                                      updateDaySchedule(dayIndex, 'end_time', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div>
                <Label>יום בשבוע *</Label>
                <Select 
                  value={formData.day_of_week !== '' ? String(formData.day_of_week) : ''}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר יום" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isBulkMode && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useTemplate"
                      checked={useTemplate}
                      onChange={(e) => setUseTemplate(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="useTemplate" className="cursor-pointer">
                      השתמש בתבנית משמרת מוגדרת
                    </Label>
                  </div>

                  {useTemplate && shiftTemplates.length > 0 && (
                    <div>
                      <Label>בחר תבנית משמרת</Label>
                      <Select 
                        value={selectedTemplate}
                        onValueChange={(value) => {
                          setSelectedTemplate(value);
                          handleTemplateSelect(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר תבנית" />
                        </SelectTrigger>
                        <SelectContent>
                          {shiftTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} ({template.start_time} - {template.end_time})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
              <Label>סוג משמרת</Label>
              <Select 
                value={formData.shift_type}
                onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">יום מלא</SelectItem>
                  <SelectItem value="morning">משמרת בוקר</SelectItem>
                  <SelectItem value="evening">משמרת ערב</SelectItem>
                  <SelectItem value="split">מפוצל (בוקר + ערב)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.shift_type === 'full_day' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שעת התחלה</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>שעת סיום</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}

            {formData.shift_type === 'morning' && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">שעות משמרת בוקר (מוגדרות מראש):</span>
                  <div className="mt-1 text-base font-medium">
                    {(() => {
                      const times = getShiftTimesByType('morning');
                      return `${times.start} - ${times.end}`;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {formData.shift_type === 'evening' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">שעות משמרת ערב (מוגדרות מראש):</span>
                  <div className="mt-1 text-base font-medium">
                    {(() => {
                      const times = getShiftTimesByType('evening');
                      return `${times.start} - ${times.end}`;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {formData.shift_type === 'split' && (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-sm mb-2">🌅 משמרת בוקר</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>התחלה</Label>
                      <Input
                        type="time"
                        value={formData.morning_start}
                        onChange={(e) => setFormData({ ...formData, morning_start: e.target.value, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>סיום</Label>
                      <Input
                        type="time"
                        value={formData.morning_end}
                        onChange={(e) => setFormData({ ...formData, morning_end: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-sm mb-2">🌆 משמרת ערב</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>התחלה</Label>
                      <Input
                        type="time"
                        value={formData.evening_start}
                        onChange={(e) => setFormData({ ...formData, evening_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>סיום</Label>
                      <Input
                        type="time"
                        value={formData.evening_end}
                        onChange={(e) => setFormData({ ...formData, evening_end: e.target.value, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}



                <div>
                  <Label>הערות</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </>
            )}

            {isBulkMode && (
              <div>
                <Label>הערות כלליות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 ml-2" />
                שמור
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}