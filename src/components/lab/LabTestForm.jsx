import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import DateInput from "../shared/DateInput";

export default function LabTestForm({ patients, clientId, clientName, currentUser, labTest, selectedTestData, onSubmit, onCancel }) {
  const firstPatient = patients?.[0];
  const [formData, setFormData] = useState({
    client_number: labTest?.client_number || firstPatient?.client_number || null,
    client_name: clientName,
    patient_number: labTest?.patient_number || null,
    patient_name: labTest?.patient_name || '',
    test_type_id: labTest?.test_type_id || '',
    test_name: labTest?.test_name || selectedTestData?.test_name || '',
    test_date: labTest?.test_date || new Date().toISOString().split('T')[0],
    results: labTest?.results || {},
    performed_by: labTest?.performed_by || currentUser?.display_name || currentUser?.full_name || '',
    notes: labTest?.notes || selectedTestData?.notes || '',
    status: labTest?.status || 'completed'
  });

  const [selectedTestType, setSelectedTestType] = useState(null);
  const [expandedParams, setExpandedParams] = useState({});

  const { data: labTestTypes = [] } = useQuery({
    queryKey: ['labTestTypes'],
    queryFn: () => base44.entities.LabTestType.list('-created_date', 100)
  });

  const activeLabTestTypes = labTestTypes.filter(t => t.is_active !== false);

  useEffect(() => {
    if (formData.test_type_id) {
      const testType = labTestTypes.find(t => t.id === formData.test_type_id);
      setSelectedTestType(testType);
      
      // Initialize results with empty values if not editing
      if (!labTest && testType) {
        const initialResults = {};
        testType.parameters?.forEach(param => {
          initialResults[param.name] = '';
        });
        setFormData(prev => ({ ...prev, results: initialResults }));
      }
    }
  }, [formData.test_type_id, labTestTypes, labTest]);

  const handleTestTypeChange = (testTypeId) => {
    const testType = labTestTypes.find(t => t.id === testTypeId);
    setFormData({
      ...formData,
      test_type_id: testTypeId,
      test_name: testType?.name || '',
      results: {}
    });
  };

  const handlePatientChange = (patientNumber) => {
    const patient = patients.find(p => p.patient_number === parseInt(patientNumber));
    setFormData({
      ...formData,
      client_number: patient?.client_number || null,
      patient_number: patient?.patient_number || null,
      patient_name: patient?.name || ''
    });
  };

  const handleResultChange = (paramName, value) => {
    setFormData({
      ...formData,
      results: {
        ...formData.results,
        [paramName]: value
      }
    });
  };

  const toggleParamExpanded = (paramName) => {
    setExpandedParams(prev => ({
      ...prev,
      [paramName]: !prev[paramName]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.patient_number || !formData.test_type_id) {
      toast.error('נא לבחור מטופל וסוג בדיקה');
      return;
    }

    onSubmit(formData);
  };

  const getValuePosition = (value, min, max) => {
    if (!value || !min || !max) return 0;
    const numValue = parseFloat(value);
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);
    
    if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) return 0;
    
    const range = numMax - numMin;
    const position = ((numValue - numMin) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const isOutOfRange = (value, min, max) => {
    if (!value || !min || !max) return false;
    const numValue = parseFloat(value);
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);
    
    if (isNaN(numValue)) return false;
    
    return numValue < numMin || numValue > numMax;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="patient_id">מטופל *</Label>
          <Select value={formData.patient_number?.toString()} onValueChange={handlePatientChange} required>
            <SelectTrigger>
              <SelectValue placeholder="בחר מטופל" />
            </SelectTrigger>
            <SelectContent>
              {patients.map(patient => (
                <SelectItem key={patient.id} value={patient.patient_number?.toString()}>
                  {patient.name} ({patient.species})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="test_date">תאריך הבדיקה *</Label>
          <DateInput
            id="test_date"
            value={formData.test_date}
            onChange={(value) => setFormData({ ...formData, test_date: value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="test_type">סוג הבדיקה *</Label>
        <Select value={formData.test_type_id} onValueChange={handleTestTypeChange} required>
          <SelectTrigger>
            <SelectValue placeholder="בחר סוג בדיקה" />
          </SelectTrigger>
          <SelectContent>
            {activeLabTestTypes.map(testType => (
              <SelectItem key={testType.id} value={testType.id}>
                {testType.name}
                {testType.parameters && ` (${testType.parameters.length} פרמטרים)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTestType && selectedTestType.parameters && selectedTestType.parameters.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-3 text-lg">תוצאות הבדיקה</h3>
          <div className="space-y-3">
            {selectedTestType.parameters.map((param, idx) => {
              const value = formData.results[param.name] || '';
              const hasRange = param.min_normal !== undefined && param.max_normal !== undefined;
              const outOfRange = isOutOfRange(value, param.min_normal, param.max_normal);
              
              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border ${outOfRange ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="flex-1 font-semibold text-base">
                      {param.name}
                      {param.unit && <span className="text-gray-500 font-normal text-sm ml-1">({param.unit})</span>}
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={value}
                      onChange={(e) => handleResultChange(param.name, e.target.value)}
                      placeholder="ערך"
                      className={`w-28 text-center font-semibold ${outOfRange ? 'border-red-500 text-red-700' : ''}`}
                    />
                  </div>

                  {hasRange && (
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>טווח תקין: {param.min_normal} - {param.max_normal}</span>
                        {outOfRange && (
                          <span className="text-red-600 font-semibold">⚠ חריג מהנורמה</span>
                        )}
                      </div>
                      
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        {/* Normal range bar */}
                        <div className="absolute top-0 left-0 right-0 h-full bg-green-300"></div>
                        
                        {/* Min/Max labels */}
                        <div className="absolute top-0 left-0 bottom-0 flex items-center px-2 text-xs font-semibold text-gray-700">
                          {param.min_normal}
                        </div>
                        <div className="absolute top-0 right-0 bottom-0 flex items-center px-2 text-xs font-semibold text-gray-700">
                          {param.max_normal}
                        </div>
                        
                        {/* Value indicator */}
                        {value && (
                          <div
                            className="absolute top-0 bottom-0 w-1"
                            style={{
                              left: `${getValuePosition(value, param.min_normal, param.max_normal)}%`,
                              backgroundColor: outOfRange ? '#ef4444' : '#1e40af',
                              transform: 'translateX(-50%)'
                            }}
                          >
                            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                              outOfRange ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                            }`}>
                              {value}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="הערות נוספות על הבדיקה..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit">
          {labTest ? 'עדכן בדיקה' : 'שמור בדיקה'}
        </Button>
      </div>
    </form>
  );
}