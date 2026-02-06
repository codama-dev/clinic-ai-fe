
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X } from "lucide-react";

const ROLES = [
  { value: "doctor", label: "רופא/ה" },
  { value: "assistant", label: "אסיסטנט/ית" },
  { value: "receptionist", label: "קבלה" }
];

const defaultStaffing = {
    doctor: { min: 0, max: 0 },
    assistant: { min: 0, max: 0 },
    receptionist: { min: 0, max: 0 },
};

export default function ShiftTemplateForm({ template, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(() => {
    const initialData = template || {
      name: "",
      start_time: "",
      end_time: "",
      is_active: true
    };

    const mergedStaffing = { ...defaultStaffing };

    if (initialData.staffing_requirements && typeof initialData.staffing_requirements === 'object') {
      for (const role of ROLES) {
        if (initialData.staffing_requirements[role.value]) {
          mergedStaffing[role.value] = {
            ...defaultStaffing[role.value], // Ensure min/max default if missing from template's specific role data
            ...initialData.staffing_requirements[role.value]
          };
        }
      }
    }

    return {
      ...initialData,
      staffing_requirements: mergedStaffing
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRequirementChange = (role, key, value) => {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({
          ...prev,
          staffing_requirements: {
              ...prev.staffing_requirements,
              [role]: {
                  ...(prev.staffing_requirements[role] || { min: 0, max: 0 }), // Fallback in case the role object is missing
                  [key]: numValue
              }
          }
      }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">שם המשמרת *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="למשל: משמרת בוקר"
            required
            className="bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_time">שעת התחלה *</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => handleChange('start_time', e.target.value)}
              required
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">שעת סיום *</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => handleChange('end_time', e.target.value)}
              required
              className="bg-white"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
          <Label>דרישות איוש</Label>
          <div className="space-y-4 p-4 border rounded-lg bg-white">
            {ROLES.map((role) => (
              <div key={role.value} className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={`${role.value}-min`} className="text-sm font-medium">
                    {role.label}
                  </Label>
                  <div className="space-y-1">
                     <Label htmlFor={`${role.value}-min`} className="text-xs">מינימום</Label>
                     <Input 
                        id={`${role.value}-min`} 
                        type="number" 
                        min="0"
                        value={formData.staffing_requirements[role.value]?.min || 0}
                        onChange={(e) => handleRequirementChange(role.value, 'min', e.target.value)}
                        className="bg-gray-50"
                     />
                  </div>
                   <div className="space-y-1">
                     <Label htmlFor={`${role.value}-max`} className="text-xs">מקסימום</Label>
                     <Input 
                        id={`${role.value}-max`} 
                        type="number" 
                        min="0"
                        value={formData.staffing_requirements[role.value]?.max || 0}
                        onChange={(e) => handleRequirementChange(role.value, 'max', e.target.value)}
                        className="bg-gray-50"
                     />
                  </div>
              </div>
            ))}
          </div>
        </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
          <Save className="w-4 h-4 ml-2" />
          {template ? 'עדכן' : 'שמור'}
        </Button>
      </div>
    </form>
  );
}
