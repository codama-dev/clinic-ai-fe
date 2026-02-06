import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import DateInput from "../shared/DateInput";

export default function VaccinationForm({ vaccination, clientId, clientName, patients, onSubmit, onCancel, currentUser }) {
  const [formData, setFormData] = useState({
    client_id: clientId || vaccination?.client_id || '',
    client_name: clientName || vaccination?.client_name || '',
    patient_id: vaccination?.patient_id || '',
    patient_name: vaccination?.patient_name || '',
    vaccination_type: vaccination?.vaccination_type || '',
    vaccination_date: vaccination?.vaccination_date || new Date().toISOString().split('T')[0],
    next_vaccination_date: vaccination?.next_vaccination_date || '',
    first_reminder_date: vaccination?.first_reminder_date || '',
    second_reminder_date: vaccination?.second_reminder_date || '',
    batch_number: vaccination?.batch_number || '',
    administered_by: vaccination?.administered_by || currentUser?.display_name || currentUser?.full_name || '',
    notes: vaccination?.notes || ''
  });

  const { data: vaccinationTypes = [] } = useQuery({
    queryKey: ['vaccinationTypes'],
    queryFn: async () => {
      const types = await base44.entities.VaccinationType.filter({ is_active: true });
      return types;
    }
  });

  const handlePatientChange = (patientId) => {
    const selectedPatient = patients.find(p => p.id === patientId);
    setFormData({
      ...formData,
      patient_id: patientId,
      patient_name: selectedPatient?.name || ''
    });
  };

  const handleVaccinationTypeChange = (typeName) => {
    const selectedType = vaccinationTypes.find(t => t.name === typeName);
    const newFormData = { ...formData, vaccination_type: typeName };
    
    if (selectedType && selectedType.default_interval_days && formData.vaccination_date) {
      const vaccDate = new Date(formData.vaccination_date);
      const nextDate = new Date(vaccDate);
      nextDate.setDate(nextDate.getDate() + selectedType.default_interval_days);
      newFormData.next_vaccination_date = nextDate.toISOString().split('T')[0];
      
      if (selectedType.first_reminder_days_before) {
        const firstReminder = new Date(nextDate);
        firstReminder.setDate(firstReminder.getDate() - selectedType.first_reminder_days_before);
        newFormData.first_reminder_date = firstReminder.toISOString().split('T')[0];
      }
      
      if (selectedType.second_reminder_days_before) {
        const secondReminder = new Date(nextDate);
        secondReminder.setDate(secondReminder.getDate() - selectedType.second_reminder_days_before);
        newFormData.second_reminder_date = secondReminder.toISOString().split('T')[0];
      }
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.vaccination_type || !formData.vaccination_date) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="patient_id">מטופל *</Label>
        <Select value={formData.patient_id} onValueChange={handlePatientChange} required>
          <SelectTrigger>
            <SelectValue placeholder="בחר מטופל" />
          </SelectTrigger>
          <SelectContent>
            {patients.map(patient => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.name} ({patient.species})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="vaccination_type">סוג החיסון/טיפול *</Label>
        <Select value={formData.vaccination_type} onValueChange={handleVaccinationTypeChange} required>
          <SelectTrigger>
            <SelectValue placeholder="בחר סוג חיסון" />
          </SelectTrigger>
          <SelectContent>
            {vaccinationTypes.map(type => (
              <SelectItem key={type.id} value={type.name}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="vaccination_date">תאריך מתן החיסון *</Label>
        <DateInput
          id="vaccination_date"
          value={formData.vaccination_date}
          onChange={(value) => setFormData({ ...formData, vaccination_date: value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="next_vaccination_date">מועד הבא לחיסון</Label>
        <DateInput
          id="next_vaccination_date"
          value={formData.next_vaccination_date}
          onChange={(value) => setFormData({ ...formData, next_vaccination_date: value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_reminder_date">תזכורת ראשונה</Label>
          <DateInput
            id="first_reminder_date"
            value={formData.first_reminder_date}
            onChange={(value) => setFormData({ ...formData, first_reminder_date: value })}
          />
        </div>

        <div>
          <Label htmlFor="second_reminder_date">תזכורת שנייה</Label>
          <DateInput
            id="second_reminder_date"
            value={formData.second_reminder_date}
            onChange={(value) => setFormData({ ...formData, second_reminder_date: value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="batch_number">מספר אצווה</Label>
        <Input
          id="batch_number"
          value={formData.batch_number}
          onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
          placeholder="מס' אצווה"
        />
      </div>

      <div>
        <Label htmlFor="administered_by">מבצע</Label>
        <Input
          id="administered_by"
          value={formData.administered_by}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="הערות נוספות..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 ml-2" />
          {vaccination ? 'עדכן' : 'שמור'}
        </Button>
      </div>
    </form>
  );
}