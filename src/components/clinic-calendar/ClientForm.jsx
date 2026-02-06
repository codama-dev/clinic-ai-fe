import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Trash2, PawPrint, Upload, Camera } from "lucide-react";

export default function ClientForm({ client, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: client?.full_name || '',
    phone: client?.phone || '',
    phone_secondary: client?.phone_secondary || '',
    email: client?.email || '',
    address: client?.address || '',
    city: client?.city || '',
    id_number: client?.id_number || '',
    notes: client?.notes || '',
    status: client?.status || 'active',
    marketing_consent: client?.marketing_consent || false,
    reminders_consent: client?.reminders_consent !== undefined ? client.reminders_consent : true,
    preferred_contact: client?.preferred_contact || 'sms',
    balance: client?.balance || 0
  });

  const [pendingPatients, setPendingPatients] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, pendingPatients);
  };

  const handleAddPatient = () => {
    setPendingPatients([...pendingPatients, {
      tempId: Date.now(),
      name: '',
      species: 'כלב',
      sex: 'זכר',
      neutered: false,
      status: 'active',
      is_insured: false,
      insurance_company: ''
    }]);
  };

  const handleRemovePatient = (tempId) => {
    setPendingPatients(pendingPatients.filter(p => p.tempId !== tempId));
  };

  const handlePatientChange = (tempId, field, value) => {
    setPendingPatients(pendingPatients.map(p => 
      p.tempId === tempId ? { ...p, [field]: value } : p
    ));
  };

  const handleImageUpload = async (tempId, file) => {
    if (!file) return;
    
    try {
      handlePatientChange(tempId, 'uploading', true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handlePatientChange(tempId, 'photo_url', file_url);
      handlePatientChange(tempId, 'uploading', false);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('שגיאה בהעלאת התמונה');
      handlePatientChange(tempId, 'uploading', false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="full_name">שם מלא</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="phone">טלפון</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone_secondary">טלפון נוסף</Label>
          <Input
            id="phone_secondary"
            value={formData.phone_secondary}
            onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="email">אימייל</Label>
          <Input
            id="email"
            type="text"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">עיר</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="id_number">תעודת זהות</Label>
          <Input
            id="id_number"
            value={formData.id_number}
            onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">רחוב</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="preferred_contact">אמצעי קבלת תזכורות</Label>
        <Select 
          value={formData.preferred_contact}
          onValueChange={(value) => setFormData({ ...formData, preferred_contact: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="reminders_consent"
          checked={formData.reminders_consent}
          onCheckedChange={(checked) => setFormData({ ...formData, reminders_consent: checked })}
        />
        <Label htmlFor="reminders_consent" className="cursor-pointer">הסכמה לקבלת תזכורות</Label>
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      {!client && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-green-600" />
                מטופלים (אופציונלי)
              </CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={handleAddPatient}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף מטופל
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingPatients.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">ניתן להוסיף מטופלים עכשיו או מאוחר יותר</p>
            ) : (
              <div className="space-y-3">
                {pendingPatients.map((patient, index) => (
                  <div key={patient.tempId} className="p-3 bg-white rounded border space-y-2">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="outline">מטופל {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 mr-auto"
                        onClick={() => handleRemovePatient(patient.tempId)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {patient.photo_url ? (
                        <div className="relative">
                          <img src={patient.photo_url} alt={patient.name} className="w-20 h-20 rounded-lg object-cover" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
                            onClick={() => handlePatientChange(patient.tempId, 'photo_url', '')}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Label htmlFor={`photo-${patient.tempId}`} className="cursor-pointer">
                            <div className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">העלה תמונה</span>
                            </div>
                          </Label>
                          <Input
                            id={`photo-${patient.tempId}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(patient.tempId, e.target.files[0])}
                            disabled={patient.uploading}
                          />
                          <Label htmlFor={`camera-${patient.tempId}`} className="cursor-pointer">
                            <div className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50">
                              <Camera className="w-4 h-4" />
                              <span className="text-sm">צלם</span>
                            </div>
                          </Label>
                          <Input
                            id={`camera-${patient.tempId}`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleImageUpload(patient.tempId, e.target.files[0])}
                            disabled={patient.uploading}
                          />
                        </div>
                      )}
                      {patient.uploading && <span className="text-sm text-gray-500">מעלה...</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="שם החיה"
                        value={patient.name}
                        onChange={(e) => handlePatientChange(patient.tempId, 'name', e.target.value)}
                      />
                      <Select
                        value={patient.species}
                        onValueChange={(value) => handlePatientChange(patient.tempId, 'species', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="כלב">כלב</SelectItem>
                          <SelectItem value="חתול">חתול</SelectItem>
                          <SelectItem value="ארנב">ארנב</SelectItem>
                          <SelectItem value="תוכי">תוכי</SelectItem>
                          <SelectItem value="חמוס">חמוס</SelectItem>
                          <SelectItem value="שרקן">שרקן</SelectItem>
                          <SelectItem value="אחר">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={patient.sex}
                        onValueChange={(value) => handlePatientChange(patient.tempId, 'sex', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="זכר">זכר</SelectItem>
                          <SelectItem value="נקבה">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="גזע"
                        value={patient.breed || ''}
                        onChange={(e) => handlePatientChange(patient.tempId, 'breed', e.target.value)}
                      />
                      
                      <Input
                        placeholder="תאריך לידה"
                        type="date"
                        value={patient.date_of_birth || ''}
                        onChange={(e) => handlePatientChange(patient.tempId, 'date_of_birth', e.target.value)}
                      />
                      <Input
                        placeholder="משקל (ק״ג)"
                        type="number"
                        step="0.1"
                        value={patient.weight || ''}
                        onChange={(e) => handlePatientChange(patient.tempId, 'weight', e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`neutered-${patient.tempId}`}
                          checked={patient.neutered}
                          onCheckedChange={(checked) => handlePatientChange(patient.tempId, 'neutered', checked)}
                        />
                        <Label htmlFor={`neutered-${patient.tempId}`} className="cursor-pointer text-sm">מעוקר/מסורס</Label>
                      </div>
                      {patient.neutered && (
                        <Input
                          placeholder="תאריך עיקור"
                          type="date"
                          className="w-40"
                          value={patient.neutered_date || ''}
                          onChange={(e) => handlePatientChange(patient.tempId, 'neutered_date', e.target.value)}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="מספר שבב"
                        value={patient.microchip || ''}
                        onChange={(e) => handlePatientChange(patient.tempId, 'microchip', e.target.value)}
                      />
                      <Input
                        placeholder="תאריך שבב"
                        type="date"
                        value={patient.microchip_date || ''}
                        onChange={(e) => handlePatientChange(patient.tempId, 'microchip_date', e.target.value)}
                      />
                    </div>

                    <Textarea
                      placeholder="תיאור החיה"
                      value={patient.description || ''}
                      onChange={(e) => handlePatientChange(patient.tempId, 'description', e.target.value)}
                      rows={2}
                    />

                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`insured-${patient.tempId}`}
                            checked={patient.is_insured}
                            onCheckedChange={(checked) => {
                              handlePatientChange(patient.tempId, 'is_insured', checked);
                              if (!checked) {
                                handlePatientChange(patient.tempId, 'insurance_company', '');
                              }
                            }}
                          />
                          <Label htmlFor={`insured-${patient.tempId}`} className="cursor-pointer text-sm">מבוטח</Label>
                        </div>
                        {patient.is_insured && (
                          <div>
                            <Label className="text-xs text-gray-600">חברת ביטוח</Label>
                            <Select
                              value={patient.insurance_company || 'מרפאט'}
                              onValueChange={(value) => handlePatientChange(patient.tempId, 'insurance_company', value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="מרפאט">מרפאט</SelectItem>
                                <SelectItem value="חיותא">חיותא</SelectItem>
                                <SelectItem value="פניקס">פניקס</SelectItem>
                                <SelectItem value="אחר">אחר</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={patient.status || 'active'}
                          onValueChange={(value) => {
                            handlePatientChange(patient.tempId, 'status', value);
                            if (value === 'active') {
                              handlePatientChange(patient.tempId, 'inactive_reason', '');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">פעילה</SelectItem>
                            <SelectItem value="inactive">לא פעילה</SelectItem>
                          </SelectContent>
                        </Select>
                        {patient.status === 'inactive' && (
                          <div>
                            <Label className="text-xs text-gray-600">סיבה</Label>
                            <Select
                              value={patient.inactive_reason || 'נפטרה'}
                              onValueChange={(value) => handlePatientChange(patient.tempId, 'inactive_reason', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="נפטרה">נפטרה</SelectItem>
                                <SelectItem value="אבדה">אבדה</SelectItem>
                                <SelectItem value="עברה בעלים">עברה בעלים</SelectItem>
                                <SelectItem value="אחר">אחר</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    <Textarea
                      placeholder="הערות"
                      value={patient.notes || ''}
                      onChange={(e) => handlePatientChange(patient.tempId, 'notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 ml-2" />
          {!client && pendingPatients.length > 0 ? `שמור לקוח + ${pendingPatients.length} מטופלים` : 'שמור'}
        </Button>
      </div>
    </form>
  );
}