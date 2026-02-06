import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const PROCEDURE_TYPES = ['עיקור', 'סירוס', 'שיניים', 'אחר'];

export default function SurgeryProtocolForm({ protocol, onSubmit, onCancel, readOnly, currentUser, onPartialSave }) {
  const [organizationData, setOrganizationData] = useState({
    organization_name: protocol?.data?.organization_name || '',
    organization_number: protocol?.data?.organization_number || '',
    contact_person: protocol?.data?.contact_person || '',
    contact_phone: protocol?.data?.contact_phone || '',
  });

  const [procedures, setProcedures] = useState(protocol?.data?.procedures || []);
  const [protocolTimestamp] = useState(protocol?.created_date || new Date().toISOString());
  const autoSaveTimerRef = useRef(null);

  const handleOrganizationChange = (field, value) => {
    const updatedOrgData = { ...organizationData, [field]: value };
    setOrganizationData(updatedOrgData);
    triggerAutoSave(updatedOrgData, procedures);
  };

  const addProcedure = () => {
    const newProcedure = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      procedure_type: '',
      animal_name: '',
      gender: '',
      description: '',
      capture_location: '',
      ear_marking: false,
      pain_relief: 'no',
      pain_relief_details: '',
    };
    const updatedProcedures = [...procedures, newProcedure];
    setProcedures(updatedProcedures);
    triggerAutoSave(organizationData, updatedProcedures);
  };

  const removeProcedure = (id) => {
    const updatedProcedures = procedures.filter(p => p.id !== id);
    setProcedures(updatedProcedures);
    triggerAutoSave(organizationData, updatedProcedures);
  };

  const updateProcedure = (id, field, value) => {
    const updatedProcedures = procedures.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    setProcedures(updatedProcedures);
    triggerAutoSave(organizationData, updatedProcedures);
  };

  const triggerAutoSave = (currentOrgData, currentProcedures) => {
    if (readOnly || !onPartialSave) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      const formData = {
        organization_name: currentOrgData.organization_name,
        organization_number: currentOrgData.organization_number,
        contact_person: currentOrgData.contact_person,
        contact_phone: currentOrgData.contact_phone,
        procedures: currentProcedures,
      };
      onPartialSave(formData);
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
      data: {
        organization_name: organizationData.organization_name,
        organization_number: organizationData.organization_number,
        contact_person: organizationData.contact_person,
        contact_phone: organizationData.contact_phone,
        procedures: procedures,
      },
      patient_name: organizationData.organization_name || 'פרוטוקול חדר ניתוח',
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

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>פרטי עמותה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="org-name">שם העמותה *</Label>
              <Input
                id="org-name"
                value={organizationData.organization_name}
                onChange={(e) => handleOrganizationChange('organization_name', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>
            <div>
              <Label htmlFor="org-number">מספר עמותה</Label>
              <Input
                id="org-number"
                value={organizationData.organization_number}
                onChange={(e) => handleOrganizationChange('organization_number', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="contact-person">איש קשר</Label>
              <Input
                id="contact-person"
                value={organizationData.contact_person}
                onChange={(e) => handleOrganizationChange('contact_person', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">טלפון</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={organizationData.contact_phone}
                onChange={(e) => handleOrganizationChange('contact_phone', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surgical Procedures */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>פרוצדורות ניתוחיות</CardTitle>
            {!readOnly && (
              <Button type="button" onClick={addProcedure} size="sm">
                <Plus className="w-4 h-4 ml-2" />
                הוסף פרוצדורה
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {procedures.length === 0 ? (
            <p className="text-center text-gray-500 py-6">לא נוספו פרוצדורות עדיין</p>
          ) : (
            procedures.map((procedure, index) => (
              <Card key={procedure.id} className="border-2 border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-purple-900">פרוצדורה #{index + 1}</span>
                      <div className="flex items-center gap-2 text-sm text-purple-700">
                        <Clock className="w-4 h-4" />
                        {format(new Date(procedure.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProcedure(procedure.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>סוג פרוצדורה *</Label>
                      <Select
                        value={procedure.procedure_type}
                        onValueChange={(value) => updateProcedure(procedure.id, 'procedure_type', value)}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג פרוצדורה" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROCEDURE_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>שם החיה</Label>
                      <Input
                        value={procedure.animal_name}
                        onChange={(e) => updateProcedure(procedure.id, 'animal_name', e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                    <div>
                      <Label>מין</Label>
                      <Select
                        value={procedure.gender}
                        onValueChange={(value) => updateProcedure(procedure.id, 'gender', value)}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מין" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="זכר">זכר</SelectItem>
                          <SelectItem value="נקבה">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>מקום לכידה</Label>
                      <Input
                        value={procedure.capture_location}
                        onChange={(e) => updateProcedure(procedure.id, 'capture_location', e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>תיאור</Label>
                    <Textarea
                      value={procedure.description}
                      onChange={(e) => updateProcedure(procedure.id, 'description', e.target.value)}
                      disabled={readOnly}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`ear-marking-${procedure.id}`}
                        checked={procedure.ear_marking}
                        onCheckedChange={(checked) => updateProcedure(procedure.id, 'ear_marking', checked)}
                        disabled={readOnly}
                      />
                      <Label htmlFor={`ear-marking-${procedure.id}`} className="font-normal cursor-pointer">
                        סימון אוזן
                      </Label>
                    </div>

                    <div className="flex items-center gap-4 flex-1">
                      <Label>האם ניתן שיכוך?</Label>
                      <Select
                        value={procedure.pain_relief}
                        onValueChange={(value) => {
                          updateProcedure(procedure.id, 'pain_relief', value);
                          if (value === 'no') {
                            updateProcedure(procedure.id, 'pain_relief_details', '');
                          }
                        }}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">לא</SelectItem>
                          <SelectItem value="yes">כן</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {procedure.pain_relief === 'yes' && (
                    <div>
                      <Label>פרטי השיכוך</Label>
                      <Input
                        value={procedure.pain_relief_details}
                        onChange={(e) => updateProcedure(procedure.id, 'pain_relief_details', e.target.value)}
                        disabled={readOnly}
                        placeholder="תאר את השיכוך שניתן..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
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