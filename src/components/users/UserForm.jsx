import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, Shield, Calendar, Settings } from "lucide-react";
import { Switch } from '@/components/ui/switch';

const allPermissions = [
    { id: "manage_schedule", label: "ניהול סידור שבועי" },
    { id: "approve_schedules", label: "אישור סידורים" },
    { id: "manage_constraint_settings", label: "ניהול הגדרות אילוצים" },
    { id: "manage_orders", label: "ניהול הזמנות" },
    { id: "manage_employees", label: "ניהול עובדים ומשתמשים" },
    { id: "manage_shift_templates", label: "ניהול תבניות משמרת" },
    { id: "manage_vacations", label: "ניהול חופשות" },
    { id: "manage_protocol_templates", label: "ניהול תבניות פרוטוקול" },
    { id: "access_medical_module", label: "גישה למודול רפואי" },
    { id: "manage_supplier_price_list", label: "ניהול מחירון ספקים" },
];

export default function UserForm({ user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    phone: "",
    job: "assistant",
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    is_approved: true,
    permissions: [],
    allowed_constraints: 1,
    annual_vacation_days: 12,
    sick_leave_days: 18,
    vacation_accumulation_years: 3,
    date_of_birth: "",
    id_number: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        job: user.job || 'assistant',
        hire_date: user.hire_date || '',
        is_active: user.is_active ?? true,
        is_approved: user.is_approved ?? false,
        permissions: user.permissions || [],
        allowed_constraints: user.allowed_constraints ?? 1,
        annual_vacation_days: user.annual_vacation_days ?? 12,
        sick_leave_days: user.sick_leave_days ?? 18,
        vacation_accumulation_years: user.vacation_accumulation_years ?? 3,
        date_of_birth: user.date_of_birth || '',
        id_number: user.id_number || '',
      });
    } else {
        setFormData({
            display_name: "",
            email: "",
            phone: "",
            job: "assistant",
            hire_date: new Date().toISOString().split('T')[0],
            is_active: true,
            is_approved: true,
            permissions: [],
            allowed_constraints: 1,
            annual_vacation_days: 12,
            sick_leave_days: 18,
            vacation_accumulation_years: 3,
            date_of_birth: "",
            id_number: "",
        });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handlePermissionChange = (permissionId, checked) => {
      const currentPermissions = formData.permissions || [];
      const newPermissions = checked
        ? [...currentPermissions, permissionId]
        : currentPermissions.filter(p => p !== permissionId);
      handleChange('permissions', newPermissions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">שם לתצוגה</Label>
          <Input 
            id="display_name" 
            value={formData.display_name || ''} 
            onChange={(e) => setFormData(prev => ({...prev, display_name: e.target.value}))} 
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">כתובת מייל</Label>
          <Input id="email" type="email" value={formData.email || ''} onChange={() => {}} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">מספר טלפון</Label>
          <Input 
            id="phone" 
            value={formData.phone || ''} 
            onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="job">תפקיד</Label>
            <Select value={formData.job || 'assistant'} onValueChange={(value) => setFormData(prev => ({...prev, job: value}))}>
                <SelectTrigger id="job"><SelectValue placeholder="בחר תפקיד..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="doctor">רופא/ה</SelectItem>
                    <SelectItem value="assistant">אסיסטנט/ית</SelectItem>
                    <SelectItem value="receptionist">קבלה</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="hire_date">תאריך תחילת עבודה</Label>
            <Input id="hire_date" type="date" value={formData.hire_date || ''} onChange={(e) => setFormData(prev => ({...prev, hire_date: e.target.value}))}/>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="id_number">מספר תעודת זהות</Label>
          <Input
            id="id_number"
            value={formData.id_number || ''}
            onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
            placeholder="מספר ת.ז."
          />
        </div>

        <div>
          <Label htmlFor="date_of_birth">תאריך לידה</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={formData.date_of_birth || ''}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2"><Shield className="w-5 h-5 text-gray-500" />סטטוס והרשאות</h3>
          <div className="flex items-center space-x-2 space-x-reverse">
              <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => handleChange('is_active', checked)} />
              <Label htmlFor="is_active">משתמש פעיל</Label>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
              <Switch id="is_approved" checked={formData.is_approved} onCheckedChange={(checked) => handleChange('is_approved', checked)} />
              <Label htmlFor="is_approved">משתמש מאושר</Label>
          </div>
      </div>

       <div className="space-y-2 pt-2">
          <h4 className="font-medium">הרשאות ניהול</h4>
          <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
            {allPermissions.map(permission => (
              <div key={permission.id} className="flex items-center gap-2">
                <Checkbox
                  id={`perm-${permission.id}`}
                  checked={(formData.permissions || []).includes(permission.id)}
                  onCheckedChange={(checked) => handlePermissionChange(permission.id, checked)}
                />
                <Label htmlFor={`perm-${permission.id}`} className="text-sm font-normal">{permission.label}</Label>
              </div>
            ))}
          </div>
       </div>

      <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" />הגדרת אילוצים</h3>
          <div className="space-y-2">
              <Label htmlFor="allowed_constraints">מספר אילוצים מותר בשבוע</Label>
              <Input 
                  id="allowed_constraints" 
                  type="number" 
                  min="0"
                  value={formData.allowed_constraints ?? 1} 
                  onChange={(e) => handleChange('allowed_constraints', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500">מספר האילוצים השבועיים שהעובד יכול להגיש</p>
          </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-5 h-5 text-gray-500" />הגדרות חופשות ומחלה</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="annual_vacation_days">ימי חופש שנתיים</Label>
                  <Input 
                      id="annual_vacation_days" 
                      type="number" 
                      min="0"
                      value={formData.annual_vacation_days ?? 12} 
                      onChange={(e) => handleChange('annual_vacation_days', parseInt(e.target.value) || 12)}
                  />
                  <p className="text-xs text-gray-500">ברירת מחדל: 12 ימים</p>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="sick_leave_days">ימי מחלה שנתיים</Label>
                  <Input 
                      id="sick_leave_days" 
                      type="number" 
                      min="0"
                      value={formData.sick_leave_days ?? 18} 
                      onChange={(e) => handleChange('sick_leave_days', parseInt(e.target.value) || 18)}
                  />
                  <p className="text-xs text-gray-500">ברירת מחדל: 18 ימים</p>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="vacation_accumulation_years">שנות צבירה</Label>
                  <Input 
                      id="vacation_accumulation_years" 
                      type="number" 
                      min="1"
                      max="10"
                      value={formData.vacation_accumulation_years ?? 3} 
                      onChange={(e) => handleChange('vacation_accumulation_years', parseInt(e.target.value) || 3)}
                  />
                  <p className="text-xs text-gray-500">ברירת מחדל: 3 שנים</p>
              </div>
          </div>
          <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded-md border border-blue-200">
              💡 ימי חופש שלא נוצלו יצטברו למשך מספר השנים שהוגדר מתאריך תחילת העבודה
          </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 ml-2" />ביטול</Button>
        <Button type="submit"><Save className="w-4 h-4 ml-2" />שמירת שינויים</Button>
      </div>
    </form>
  );
}