import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'פעם ביום', label: 'פעם ביום' },
  { value: 'פעמיים ביום', label: 'פעמיים ביום' },
  { value: 'שלוש פעמים ביום', label: 'שלוש פעמים ביום' },
];

const ROUTE_OPTIONS = [
  { value: 'דרך הפה (OS)', label: 'דרך הפה (OS)' },
  { value: 'תת עורי (SC)', label: 'תת עורי (SC)' },
  { value: 'תוך ורידי (IV)', label: 'תוך ורידי (IV)' },
  { value: 'תוך ורידי איטי (SIV)', label: 'תוך ורידי איטי (SIV)' },
  { value: 'מריחה', label: 'מריחה' },
];

export default function EditInstructionDialog({ open, onOpenChange, instruction, onSave }) {
  const [formData, setFormData] = useState({
    medication_name: instruction?.medication_name || '',
    dosage: instruction?.dosage || '',
    frequency: instruction?.frequency || '',
    route: instruction?.route || '',
    notes: instruction?.notes || ''
  });

  React.useEffect(() => {
    if (instruction) {
      setFormData({
        medication_name: instruction.medication_name || '',
        dosage: instruction.dosage || '',
        frequency: instruction.frequency || '',
        route: instruction.route || '',
        notes: instruction.notes || ''
      });
    }
  }, [instruction]);

  const handleSave = () => {
    if (!formData.medication_name || !formData.dosage || !formData.frequency) {
      alert('יש למלא שם תרופה, מינון ותדירות');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת הנחיית טיפול</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>שם התרופה / טיפול *</Label>
            <Input
              value={formData.medication_name}
              onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
              placeholder="שם התרופה"
            />
          </div>

          <div>
            <Label>מינון *</Label>
            <Input
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              placeholder="לדוגמה: 250mg"
            />
          </div>

          <div>
            <Label>תדירות *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר תדירות" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>דרך מתן</Label>
            <Select
              value={formData.route}
              onValueChange={(value) => setFormData({ ...formData, route: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר דרך מתן" />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>הערות נוספות</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות חשובות לגבי הטיפול..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 ml-2" />
            ביטול
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 ml-2" />
            שמור שינויים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}