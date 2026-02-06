
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const defaultState = {
    case_number: "",
    client_name: "",
    treatments: [{ visit_date: new Date().toISOString().split('T')[0], description: "" }],
};

export default function ClinicCaseForm({ caseData, onSubmit, onCancel, isSubmitting, isReadOnly = false }) {
    const [formData, setFormData] = useState(defaultState);

    useEffect(() => {
        if (caseData) {
            setFormData({ ...caseData, treatments: caseData.treatments || [] });
        } else {
            setFormData(defaultState);
        }
    }, [caseData]);

    const handleMainChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTreatmentChange = (index, field, value) => {
        const newTreatments = [...formData.treatments];
        newTreatments[index][field] = value;
        setFormData(prev => ({ ...prev, treatments: newTreatments }));
    };

    const addTreatment = () => {
        setFormData(prev => ({
            ...prev,
            treatments: [...(prev.treatments || []), { visit_date: new Date().toISOString().split('T')[0], description: "" }]
        }));
    };

    const removeTreatment = (index) => {
        setFormData(prev => ({
            ...prev,
            treatments: prev.treatments.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.case_number || !formData.client_name) {
            toast.error("יש למלא את מספר התיק ושם הלקוח.");
            return;
        }
        if (!formData.treatments || formData.treatments.length === 0) {
            toast.error("יש להוסיף לפחות טיפול אחד.");
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="case_number">מס' תיק רפואי *</Label>
                    <Input id="case_number" value={formData.case_number} onChange={e => handleMainChange('case_number', e.target.value)} required disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="client_name">שם הלקוח *</Label>
                    <Input id="client_name" value={formData.client_name} onChange={e => handleMainChange('client_name', e.target.value)} required disabled={isReadOnly} />
                </div>
            </div>

            <div className="space-y-4 p-4 border rounded-md bg-gray-50/70">
                <Label className="text-lg font-semibold">רשומות טיפולים</Label>
                {(formData.treatments || []).map((treatment, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border bg-white rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-grow">
                             <div className="space-y-1 md:col-span-1">
                                <Label htmlFor={`visit_date_${index}`} className="text-xs">תאריך ביקור</Label>
                                <Input id={`visit_date_${index}`} type="date" value={treatment.visit_date} onChange={e => handleTreatmentChange(index, 'visit_date', e.target.value)} disabled={isReadOnly} />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label htmlFor={`description_${index}`} className="text-xs">תיאור הטיפול</Label>
                                <Textarea id={`description_${index}`} value={treatment.description} onChange={e => handleTreatmentChange(index, 'description', e.target.value)} placeholder="תיאור קצר של הטיפול שבוצע..." disabled={isReadOnly} />
                            </div>
                        </div>
                        {!isReadOnly && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTreatment(index)} className="mt-6">
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        )}
                    </div>
                ))}
                {!isReadOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={addTreatment}>
                        <Plus className="w-4 h-4 ml-2" />הוסף טיפול
                    </Button>
                )}
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    <X className="w-4 h-4 ml-2" />{isReadOnly ? "סגור" : "ביטול"}
                </Button>
                {!isReadOnly && (
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                        {isSubmitting ? "שומר..." : (caseData ? "שמור שינויים" : "צור תיק")}
                    </Button>
                )}
            </div>
        </form>
    );
}
