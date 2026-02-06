import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";

export default function BlockedDatesForm({ setting, doctors, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    date: setting?.date || new Date().toISOString().split('T')[0],
    doctor_id: setting?.doctor_id || '',
    doctor_name: setting?.doctor_name || '',
    block_reason: setting?.block_reason || '',
    notes: setting?.notes || '',
    recurrence_type: setting?.recurrence_type || 'none',
    recurrence_end_date: setting?.recurrence_end_date || ''
  });

  const handleDoctorSelect = (doctorId) => {
    if (doctorId === 'all') {
      setFormData({ ...formData, doctor_id: '', doctor_name: '' });
    } else {
      const doctor = doctors.find(d => d.user_id === doctorId);
      if (doctor) {
        setFormData({ ...formData, doctor_id: doctor.user_id, doctor_name: doctor.display_name });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div>
        <Label htmlFor="date">תאריך *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="doctor">רופא</Label>
        <Select 
          value={formData.doctor_id || 'all'}
          onValueChange={handleDoctorSelect}
        >
          <SelectTrigger>
            <SelectValue placeholder="בחר רופא" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הרופאים</SelectItem>
            {doctors.map(doctor => (
              <SelectItem key={doctor.user_id} value={doctor.user_id}>
                {doctor.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">השאר ריק לחסימת כל היומן באותו תאריך</p>
      </div>

      <div>
        <Label htmlFor="block_reason">סיבת החסימה *</Label>
        <Input
          id="block_reason"
          value={formData.block_reason}
          onChange={(e) => setFormData({ ...formData, block_reason: e.target.value })}
          placeholder="למשל: חג, חופשה, ימי מחלה"
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">הערות נוספות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="recurrence">חזרתיות</Label>
        <Select 
          value={formData.recurrence_type}
          onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="ללא חזרתיות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">ללא חזרתיות</SelectItem>
            <SelectItem value="weekly">שבועי</SelectItem>
            <SelectItem value="monthly">חודשי</SelectItem>
            <SelectItem value="yearly">שנתי</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">למשל: חסימה שבועית כל יום שישי, או שנתית בחגים</p>
      </div>

      {formData.recurrence_type !== 'none' && (
        <div>
          <Label htmlFor="recurrence_end_date">תאריך סיום חזרתיות (אופציונלי)</Label>
          <Input
            id="recurrence_end_date"
            type="date"
            value={formData.recurrence_end_date}
            onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 ml-2" />
          שמור
        </Button>
      </div>
    </form>
  );
}