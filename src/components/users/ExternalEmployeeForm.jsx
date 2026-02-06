
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";

const JOBS = [
    { value: "doctor", label: "רופא/ה" },
    { value: "assistant", label: "אסיסטנט/ית" },
    { value: "receptionist", label: "קבלה" },
];

export default function ExternalEmployeeForm({ employee, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    job: "assistant",
  });

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">שם מלא</Label>
        <Input 
            id="name" 
            value={formData.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
            required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="job">תפקיד</Label>
        <Select value={formData.job} onValueChange={(value) => handleChange('job', value)}>
            <SelectTrigger><SelectValue placeholder="בחר תפקיד" /></SelectTrigger>
            <SelectContent>
                {JOBS.map((j) => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 ml-2" />
            ביטול
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 ml-2" />
            {employee ? 'עדכן עובד' : 'הוסף עובד'}
        </Button>
      </div>
    </form>
  );
}
