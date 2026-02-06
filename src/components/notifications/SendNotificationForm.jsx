import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageSquare, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SendNotificationForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    client_id: "",
    client_name: "",
    patient_name: "",
    channel: "email",
    type: "manual",
    recipient: "",
    message_content: "",
    scheduled_time: new Date().toISOString()
  });
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch templates for the selected channel
  const templates = React.useMemo(() => {
    const fetchTemplates = async () => {
      try {
        const allTemplates = await base44.entities.MessageTemplate.list();
        return allTemplates.filter(t => t.is_active && t.channel === formData.channel);
      } catch (error) {
        console.error("Error fetching templates:", error);
        return [];
      }
    };
    return fetchTemplates();
  }, [formData.channel]);

  const [templatesData, setTemplatesData] = React.useState([]);
  
  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const allTemplates = await base44.entities.MessageTemplate.list();
        const filtered = allTemplates.filter(t => t.is_active && t.channel === formData.channel);
        setTemplatesData(filtered);
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };
    loadTemplates();
  }, [formData.channel]);

  const handleClientSearch = async (value) => {
    setSearchTerm(value);
    if (value.length > 1) {
      setIsLoadingClients(true);
      try {
        const allClients = await base44.entities.Client.list('-created_date', 100);
        const filtered = allClients.filter(c => 
          c.full_name?.toLowerCase().includes(value.toLowerCase()) ||
          c.phone?.includes(value)
        );
        setClients(filtered);
        setShowClientResults(true);
      } catch (error) {
        console.error("Error searching clients:", error);
      }
      setIsLoadingClients(false);
    } else {
      setClients([]);
      setShowClientResults(false);
    }
  };

  const handleClientSelect = async (client) => {
    setFormData({
      ...formData,
      client_id: client.id,
      client_name: client.full_name,
      recipient: formData.channel === "email" ? client.email : client.phone,
      channel: client.preferred_contact || "email",
      patient_name: ""
    });
    setSearchTerm(client.full_name);
    setShowClientResults(false);
    
    // Load patient list for this client
    setIsLoadingPatients(true);
    try {
      const allPatients = await base44.entities.Patient.list();
      const clientPatients = allPatients.filter(p => 
        p.client_number === client.client_number && p.status === 'active'
      );
      setPatients(clientPatients);
    } catch (error) {
      console.error("Error loading patients:", error);
    }
    setIsLoadingPatients(false);
  };

  const handleChannelChange = (channel) => {
    setFormData({ ...formData, channel });
    setSelectedTemplate(null); // Reset template when changing channel
  };

  const handleTemplateSelect = (templateId) => {
    const template = templatesData.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        ...formData,
        message_content: template.message_content,
      });
    }
  };

  const handleSendNow = async () => {
    if (!formData.client_id || !formData.recipient || !formData.message_content) {
      toast.error("נא למלא את כל השדות החובה");
      return;
    }

    setIsSending(true);
    try {
      // Create notification record
      await base44.entities.Notification.create({
        ...formData,
        status: 'pending',
        scheduled_time: new Date().toISOString()
      });

      // Send email if channel is email
      if (formData.channel === 'email') {
        await base44.integrations.Core.SendEmail({
          to: formData.recipient,
          subject: `תזכורת מרפאת ${formData.client_name}`,
          body: formData.message_content
        });

        // Update notification status to sent
        toast.success("ההודעה נשלחה בהצלחה במייל!");
      } else {
        // For SMS/WhatsApp - just save the notification
        toast.info(`ההודעה נשמרה למערכת ${formData.channel === 'sms' ? 'SMS' : 'WhatsApp'} (דורש התקנה)`);
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("שגיאה בשליחת ההודעה");
    }
    setIsSending(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <Label htmlFor="clientSearch">חיפוש לקוח *</Label>
        <div className="relative">
          <Input
            id="clientSearch"
            value={searchTerm}
            onChange={(e) => handleClientSearch(e.target.value)}
            placeholder="הקלד שם או טלפון..."
            disabled={!!formData.client_id}
          />
          {formData.client_id && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2"
              onClick={() => {
                setFormData({ ...formData, client_id: "", client_name: "", recipient: "" });
                setSearchTerm("");
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {showClientResults && clients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              {clients.map(client => (
                <div
                  key={client.id}
                  className="p-3 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleClientSelect(client)}
                >
                  <p className="font-semibold">{client.full_name}</p>
                  <p className="text-sm text-gray-500">{client.phone}</p>
                  {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {formData.client_id && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-semibold text-blue-900">{formData.client_name}</p>
          <p className="text-sm text-blue-700">נבחר: {formData.recipient}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="channel">ערוץ תקשורת *</Label>
          <Select value={formData.channel} onValueChange={handleChannelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  אימייל (פעיל)
                </div>
              </SelectItem>
              <SelectItem value="whatsapp">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp (דורש התקנה)
                </div>
              </SelectItem>
              <SelectItem value="sms">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  SMS (דורש התקנה)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="template">תבנית הודעה</Label>
          <Select 
            value={selectedTemplate?.id || ""} 
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר תבנית (אופציונלי)" />
            </SelectTrigger>
            <SelectContent>
              {templatesData.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.template_name}
                  {template.is_default && " (ברירת מחדל)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="recipient">נמען *</Label>
        <Input
          id="recipient"
          value={formData.recipient}
          onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
          placeholder={formData.channel === 'email' ? 'כתובת אימייל' : 'מספר טלפון'}
        />
      </div>

      <div>
        <Label htmlFor="patient_name">בחר חיה (אופציונלי)</Label>
        {formData.client_id ? (
          isLoadingPatients ? (
            <div className="text-sm text-gray-500 p-2">טוען חיות...</div>
          ) : patients.length > 0 ? (
            <Select 
              value={formData.patient_name} 
              onValueChange={(value) => setFormData({ ...formData, patient_name: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר חיה..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.name}>
                    {patient.name} ({patient.species}{patient.breed ? ` - ${patient.breed}` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-gray-500 p-2 border rounded-md bg-gray-50">
              אין חיות רשומות ללקוח זה
            </div>
          )
        ) : (
          <Input
            id="patient_name"
            value={formData.patient_name}
            onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
            placeholder="בחר לקוח תחילה"
            disabled
          />
        )}
      </div>

      <div>
        <Label htmlFor="message">תוכן ההודעה *</Label>
        <Textarea
          id="message"
          value={formData.message_content}
          onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
          placeholder="כתוב את תוכן ההודעה כאן..."
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-1">
          טיפ: כלול את שם הלקוח, תאריך התור, ופרטים רלוונטיים
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSendNow}
          disabled={isSending || !formData.client_id || !formData.recipient || !formData.message_content}
          className="flex-1"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שולח...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 ml-2" />
              שלח עכשיו
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          ביטול
        </Button>
      </div>

      {formData.channel !== 'email' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <p className="text-yellow-800">
            💡 שליחת {formData.channel === 'sms' ? 'SMS' : 'WhatsApp'} דורשת התקנת שירות חיצוני.
            כרגע רק אימייל פעיל במלואו.
          </p>
        </div>
      )}
    </div>
  );
}