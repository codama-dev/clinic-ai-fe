import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X, Plus, Trash2, Merge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProtocolTemplateForm({ template, allTemplates = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState(template || {
    name: "",
    description: "",
    fields: [{ name: "", label: "", type: "text", options: [] }]
  });
  const [selectedTemplatesToMerge, setSelectedTemplatesToMerge] = useState([]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldChange = (index, field, value) => {
    const newFields = [...formData.fields];
    newFields[index][field] = value;
    if (field === 'type' && value !== 'select') {
      newFields[index].options = [];
    }
    handleChange('fields', newFields);
  };
  
  const handleOptionChange = (fieldIndex, optionIndex, value) => {
      const newFields = [...formData.fields];
      newFields[fieldIndex].options[optionIndex] = value;
      handleChange('fields', newFields);
  }

  const addField = () => {
    handleChange('fields', [...formData.fields, { name: "", label: "", type: "text", options: [] }]);
  };

  const removeField = (index) => {
    const newFields = formData.fields.filter((_, i) => i !== index);
    handleChange('fields', newFields);
  };
  
  const addOption = (fieldIndex) => {
      const newFields = [...formData.fields];
      if (!newFields[fieldIndex].options) newFields[fieldIndex].options = [];
      newFields[fieldIndex].options.push("");
      handleChange('fields', newFields);
  }
  
  const removeOption = (fieldIndex, optionIndex) => {
      const newFields = [...formData.fields];
      newFields[fieldIndex].options = newFields[fieldIndex].options.filter((_, i) => i !== optionIndex);
      handleChange('fields', newFields);
  }

  const handleMergeTemplates = () => {
    const selectedTemplates = allTemplates.filter(t => selectedTemplatesToMerge.includes(t.id));
    const mergedFields = [];
    
    selectedTemplates.forEach(t => {
      if (t.fields && Array.isArray(t.fields)) {
        t.fields.forEach(field => {
          // Skip "custom" type fields (like surgery/dental protocols)
          if (field.type === 'custom') {
            return;
          }
          // Add all fields, even duplicates from different templates
          mergedFields.push({ ...field });
        });
      }
    });
    
    handleChange('fields', mergedFields);
    setSelectedTemplatesToMerge([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">שם התבנית *</Label>
        <Input id="name" value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">תיאור</Label>
        <Textarea id="description" value={formData.description} onChange={e => handleChange('description', e.target.value)} />
      </div>

      {/* Merge Templates Section */}
      {!template && allTemplates.length > 0 && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Merge className="w-4 h-4" />
              איחוד תבניות קיימות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">בחר/י תבניות קיימות כדי לאחד את השדות שלהן לתבנית החדשה</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allTemplates.map(t => (
                <div key={t.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                  <Checkbox
                    id={`merge-${t.id}`}
                    checked={selectedTemplatesToMerge.includes(t.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTemplatesToMerge([...selectedTemplatesToMerge, t.id]);
                      } else {
                        setSelectedTemplatesToMerge(selectedTemplatesToMerge.filter(id => id !== t.id));
                      }
                    }}
                  />
                  <Label htmlFor={`merge-${t.id}`} className="flex-grow cursor-pointer">
                    <span className="font-medium">{t.name}</span>
                    {t.description && <span className="text-xs text-gray-500 block">{t.description}</span>}
                  </Label>
                </div>
              ))}
            </div>
            {selectedTemplatesToMerge.length > 0 && (
              <Button type="button" onClick={handleMergeTemplates} className="w-full bg-blue-600 hover:bg-blue-700">
                <Merge className="w-4 h-4 ml-2" />
                אחד {selectedTemplatesToMerge.length} תבניות
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <Label className="font-semibold">שדות הפרוטוקול</Label>
        <div className="space-y-4 mt-2">
          {formData.fields.map((field, index) => (
            <div key={index} className="p-4 border rounded-md bg-gray-50/50 space-y-3 relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-1 left-1" onClick={() => removeField(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`field-name-${index}`} className="text-xs">שם (מזהה באנגלית)*</Label>
                  <Input id={`field-name-${index}`} value={field.name} onChange={e => handleFieldChange(index, 'name', e.target.value)} required placeholder="e.g., surgeon_name"/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`field-label-${index}`} className="text-xs">תווית (מה שיוצג למשתמש)*</Label>
                  <Input id={`field-label-${index}`} value={field.label} onChange={e => handleFieldChange(index, 'label', e.target.value)} required placeholder="לדוגמה: שם המנתח"/>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`field-type-${index}`} className="text-xs">סוג שדה</Label>
                  <Select value={field.type} onValueChange={value => handleFieldChange(index, 'type', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">טקסט קצר</SelectItem>
                      <SelectItem value="textarea">טקסט ארוך</SelectItem>
                      <SelectItem value="number">מספר</SelectItem>
                      <SelectItem value="select">בחירה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {field.type === 'select' && (
                <div className="pl-4 border-r-2 border-purple-200">
                    <Label className="text-xs">אפשרויות</Label>
                    <div className="space-y-2 mt-1">
                        {(field.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                                <Input value={option} onChange={e => handleOptionChange(index, optIndex, e.target.value)} placeholder={`אפשרות ${optIndex + 1}`}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index, optIndex)}><X className="w-4 h-4"/></Button>
                            </div>
                        ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}><Plus className="w-4 h-4 ml-2"/>הוסף אפשרות</Button>
                    </div>
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addField}><Plus className="w-4 h-4 ml-2" />הוסף שדה</Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 ml-2" />ביטול</Button>
        <Button type="submit"><Save className="w-4 h-4 ml-2" />שמור תבנית</Button>
      </div>
    </form>
  );
}