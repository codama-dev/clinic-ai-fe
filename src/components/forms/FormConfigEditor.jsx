import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, X, MoveUp, MoveDown, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function FormConfigEditor({ config, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(config || {
    form_name: '',
    display_name: '',
    description: '',
    fields: [],
    is_active: true,
    allow_multiple_submissions: true,
    requires_approval: false,
    notification_settings: {
      send_on_submit: false,
      recipients: []
    }
  });

  const addField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, {
        field_name: '',
        display_name: '',
        field_type: 'text',
        is_required: false,
        is_critical: false,
        is_visible: true,
        order: formData.fields.length + 1
      }]
    });
  };

  const updateField = (index, field, value) => {
    const updated = [...formData.fields];
    updated[index][field] = value;
    setFormData({ ...formData, fields: updated });
  };

  const removeField = (index) => {
    setFormData({ 
      ...formData, 
      fields: formData.fields.filter((_, i) => i !== index) 
    });
  };

  const moveField = (index, direction) => {
    const fields = [...formData.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    
    [fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]];
    
    // Update order
    fields.forEach((field, i) => {
      field.order = i + 1;
    });
    
    setFormData({ ...formData, fields });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.form_name || !formData.display_name) {
      alert('נא למלא שם טופס ושם תצוגה');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>פרטי הטופס</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>שם הטופס במערכת (אנגלית) *</Label>
              <Input
                value={formData.form_name}
                onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                placeholder="VisitForm"
                disabled={!!config}
              />
            </div>
            <div>
              <Label>שם לתצוגה *</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="טופס ביקור"
              />
            </div>
          </div>
          
          <div>
            <Label>תיאור הטופס</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="תיאור קצר של הטופס..."
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">הטופס פעיל</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_multiple"
                checked={formData.allow_multiple_submissions}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_multiple_submissions: checked })}
              />
              <Label htmlFor="allow_multiple" className="cursor-pointer">אפשר הגשות מרובות</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="requires_approval"
                checked={formData.requires_approval}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
              />
              <Label htmlFor="requires_approval" className="cursor-pointer">נדרש אישור</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>שדות הטופס</CardTitle>
            <Button type="button" size="sm" onClick={addField}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף שדה
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.fields.length === 0 ? (
            <p className="text-center py-8 text-gray-500">לא הוגדרו שדות. לחץ על "הוסף שדה" להתחלה</p>
          ) : (
            <div className="space-y-4">
              {formData.fields.map((field, index) => (
                <div key={index} className="p-4 border-2 rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge>{index + 1}</Badge>
                      {field.is_critical && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 ml-1" />
                          קריטי
                        </Badge>
                      )}
                      {field.is_required && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                          חובה
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, 'down')}
                        disabled={index === formData.fields.length - 1}
                      >
                        <MoveDown className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">שם השדה (אנגלית)</Label>
                      <Input
                        value={field.field_name}
                        onChange={(e) => updateField(index, 'field_name', e.target.value)}
                        placeholder="patient_name"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">שם לתצוגה</Label>
                      <Input
                        value={field.display_name}
                        onChange={(e) => updateField(index, 'display_name', e.target.value)}
                        placeholder="שם המטופל"
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">סוג שדה</Label>
                      <Select 
                        value={field.field_type} 
                        onValueChange={(val) => updateField(index, 'field_type', val)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">טקסט</SelectItem>
                          <SelectItem value="number">מספר</SelectItem>
                          <SelectItem value="date">תאריך</SelectItem>
                          <SelectItem value="textarea">אזור טקסט</SelectItem>
                          <SelectItem value="select">בחירה מרשימה</SelectItem>
                          <SelectItem value="checkbox">תיבת סימון</SelectItem>
                          <SelectItem value="email">אימייל</SelectItem>
                          <SelectItem value="phone">טלפון</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">מגבלת אורך (טקסט)</Label>
                      <Input
                        type="number"
                        value={field.max_length || ''}
                        onChange={(e) => updateField(index, 'max_length', parseInt(e.target.value) || null)}
                        placeholder="לא מוגבל"
                        className="text-sm"
                      />
                    </div>

                    {field.field_type === 'number' && (
                      <>
                        <div>
                          <Label className="text-xs">ערך מינימלי</Label>
                          <Input
                            type="number"
                            value={field.min_value || ''}
                            onChange={(e) => updateField(index, 'min_value', parseFloat(e.target.value) || null)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">ערך מקסימלי</Label>
                          <Input
                            type="number"
                            value={field.max_value || ''}
                            onChange={(e) => updateField(index, 'max_value', parseFloat(e.target.value) || null)}
                            className="text-sm"
                          />
                        </div>
                      </>
                    )}

                    <div className="col-span-2">
                      <Label className="text-xs">טקסט מציין מקום</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                        placeholder="הקלד כאן..."
                        className="text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">טקסט עזרה</Label>
                      <Input
                        value={field.help_text || ''}
                        onChange={(e) => updateField(index, 'help_text', e.target.value)}
                        placeholder="הסבר קצר על השדה..."
                        className="text-sm"
                      />
                    </div>

                    {field.field_type === 'select' && (
                      <div className="col-span-2">
                        <Label className="text-xs">אפשרויות (מופרדות בפסיק)</Label>
                        <Input
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="אפשרות 1, אפשרות 2, אפשרות 3"
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`required-${index}`}
                        checked={field.is_required}
                        onCheckedChange={(checked) => updateField(index, 'is_required', checked)}
                      />
                      <Label htmlFor={`required-${index}`} className="text-xs cursor-pointer">שדה חובה</Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`critical-${index}`}
                        checked={field.is_critical}
                        onCheckedChange={(checked) => updateField(index, 'is_critical', checked)}
                      />
                      <Label htmlFor={`critical-${index}`} className="text-xs cursor-pointer">שדה קריטי</Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`visible-${index}`}
                        checked={field.is_visible}
                        onCheckedChange={(checked) => updateField(index, 'is_visible', checked)}
                      />
                      <Label htmlFor={`visible-${index}`} className="text-xs cursor-pointer">מוצג</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 ml-2" />
          שמור הגדרות
        </Button>
      </div>
    </form>
  );
}