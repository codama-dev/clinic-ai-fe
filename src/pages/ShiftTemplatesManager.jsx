
import React, { useState, useEffect } from "react";
import { ShiftTemplate } from "@/entities/ShiftTemplate";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ShieldAlert } from "lucide-react";
import ShiftTemplateForm from "../components/shifts/ShiftTemplateForm";
import ShiftTemplateCard from "../components/shifts/ShiftTemplateCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ShiftTemplatesManagerPage() {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
        const user = await User.me();
        setCurrentUser(user);
        const hasAccess = user.role === 'admin' || user.permissions?.includes('manage_shift_templates');
        if (hasAccess) {
            const data = await ShiftTemplate.list('-start_time');
            setTemplates(data);
        }
    } catch (error) {
        console.error("Error loading templates:", error);
    }
    setIsLoading(false);
  };
  
  const loadTemplates = async () => {
     try {
      const data = await ShiftTemplate.list('-start_time');
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  }

  const handleSubmit = async (templateData) => {
    try {
      if (editingTemplate) {
        await ShiftTemplate.update(editingTemplate.id, templateData);
      } else {
        await ShiftTemplate.create(templateData);
      }
      setIsFormOpen(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };
  
  if (isLoading) {
      return <p>טוען...</p>
  }

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_shift_templates');
  if (!hasAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 border-red-500">
        <CardHeader className="text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
          <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            עמוד זה מיועד למשתמשים בעלי הרשאת "ניהול תבניות משמרת" או למנהלי מערכת בלבד.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול תבניות משמרת</h1>
            <p className="text-gray-500">הגדרת סוגי המשמרות במרפאה.</p>
        </div>
        <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 ml-2" />
          הוסף תבנית משמרת
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'עריכת תבנית משמרת' : 'הוספת תבנית משמרת'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ShiftTemplateForm
              template={editingTemplate}
              onSubmit={handleSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {templates.length === 0 && (
        <div className="text-center py-16 text-gray-500 border rounded-lg bg-white">
            <p className="font-semibold">לא נמצאו תבניות משמרת.</p>
            <p>לחץ על "הוסף תבנית משמרת" כדי להתחיל.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <ShiftTemplateCard
            key={template.id}
            template={template}
            onEdit={handleEdit}
            onStatusChange={loadTemplates}
          />
        ))}
      </div>
    </div>
  );
}
