import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, MessageSquare, Send, Plus, Edit, Trash2, Image, Save, X, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Send
};

const CHANNEL_NAMES = {
  email: "אימייל",
  whatsapp: "WhatsApp",
  sms: "SMS"
};

export default function MessageTemplatesManagerPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState("email");
  const [formData, setFormData] = useState({
    template_name: "",
    channel: "email",
    subject: "",
    header_image_url: "",
    message_content: "",
    signature: "",
    footer_text: "",
    is_active: true,
    is_default: false
  });
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => base44.entities.MessageTemplate.list('-created_date', 100)
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.MessageTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['messageTemplates']);
      toast.success("התבנית נוצרה בהצלחה!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating template:", error);
      toast.error("שגיאה ביצירת התבנית");
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MessageTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['messageTemplates']);
      toast.success("התבנית עודכנה בהצלחה!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast.error("שגיאה בעדכון התבנית");
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.MessageTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['messageTemplates']);
      toast.success("התבנית נמחקה בהצלחה!");
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast.error("שגיאה במחיקת התבנית");
    }
  });

  const resetForm = () => {
    setFormData({
      template_name: "",
      channel: "email",
      subject: "",
      header_image_url: "",
      message_content: "",
      signature: "",
      footer_text: "",
      is_active: true,
      is_default: false
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name || "",
      channel: template.channel || "email",
      subject: template.subject || "",
      header_image_url: template.header_image_url || "",
      message_content: template.message_content || "",
      signature: template.signature || "",
      footer_text: template.footer_text || "",
      is_active: template.is_active ?? true,
      is_default: template.is_default ?? false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק תבנית זו?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.template_name || !formData.message_content) {
      toast.error("נא למלא את כל השדות החובה");
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, header_image_url: file_url });
      toast.success("התמונה הועלתה בהצלחה!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("שגיאה בהעלאת התמונה");
    }
    setIsUploading(false);
  };

  const channelTemplates = templates.filter(t => t.channel === selectedChannel);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">טוען תבניות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול תבניות הודעות</h1>
          <p className="text-gray-500">התאמה אישית של הודעות עבור כל ערוץ תקשורת</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 ml-2" />
          תבנית חדשה
        </Button>
      </div>

      <Tabs value={selectedChannel} onValueChange={setSelectedChannel} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 ml-2" />
            אימייל
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="w-4 h-4 ml-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="sms">
            <Send className="w-4 h-4 ml-2" />
            SMS
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedChannel} className="mt-6">
          {channelTemplates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">אין תבניות עבור {CHANNEL_NAMES[selectedChannel]}</p>
                  <Button onClick={() => { setFormData({ ...formData, channel: selectedChannel }); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    צור תבנית ראשונה
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {channelTemplates.map(template => {
                const Icon = CHANNEL_ICONS[template.channel];
                return (
                  <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Icon className="w-5 h-5 text-purple-600 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{template.template_name}</CardTitle>
                              {template.is_default && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ברירת מחדל
                                </span>
                              )}
                              {!template.is_active && (
                                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                  לא פעיל
                                </span>
                              )}
                            </div>
                            {template.subject && (
                              <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">נושא:</span> {template.subject}
                              </p>
                            )}
                            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                              {template.header_image_url && (
                                <div className="mb-2">
                                  <img src={template.header_image_url} alt="Header" className="h-12 object-contain" />
                                </div>
                              )}
                              <p className="whitespace-pre-wrap">{template.message_content}</p>
                              {template.signature && (
                                <p className="mt-3 pt-3 border-t border-gray-200 font-medium">
                                  {template.signature}
                                </p>
                              )}
                              {template.footer_text && (
                                <p className="mt-2 text-xs text-gray-500">{template.footer_text}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(template)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'עריכת תבנית' : 'תבנית חדשה'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template_name">שם התבנית *</Label>
                <Input
                  id="template_name"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="למשל: תזכורת תור"
                  required
                />
              </div>
              <div>
                <Label htmlFor="channel">ערוץ תקשורת *</Label>
                <Select value={formData.channel} onValueChange={(value) => setFormData({ ...formData, channel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        אימייל
                      </div>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        SMS
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.channel === 'email' && (
              <div>
                <Label htmlFor="subject">נושא המייל</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="נושא ההודעה"
                />
              </div>
            )}

            <div>
              <Label htmlFor="header_image">לוגו / תמונת כותרת</Label>
              <div className="flex gap-2 items-center">
                {formData.header_image_url && (
                  <img src={formData.header_image_url} alt="Header" className="h-16 object-contain border rounded p-2" />
                )}
                <Input
                  id="header_image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </div>
              {isUploading && <p className="text-sm text-gray-500 mt-1">מעלה תמונה...</p>}
            </div>

            <div>
              <Label htmlFor="message_content">תוכן ההודעה *</Label>
              <Textarea
                id="message_content"
                value={formData.message_content}
                onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                placeholder="כתוב את תוכן ההודעה כאן..."
                rows={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                טיפ: השתמש במשתנים כמו [שם_לקוח], [שם_חיה], [תאריך_תור], [שעת_תור]
              </p>
            </div>

            <div>
              <Label htmlFor="signature">חתימה</Label>
              <Textarea
                id="signature"
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                placeholder="חתימה בסוף ההודעה"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="footer_text">טקסט תחתון</Label>
              <Input
                id="footer_text"
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                placeholder="טקסט קטן בתחתית ההודעה"
              />
            </div>

            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">תבנית פעילה</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default" className="cursor-pointer">ברירת מחדל</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 ml-2" />
                שמור
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}