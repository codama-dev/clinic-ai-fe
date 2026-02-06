import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, FileText, Settings, AlertCircle, CheckCircle } from "lucide-react";
import FormConfigEditor from "../components/forms/FormConfigEditor";
import { toast } from "sonner";

// רשימת הטפסים הקיימים במערכת
const AVAILABLE_FORMS = [
  { name: 'VisitForm', display_name: 'טופס ביקור רפואי', description: 'תיעוד ביקור רפואי מלא כולל ממצאים, אבחנה וטיפול', icon: FileText },
  { name: 'PatientForm', display_name: 'טופס מטופל', description: 'רישום מטופל חדש או עדכון פרטי מטופל קיים', icon: FileText },
  { name: 'AppointmentForm', display_name: 'טופס קביעת תור', description: 'קביעת תור חדש ללקוח ומטופל', icon: FileText },
  { name: 'ClientForm', display_name: 'טופס לקוח', description: 'רישום לקוח חדש ופרטי יצירת קשר', icon: FileText }
];

export default function FormsManagementPage() {
  const [selectedForm, setSelectedForm] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: formConfigs = [] } = useQuery({
    queryKey: ['formConfigurations'],
    queryFn: () => base44.entities.FormConfiguration.list('-updated_date', 100)
  });

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.FormConfiguration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['formConfigurations']);
      setIsEditorOpen(false);
      setSelectedForm(null);
      toast.success('ההגדרות נשמרו בהצלחה');
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FormConfiguration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['formConfigurations']);
      setIsEditorOpen(false);
      setSelectedForm(null);
      toast.success('ההגדרות עודכנו בהצלחה');
    }
  });

  const handleEditForm = (formName) => {
    const existingConfig = formConfigs.find(c => c.form_name === formName);
    const formTemplate = AVAILABLE_FORMS.find(f => f.name === formName);
    
    if (existingConfig) {
      setSelectedForm(existingConfig);
    } else {
      // Create new config from template with default fields
      let defaultFields = [];
      
      // Add default fields for VisitForm based on image
      if (formName === 'VisitForm') {
        defaultFields = [
          { field_name: 'patient_id', display_name: 'מטופל', field_type: 'select', is_required: true, is_critical: true, is_visible: true, order: 1, options: [] },
          { field_name: 'treating_doctor_id', display_name: 'רופא מטפל', field_type: 'select', is_required: true, is_critical: true, is_visible: true, order: 2, options: [] },
          { field_name: 'visit_date', display_name: 'תאריך הביקור', field_type: 'date', is_required: true, is_critical: true, is_visible: true, order: 3 },
          { field_name: 'visit_reason', display_name: 'סיבת הביקור (C)', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 4 },
          { field_name: 'weight', display_name: 'משקל הנוכחי (ק"ג)', field_type: 'number', is_required: false, is_critical: false, is_visible: true, order: 5 },
          { field_name: 'heart_rate', display_name: 'קצב לב', field_type: 'number', is_required: false, is_critical: false, is_visible: true, order: 6 },
          { field_name: 'respiratory_rate', display_name: 'תדירות נשימה', field_type: 'number', is_required: false, is_critical: false, is_visible: true, order: 7 },
          { field_name: 'systolic_bp', display_name: 'לחץ דם סיסטולי', field_type: 'number', is_required: false, is_critical: false, is_visible: true, order: 8 },
          { field_name: 'diastolic_bp', display_name: 'לחץ דם דיאסטולי', field_type: 'number', is_required: false, is_critical: false, is_visible: true, order: 9 },
          { field_name: 'clinical_signs', display_name: 'סימנים קליניים', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 10 },
          { field_name: 'diagnosis', display_name: 'אבחנה', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 11 },
          { field_name: 'treatment_recommendations', display_name: 'המלצות טיפול', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 12 },
          { field_name: 'prescriptions', display_name: 'מרשמים וטיפולים', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 13, placeholder: 'הוסף מרשם חדש' },
          { field_name: 'lab_tests', display_name: 'בדיקות מעבדה', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 14, placeholder: 'בחר בדיקות' },
          { field_name: 'medications', display_name: 'תרופות', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 15, placeholder: 'הוסף תרופה' },
          { field_name: 'follow_up_required', display_name: 'לזמן שוב - ביקור חוזר', field_type: 'checkbox', is_required: false, is_critical: false, is_visible: true, order: 16 },
          { field_name: 'skip_receipt', display_name: 'לא להוריד קבלה עתה', field_type: 'checkbox', is_required: false, is_critical: false, is_visible: true, order: 17 },
          { field_name: 'notes', display_name: 'הערות', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 18 }
        ];
      }
      
      // Add default fields for PatientForm
      if (formName === 'PatientForm') {
        defaultFields = [
          { field_name: 'photo_section', display_name: '📷 תמונה', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 1 },
          { field_name: 'photo_url', display_name: 'תמונת החיה', field_type: 'image', is_required: false, is_critical: false, is_visible: true, order: 2 },
          
          { field_name: 'basic_info_section', display_name: '🐾 מידע בסיסי', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 3 },
          { field_name: 'name', display_name: 'שם החיה', field_type: 'text', is_required: true, is_critical: true, is_visible: true, order: 4 },
          { field_name: 'species', display_name: 'סוג החיה', field_type: 'select', options: ['כלב', 'חתול', 'ארנב', 'תוכי', 'חמוס', 'שרקן', 'אחר'], is_required: true, is_critical: true, is_visible: true, order: 5 },
          { field_name: 'breed', display_name: 'גזע', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 6 },
          { field_name: 'sex', display_name: 'מין', field_type: 'select', options: ['זכר', 'נקבה'], is_required: false, is_critical: false, is_visible: true, order: 7 },
          { field_name: 'neutered', display_name: 'מעוקר/מסורס', field_type: 'checkbox', is_required: false, is_critical: false, is_visible: true, order: 8 },
          { field_name: 'neutered_date', display_name: 'תאריך עיקור/סירוס', field_type: 'date', is_required: false, is_critical: false, is_visible: true, order: 9 },
          { field_name: 'description', display_name: 'תיאור החיה', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 10 },
          
          { field_name: 'physical_section', display_name: '📊 מידע פיזי ורפואי', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 11 },
          { field_name: 'date_of_birth', display_name: 'תאריך לידה', field_type: 'date', is_required: false, is_critical: false, is_visible: true, order: 12 },
          { field_name: 'weight', display_name: 'משקל (ק"ג)', field_type: 'number', is_required: false, is_critical: false, is_visible: true, order: 13 },
          { field_name: 'microchip', display_name: 'מספר שבב', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 14 },
          { field_name: 'microchip_date', display_name: 'תאריך ביצוע שבב', field_type: 'date', is_required: false, is_critical: false, is_visible: true, order: 15 },
          { field_name: 'color', display_name: 'צבע/סימנים', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 16 },
          
          { field_name: 'medical_section', display_name: '💊 רקע רפואי', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 17 },
          { field_name: 'allergies', display_name: 'אלרגיות ידועות', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 18 },
          { field_name: 'chronic_conditions', display_name: 'מחלות כרוניות', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 19 },
          { field_name: 'current_medications', display_name: 'תרופות קבועות', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 20 },
          
          { field_name: 'insurance_section', display_name: '🛡️ ביטוח', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 21 },
          { field_name: 'is_insured', display_name: 'לקוח מבוטח', field_type: 'checkbox', is_required: false, is_critical: false, is_visible: true, order: 22 },
          { field_name: 'insurance_company', display_name: 'חברת ביטוח', field_type: 'select', options: ['מרפאט', 'חיותא', 'פניקס', 'אחר'], is_required: false, is_critical: false, is_visible: true, order: 23 },
          { field_name: 'insurance_policy', display_name: 'מספר פוליסה', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 24 },
          
          { field_name: 'status_section', display_name: '📌 סטטוס והערות', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 25 },
          { field_name: 'status', display_name: 'סטטוס החיה', field_type: 'select', options: ['active', 'inactive'], is_required: false, is_critical: false, is_visible: true, order: 26 },
          { field_name: 'inactive_reason', display_name: 'סיבת חוסר פעילות', field_type: 'select', options: ['נפטרה', 'אבדה', 'עברה בעלים', 'אחר'], is_required: false, is_critical: false, is_visible: true, order: 27 },
          { field_name: 'notes', display_name: 'הערות', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 28 }
        ];
      }
      
      // Add default fields for ClientForm
      if (formName === 'ClientForm') {
        defaultFields = [
          { field_name: 'basic_info_section', display_name: '👤 פרטים אישיים', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 1 },
          { field_name: 'full_name', display_name: 'שם מלא', field_type: 'text', is_required: true, is_critical: true, is_visible: true, order: 2 },
          { field_name: 'phone', display_name: 'טלפון', field_type: 'text', is_required: true, is_critical: true, is_visible: true, order: 3 },
          { field_name: 'phone_secondary', display_name: 'טלפון נוסף', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 4 },
          { field_name: 'email', display_name: 'אימייל', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 5 },
          
          { field_name: 'address_section', display_name: '📍 כתובת', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 6 },
          { field_name: 'city', display_name: 'עיר', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 7 },
          { field_name: 'id_number', display_name: 'תעודת זהות', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 8 },
          { field_name: 'address', display_name: 'רחוב', field_type: 'text', is_required: false, is_critical: false, is_visible: true, order: 9 },
          
          { field_name: 'communication_section', display_name: '📱 העדפות תקשורת', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 10 },
          { field_name: 'preferred_contact', display_name: 'אמצעי קבלת תזכורות', field_type: 'select', options: ['SMS', 'WhatsApp'], is_required: false, is_critical: false, is_visible: true, order: 11 },
          { field_name: 'reminders_consent', display_name: 'הסכמה לקבלת תזכורות', field_type: 'checkbox', is_required: false, is_critical: false, is_visible: true, order: 12 },
          
          { field_name: 'notes_section', display_name: '📝 הערות', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 13 },
          { field_name: 'notes', display_name: 'הערות', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 14 },
          
          { field_name: 'patients_section', display_name: '🐾 מטופלים (אופציונלי)', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 15 }
        ];
      }
      
      // Add default fields for AppointmentForm
      if (formName === 'AppointmentForm') {
        defaultFields = [
          // אזור תאריך ושעה
          { field_name: 'section_datetime', display_name: '📅 תאריך ושעה', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 1 },
          { field_name: 'date', display_name: 'תאריך', field_type: 'date', is_required: true, is_critical: true, is_visible: true, order: 2 },
          { field_name: 'start_time', display_name: 'שעת התחלה', field_type: 'time', is_required: true, is_critical: true, is_visible: true, order: 3 },
          
          // אזור לקוח ומטופל
          { field_name: 'section_client_patient', display_name: '👤 לקוח ומטופל', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 4 },
          { field_name: 'client_search', display_name: 'חיפוש לקוח', field_type: 'text', is_required: true, is_critical: true, is_visible: true, order: 5, placeholder: 'הקלד שם או טלפון...' },
          { field_name: 'patient_id', display_name: 'בחר מטופל', field_type: 'select', is_required: true, is_critical: true, is_visible: true, order: 6 },
          
          // אזור פרטי התור
          { field_name: 'section_appointment_details', display_name: '🩺 פרטי התור', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 7 },
          { field_name: 'doctor_id', display_name: 'רופא מטפל', field_type: 'select', is_required: true, is_critical: true, is_visible: true, order: 8 },
          { field_name: 'appointment_type_id', display_name: 'סוג ביקור', field_type: 'select', is_required: true, is_critical: true, is_visible: true, order: 9 },
          { field_name: 'room_id', display_name: 'חדר טיפולים', field_type: 'select', is_required: false, is_critical: false, is_visible: true, order: 10 },
          
          // אזור הערות ומצב
          { field_name: 'section_notes', display_name: '📝 הערות ומצב', field_type: 'title', is_required: false, is_critical: false, is_visible: true, order: 11 },
          { field_name: 'chief_complaint', display_name: 'סיבת ההגעה', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 12, placeholder: 'פרט את סיבת ההגעה...' },
          { field_name: 'reception_notes', display_name: 'הערות קבלה', field_type: 'textarea', is_required: false, is_critical: false, is_visible: true, order: 13, placeholder: 'הערות נוספות...' },
          { field_name: 'mark_no_show', display_name: 'סמן כ"לא הגיע"', field_type: 'checkbox', is_required: false, is_critical: false, is_visible: true, order: 14 }
        ];
      }
      
      setSelectedForm({
        form_name: formName,
        display_name: formTemplate?.display_name || formName,
        description: formTemplate?.description || '',
        fields: defaultFields,
        is_active: true
      });
    }
    setIsEditorOpen(true);
  };

  const handleSubmit = (data) => {
    if (data.id) {
      updateConfigMutation.mutate({ id: data.id, data });
    } else {
      createConfigMutation.mutate(data);
    }
  };

  const hasManagementAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_forms');

  if (!hasManagementAccess) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">אין הרשאת גישה</h2>
            <p className="text-gray-600">נדרשות הרשאות ניהול טפסים כדי לצפות בדף זה</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ניהול טפסים</h1>
        <p className="text-gray-500">הגדרות ועריכת טפסים קיימים במערכת</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE_FORMS.map(form => {
          const config = formConfigs.find(c => c.form_name === form.name);
          const isConfigured = !!config;
          const isActive = config?.is_active !== false;

          return (
            <Card 
              key={form.name} 
              className={`hover:shadow-lg transition-all cursor-pointer ${
                !isActive && isConfigured ? 'opacity-60' : ''
              }`}
              onClick={() => handleEditForm(form.name)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <form.icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{form.display_name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">{form.name}</p>
                    </div>
                  </div>
                  {isConfigured ? (
                    <Badge className={isActive ? 'bg-green-600' : 'bg-gray-500'}>
                      {isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          מוגדר
                        </>
                      ) : (
                        'לא פעיל'
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      לא מוגדר
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{form.description}</p>
                {isConfigured && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">שדות מוגדרים:</span>
                      <span className="font-semibold">{config.fields?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">שדות חובה:</span>
                      <span className="font-semibold">{config.fields?.filter(f => f.is_required).length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">שדות קריטיים:</span>
                      <span className="font-semibold text-red-600">{config.fields?.filter(f => f.is_critical).length || 0}</span>
                    </div>
                  </div>
                )}
                <Button 
                  className="w-full mt-4"
                  variant={isConfigured ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditForm(form.name);
                  }}
                >
                  <Settings className="w-4 h-4 ml-2" />
                  {isConfigured ? 'ערוך הגדרות' : 'הגדר טופס'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {selectedForm?.id ? 'עריכת הגדרות טופס' : 'הגדרת טופס חדש'} - {selectedForm?.display_name}
            </DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <FormConfigEditor
              config={selectedForm}
              onSubmit={handleSubmit}
              onCancel={() => { setIsEditorOpen(false); setSelectedForm(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}