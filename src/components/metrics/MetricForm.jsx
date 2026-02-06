import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DateInput from "../shared/DateInput";

export default function MetricForm({ patients, clientId, onSubmit, onCancel, metric, currentUser }) {
  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    client_id: clientId,
    measurement_date: new Date().toISOString().split('T')[0],
    measurement_time: new Date().toTimeString().slice(0, 5),
    weight: "",
    temperature: "",
    heart_rate: "",
    respiratory_rate: "",
    blood_pressure_systolic: "",
    blood_pressure_diastolic: "",
    notes: "",
    measured_by: currentUser?.display_name || currentUser?.full_name || ""
  });

  useEffect(() => {
    if (metric) {
      setFormData(metric);
    } else if (currentUser) {
      setFormData(prev => ({
        ...prev,
        measured_by: currentUser.display_name || currentUser.full_name || ""
      }));
    }
  }, [metric, currentUser]);

  const handlePatientChange = (patientId) => {
    const selectedPatient = patients.find(p => p.id === patientId);
    setFormData({
      ...formData,
      patient_id: patientId,
      patient_name: selectedPatient?.name || ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert empty strings to null, but keep all fields
    const cleanData = { ...formData };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === "") {
        cleanData[key] = null;
      }
    });

    onSubmit(cleanData);
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="measurement_date">תאריך מדידה *</Label>
          <DateInput
            id="measurement_date"
            value={formData.measurement_date}
            onChange={(value) => setFormData({ ...formData, measurement_date: value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="measurement_time">שעת מדידה</Label>
          <Input
            id="measurement_time"
            type="time"
            value={formData.measurement_time}
            onChange={(e) => setFormData({ ...formData, measurement_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weight">משקל (ק"ג)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="0.0"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="temperature">טמפרטורה (°C)</Label>
          <Input
            id="temperature"
            type="number"
            step="0.1"
            placeholder="37.5"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="heart_rate">קצב לב (פעימות לדקה)</Label>
          <Input
            id="heart_rate"
            type="number"
            placeholder="80"
            value={formData.heart_rate}
            onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="respiratory_rate">קצב נשימות (נשימות לדקה)</Label>
          <Input
            id="respiratory_rate"
            type="number"
            placeholder="20"
            value={formData.respiratory_rate}
            onChange={(e) => setFormData({ ...formData, respiratory_rate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="blood_pressure_systolic">לחץ דם סיסטולי</Label>
          <Input
            id="blood_pressure_systolic"
            type="number"
            placeholder="120"
            value={formData.blood_pressure_systolic}
            onChange={(e) => setFormData({ ...formData, blood_pressure_systolic: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="blood_pressure_diastolic">לחץ דם דיאסטולי</Label>
          <Input
            id="blood_pressure_diastolic"
            type="number"
            placeholder="80"
            value={formData.blood_pressure_diastolic}
            onChange={(e) => setFormData({ ...formData, blood_pressure_diastolic: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="measured_by">נמדד על ידי</Label>
        <Input
          id="measured_by"
          value={formData.measured_by}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          placeholder="הערות נוספות..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit">
          {metric ? 'עדכן' : 'שמור'}
        </Button>
      </div>
    </form>
  );
}