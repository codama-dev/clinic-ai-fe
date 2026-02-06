import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";

const ROOM_TYPES = [
  { value: 'examination', label: 'חדר בדיקה' },
  { value: 'surgery', label: 'חדר ניתוח' },
  { value: 'laboratory', label: 'מעבדה' },
  { value: 'imaging', label: 'הדמיה' },
  { value: 'reception', label: 'קבלה' }
];

const ROOM_STATUS = [
  { value: 'available', label: 'זמין' },
  { value: 'maintenance', label: 'תחזוקה' },
  { value: 'unavailable', label: 'לא זמין' }
];

export default function RoomForm({ room, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(room || {
    name: '',
    room_type: 'examination',
    capacity: 1,
    equipment: '',
    status: 'available',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.room_type) {
      alert('נא למלא את כל השדות החובה');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div>
        <Label htmlFor="name">שם החדר *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="לדוגמה: חדר בדיקה 1"
          required
        />
      </div>

      <div>
        <Label htmlFor="room_type">סוג החדר *</Label>
        <Select
          value={formData.room_type}
          onValueChange={(value) => setFormData({ ...formData, room_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROOM_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="capacity">קיבולת מקבילה</Label>
        <Input
          id="capacity"
          type="number"
          min="1"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
        />
      </div>

      <div>
        <Label htmlFor="equipment">ציוד זמין בחדר</Label>
        <Textarea
          id="equipment"
          value={formData.equipment}
          onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
          placeholder="תיאור הציוד הזמין בחדר..."
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="status">סטטוס החדר</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROOM_STATUS.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="הערות נוספות..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 ml-2" />
          {room ? 'עדכן' : 'שמור'}
        </Button>
      </div>
    </form>
  );
}