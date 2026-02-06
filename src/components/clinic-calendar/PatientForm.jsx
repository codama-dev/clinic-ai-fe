import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, Upload, Camera } from "lucide-react";
import DateInput from "../shared/DateInput";

export default function PatientForm({ patient, clientId, clientName, clientNumber, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    client_number: clientNumber || patient?.client_number || null,
    client_name: clientName || patient?.client_name || '',
    name: patient?.name || '',
    species: patient?.species || '',
    breed: patient?.breed || '',
    sex: patient?.sex || '',
    neutered: patient?.neutered || false,
    neutered_date: patient?.neutered_date || '',
    date_of_birth: patient?.date_of_birth || '',
    weight: patient?.weight || '',
    microchip: patient?.microchip || '',
    microchip_date: patient?.microchip_date || '',
    color: patient?.color || '',
    description: patient?.description || '',
    photo_url: patient?.photo_url || '',
    allergies: patient?.allergies || '',
    chronic_conditions: patient?.chronic_conditions || '',
    current_medications: patient?.current_medications || '',
    is_insured: patient?.is_insured || false,
    insurance_company: patient?.insurance_company || '',
    insurance_policy: patient?.insurance_policy || '',
    status: patient?.status || 'active',
    inactive_reason: patient?.inactive_reason || '',
    notes: patient?.notes || ''
  });

  const [uploading, setUploading] = useState(false);

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }
    
    if (uploading) {
      alert('נא להמתין להשלמת העלאת התמונה');
      return;
    }
    
    // Clean numeric fields - convert empty strings to null
    const cleanedData = {
      ...formData,
      weight: formData.weight ? parseFloat(formData.weight) : null
    };
    
    onSubmit(cleanedData);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photo_url: file_url }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('שגיאה בהעלאת התמונה');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        {formData.photo_url ? (
          <div className="relative">
            <img src={formData.photo_url} alt={formData.name || 'תמונת מטופל'} className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
              onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">העלה תמונה</span>
              </div>
            </Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files[0])}
              disabled={uploading}
            />
            <Label htmlFor="photo-camera" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                <Camera className="w-4 h-4" />
                <span className="text-sm">צלם תמונה</span>
              </div>
            </Label>
            <Input
              id="photo-camera"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files[0])}
              disabled={uploading}
            />
          </div>
        )}
        {uploading && <span className="text-sm text-gray-500">מעלה תמונה...</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">שם החיה</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="הכנס שם"
          />
        </div>
        <div>
          <Label htmlFor="species">סוג החיה</Label>
          <Select 
            value={formData.species}
            onValueChange={(value) => setFormData(prev => ({ ...prev, species: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג" />
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sex">מין</Label>
          <Select 
            value={formData.sex}
            onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}
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
          <Label htmlFor="breed">גזע</Label>
          <Input
            id="breed"
            value={formData.breed}
            onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="neutered"
            checked={formData.neutered}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, neutered: checked }))}
          />
          <Label htmlFor="neutered" className="cursor-pointer">מעוקר/מסורס</Label>
        </div>
        {formData.neutered && (
          <div>
            <Label htmlFor="neutered_date">תאריך עיקור/סירוס</Label>
            <DateInput
              id="neutered_date"
              value={formData.neutered_date}
              onChange={(value) => setFormData(prev => ({ ...prev, neutered_date: value }))}
            />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="description">תיאור החיה</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date_of_birth">תאריך לידה</Label>
          <DateInput
            id="date_of_birth"
            value={formData.date_of_birth}
            onChange={(value) => setFormData(prev => ({ ...prev, date_of_birth: value }))}
          />
        </div>
        <div>
          <Label htmlFor="weight">משקל (ק"ג)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="microchip">מספר שבב</Label>
          <Input
            id="microchip"
            value={formData.microchip}
            onChange={(e) => setFormData(prev => ({ ...prev, microchip: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="microchip_date">תאריך ביצוע שבב</Label>
          <DateInput
            id="microchip_date"
            value={formData.microchip_date}
            onChange={(value) => setFormData(prev => ({ ...prev, microchip_date: value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="color">צבע/סימנים</Label>
        <Input
          id="color"
          value={formData.color}
          onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="allergies">אלרגיות ידועות</Label>
        <Textarea
          id="allergies"
          value={formData.allergies}
          onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="chronic_conditions">מחלות כרוניות</Label>
        <Textarea
          id="chronic_conditions"
          value={formData.chronic_conditions}
          onChange={(e) => setFormData(prev => ({ ...prev, chronic_conditions: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="current_medications">תרופות קבועות</Label>
        <Textarea
          id="current_medications"
          value={formData.current_medications}
          onChange={(e) => setFormData(prev => ({ ...prev, current_medications: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="is_insured"
            checked={formData.is_insured}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_insured: checked }))}
          />
          <Label htmlFor="is_insured" className="cursor-pointer">לקוח מבוטח</Label>
        </div>
        {formData.is_insured && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insurance_company">חברת ביטוח</Label>
              <Select 
                value={formData.insurance_company}
                onValueChange={(value) => setFormData(prev => ({ ...prev, insurance_company: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר חברה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="מרפאט">מרפאט</SelectItem>
                  <SelectItem value="חיותא">חיותא</SelectItem>
                  <SelectItem value="פניקס">פניקס</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="insurance_policy">מספר פוליסה</Label>
              <Input
                id="insurance_policy"
                value={formData.insurance_policy}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance_policy: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <Label htmlFor="status">סטטוס החיה</Label>
          <Select 
            value={formData.status}
            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">פעילה</SelectItem>
              <SelectItem value="inactive">לא פעילה</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.status === 'inactive' && (
          <div>
            <Label htmlFor="inactive_reason">סיבת חוסר פעילות</Label>
            <Select 
              value={formData.inactive_reason}
              onValueChange={(value) => setFormData(prev => ({ ...prev, inactive_reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סיבה" />
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

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button 
          type="submit" 
          disabled={uploading}
        >
          <Save className="w-4 h-4 ml-2" />
          {uploading ? 'מעלה תמונה...' : 'שמור'}
        </Button>
      </div>
    </form>
  );
}