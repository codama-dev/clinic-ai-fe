import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X } from "lucide-react";

export default function AppointmentTypeForm({ appointmentType, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: appointmentType?.name || '',
    duration_minutes: appointmentType?.duration_minutes || 20,
    base_price: appointmentType?.base_price || 0,
    color: appointmentType?.color || '#3b82f6',
    requires_room_type: appointmentType?.requires_room_type || 'examination',
    description: appointmentType?.description || '',
    is_active: appointmentType?.is_active !== undefined ? appointmentType.is_active : true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.duration_minutes || formData.base_price === '') {
      alert('נא למלא שם, משך זמן ומחיר');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div>
        <Label htmlFor="name">שם סוג הביקור *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration_minutes">משך הביקור (דקות) *</Label>
          <Input
            id="duration_minutes"
            type="number"
            min="5"
            step="5"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="base_price">מחיר בסיס (₪) *</Label>
          <Input
            id="base_price"
            type="number"
            min="0"
            step="10"
            value={formData.base_price}
            onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="color">צבע להצגה</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="#3b82f6"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="requires_room_type">סוג חדר נדרש</Label>
          <Select 
            value={formData.requires_room_type}
            onValueChange={(value) => setFormData({ ...formData, requires_room_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="examination">חדר בדיקה</SelectItem>
              <SelectItem value="surgery">חדר ניתוח</SelectItem>
              <SelectItem value="laboratory">מעבדה</SelectItem>
              <SelectItem value="imaging">צילום</SelectItem>
              <SelectItem value="any">כל חדר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">תיאור</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active" className="cursor-pointer">סוג ביקור פעיל</Label>
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