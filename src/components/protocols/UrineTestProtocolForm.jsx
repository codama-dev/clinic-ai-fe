import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Save, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

// Define the test parameters and their possible values
const TEST_PARAMETERS = [
  { name: 'LEU', values: ['-', '+', '++', '+++', '++++'] },
  { name: 'URB', values: ['-', '+', '++', '+++', '++++'] },
  { name: 'BILI', values: ['-', '+', '++', '+++', '++++'] },
  { name: 'Blood', values: ['-', '+', '++', '+++', '++++'] },
  { name: 'NITRI', values: ['-', '+', '++', '+++', '++++'] },
  { name: 'PH', values: ['5', '6', '7', '8', '9'] },
  { name: 'PROTEIN', values: ['-', 'TRACE', '++', '+++', '++++'] },
  { name: 'GLU', values: ['-', '+', '++', '+++', '++++'] },
  { name: 'KETONES', values: ['-', 'TRACE', '++', '+++', '++++'] },
];

export default function UrineTestProtocolForm({ protocol, onSubmit, onCancel, readOnly, currentUser, onPartialSave }) {
  const [formData, setFormData] = useState({
    animal_name: protocol?.data?.animal_name || '',
    test_date: protocol?.data?.test_date || new Date().toISOString().split('T')[0],
    animal_owner: protocol?.data?.animal_owner || '',
    animal_type: protocol?.data?.animal_type || '',
    sample_method: protocol?.data?.sample_method || { hatala: false, catheter: false, cystocentesis: false },
    color: protocol?.data?.color || '',
    sg: protocol?.data?.sg || '',
    test_values: protocol?.data?.test_values || {},
    sediment_findings: protocol?.data?.sediment_findings || '',
  });

  const [protocolTimestamp] = useState(protocol?.created_date || new Date().toISOString());
  const autoSaveTimerRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    triggerAutoSave({ ...formData, [field]: value });
  };

  const handleSampleMethodChange = (method, checked) => {
    const newSampleMethod = { ...formData.sample_method, [method]: checked };
    setFormData(prev => ({ ...prev, sample_method: newSampleMethod }));
    triggerAutoSave({ ...formData, sample_method: newSampleMethod });
  };

  const handleTestValueClick = (paramName, value) => {
    if (readOnly) return;
    
    const newTestValues = { ...formData.test_values };
    // Toggle selection: if already selected, deselect; otherwise, select
    if (newTestValues[paramName] === value) {
      delete newTestValues[paramName];
    } else {
      newTestValues[paramName] = value;
    }
    
    setFormData(prev => ({ ...prev, test_values: newTestValues }));
    triggerAutoSave({ ...formData, test_values: newTestValues });
  };

  const triggerAutoSave = (currentFormData) => {
    if (readOnly || !onPartialSave) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      onPartialSave(currentFormData);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const protocolData = {
      data: formData,
      patient_name: formData.animal_name || 'בדיקת שתן',
      filled_by_name: currentUser?.display_name || currentUser?.full_name || currentUser?.email,
    };

    onSubmit(protocolData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* Protocol Timestamp */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-blue-900">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">תאריך ושעת פתיחת הפרוטוקול:</span>
            <span className="font-bold">
              {new Date(protocolTimestamp).toLocaleString('he-IL', { 
                timeZone: 'Asia/Jerusalem',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">בדיקת שתן</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="animal_name">שם החיה *</Label>
              <Input
                id="animal_name"
                value={formData.animal_name}
                onChange={(e) => handleChange('animal_name', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>
            <div>
              <Label htmlFor="test_date">תאריך בדיקה</Label>
              <Input
                id="test_date"
                type="date"
                value={formData.test_date}
                onChange={(e) => handleChange('test_date', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="animal_owner">שם הבעלים</Label>
              <Input
                id="animal_owner"
                value={formData.animal_owner}
                onChange={(e) => handleChange('animal_owner', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="animal_type">סוג החיה</Label>
              <Input
                id="animal_type"
                value={formData.animal_type}
                onChange={(e) => handleChange('animal_type', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Collection Method */}
      <Card>
        <CardHeader>
          <CardTitle>כיצד נלקחה הדגימה?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hatala"
                checked={formData.sample_method.hatala}
                onCheckedChange={(checked) => handleSampleMethodChange('hatala', checked)}
                disabled={readOnly}
              />
              <Label htmlFor="hatala" className="cursor-pointer">הטלה</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="catheter"
                checked={formData.sample_method.catheter}
                onCheckedChange={(checked) => handleSampleMethodChange('catheter', checked)}
                disabled={readOnly}
              />
              <Label htmlFor="catheter" className="cursor-pointer">קטטר שתן</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cystocentesis"
                checked={formData.sample_method.cystocentesis}
                onCheckedChange={(checked) => handleSampleMethodChange('cystocentesis', checked)}
                disabled={readOnly}
              />
              <Label htmlFor="cystocentesis" className="cursor-pointer">ציסטוצנטזיס</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color and SG */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">צבע:</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="sg">SG:</Label>
              <Input
                id="sg"
                value={formData.sg}
                onChange={(e) => handleChange('sg', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Values Table */}
      <Card>
        <CardHeader>
          <CardTitle>ערכי בדיקה</CardTitle>
          {!readOnly && (
            <p className="text-sm text-gray-600">לחץ על התא לבחירת הערך המתאים</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-right font-bold">פרמטר</th>
                  {TEST_PARAMETERS[0].values.map((val, idx) => (
                    <th key={idx} className="border border-gray-300 p-2 text-center font-bold">{val}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TEST_PARAMETERS.map((param) => (
                  <tr key={param.name} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 font-semibold">{param.name}</td>
                    {param.values.map((value, idx) => {
                      const isSelected = formData.test_values[param.name] === value;
                      return (
                        <td
                          key={idx}
                          className={`border border-gray-300 p-2 text-center ${
                            !readOnly ? 'cursor-pointer hover:bg-blue-100' : ''
                          } ${isSelected ? 'bg-blue-500 text-white font-bold' : ''}`}
                          onClick={() => handleTestValueClick(param.name, value)}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sediment Findings */}
      <Card>
        <CardHeader>
          <CardTitle>ממצאים במשקע:</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.sediment_findings}
            onChange={(e) => handleChange('sediment_findings', e.target.value)}
            disabled={readOnly}
            rows={5}
            placeholder="הזן ממצאים במשקע..."
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 ml-2" />
            ביטול
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 ml-2" />
            שמור פרוטוקול
          </Button>
        </div>
      )}
    </form>
  );
}