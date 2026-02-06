import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";

export default function TimeSlotSettingsForm({ setting, doctors, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    day_of_week: setting?.day_of_week !== undefined ? setting.day_of_week : '',
    start_time: setting?.start_time || '08:00',
    end_time: setting?.end_time || '20:00',
    slot_duration: setting?.slot_duration || 20,
    notes: setting?.notes || '',
    is_active: setting?.is_active !== undefined ? setting.is_active : true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // הכן את הנתונים לשמירה
    const dataToSubmit = {
      ...formData,
      day_of_week: formData.day_of_week === '' ? null : formData.day_of_week,
      doctor_id: null,
      doctor_name: null
    };
    
    console.log('Submitting time slot settings:', dataToSubmit);
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        <p className="font-semibold mb-1">💡 הגדרה כללית</p>
        <p>הגדרות מרווחי זמן חלות על כל הרופאים במרפאה</p>
      </div>

      <div>
        <Label htmlFor="day_of_week">יום בשבוע (אופציונלי)</Label>
        <Select 
          value={formData.day_of_week !== '' ? String(formData.day_of_week) : 'all'}
          onValueChange={(value) => setFormData({ ...formData, day_of_week: value === 'all' ? '' : Number(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="כל הימים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הימים</SelectItem>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">שעת התחלה</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="end_time">שעת סיום</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="slot_duration">משך משבצת (דקות)</Label>
        <Input
          id="slot_duration"
          type="number"
          min="5"
          step="5"
          value={formData.slot_duration}
          onChange={(e) => setFormData({ ...formData, slot_duration: Number(e.target.value) })}
        />
        <p className="text-xs text-gray-500 mt-1">
          קביעת התורים תתבסס על זמינות החדרים והמשבצות של כל רופא
        </p>
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>



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