import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";

export default function WorkingHoursForm({ setting, doctors, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    day_of_week: setting?.day_of_week !== undefined ? setting.day_of_week : '',
    start_time: setting?.start_time || '08:00',
    end_time: setting?.end_time || '20:00',
    shift_type: setting?.shift_type || 'full_day',
    morning_start: setting?.morning_start || '08:00',
    morning_end: setting?.morning_end || '14:00',
    evening_start: setting?.evening_start || '14:00',
    evening_end: setting?.evening_end || '20:00',
    break_start: setting?.break_start || '',
    break_end: setting?.break_end || '',
    notes: setting?.notes || '',
    recurrence_type: setting?.recurrence_type || 'weekly',
    recurrence_end_date: setting?.recurrence_end_date || ''
  });



  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div>
        <Label htmlFor="day_of_week">יום בשבוע *</Label>
        <Select 
          value={formData.day_of_week !== '' ? String(formData.day_of_week) : ''}
          onValueChange={(value) => setFormData({ ...formData, day_of_week: Number(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="בחר יום" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">ראשון</SelectItem>
            <SelectItem value="1">שני</SelectItem>
            <SelectItem value="2">שלישי</SelectItem>
            <SelectItem value="3">רביעי</SelectItem>
            <SelectItem value="4">חמישי</SelectItem>
            <SelectItem value="5">שישי</SelectItem>
            <SelectItem value="6">שבת</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="shift_type">סוג משמרת</Label>
        <Select 
          value={formData.shift_type}
          onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="בחר סוג משמרת" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full_day">יום מלא (ללא חלוקה למשמרות)</SelectItem>
            <SelectItem value="morning">משמרת בוקר בלבד</SelectItem>
            <SelectItem value="evening">משמרת ערב בלבד</SelectItem>
            <SelectItem value="split">חלוקה למשמרות (בוקר + ערב)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.shift_type === 'full_day' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_time">שעת התחלה *</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="end_time">שעת סיום *</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>
        </div>
      )}

      {formData.shift_type === 'morning' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="morning_start">שעת התחלה משמרת בוקר *</Label>
            <Input
              id="morning_start"
              type="time"
              value={formData.morning_start}
              onChange={(e) => setFormData({ ...formData, morning_start: e.target.value, start_time: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="morning_end">שעת סיום משמרת בוקר *</Label>
            <Input
              id="morning_end"
              type="time"
              value={formData.morning_end}
              onChange={(e) => setFormData({ ...formData, morning_end: e.target.value, end_time: e.target.value })}
              required
            />
          </div>
        </div>
      )}

      {formData.shift_type === 'evening' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="evening_start">שעת התחלה משמרת ערב *</Label>
            <Input
              id="evening_start"
              type="time"
              value={formData.evening_start}
              onChange={(e) => setFormData({ ...formData, evening_start: e.target.value, start_time: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="evening_end">שעת סיום משמרת ערב *</Label>
            <Input
              id="evening_end"
              type="time"
              value={formData.evening_end}
              onChange={(e) => setFormData({ ...formData, evening_end: e.target.value, end_time: e.target.value })}
              required
            />
          </div>
        </div>
      )}

      {formData.shift_type === 'split' && (
        <>
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-sm text-blue-900">משמרת בוקר</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="morning_start">שעת התחלה *</Label>
                <Input
                  id="morning_start"
                  type="time"
                  value={formData.morning_start}
                  onChange={(e) => setFormData({ ...formData, morning_start: e.target.value, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="morning_end">שעת סיום *</Label>
                <Input
                  id="morning_end"
                  type="time"
                  value={formData.morning_end}
                  onChange={(e) => setFormData({ ...formData, morning_end: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-sm text-purple-900">משמרת ערב</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="evening_start">שעת התחלה *</Label>
                <Input
                  id="evening_start"
                  type="time"
                  value={formData.evening_start}
                  onChange={(e) => setFormData({ ...formData, evening_start: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="evening_end">שעת סיום *</Label>
                <Input
                  id="evening_end"
                  type="time"
                  value={formData.evening_end}
                  onChange={(e) => setFormData({ ...formData, evening_end: e.target.value, end_time: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-sm text-gray-900">הפסקה (אופציונלי)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="break_start">שעת התחלת הפסקה</Label>
            <Input
              id="break_start"
              type="time"
              value={formData.break_start}
              onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="break_end">שעת סיום הפסקה</Label>
            <Input
              id="break_end"
              type="time"
              value={formData.break_end}
              onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="הערות נוספות על שעות הפעילות"
        />
      </div>

      <div>
        <Label htmlFor="recurrence">חזרתיות</Label>
        <Select 
          value={formData.recurrence_type}
          onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="חזרתיות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">שבועי (ברירת מחדל)</SelectItem>
            <SelectItem value="monthly">חודשי</SelectItem>
            <SelectItem value="yearly">שנתי</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.recurrence_type && (
        <div>
          <Label htmlFor="recurrence_end_date">תאריך סיום (אופציונלי)</Label>
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