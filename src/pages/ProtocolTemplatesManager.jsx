import React, { useState, useEffect } from "react";
import { ProtocolTemplate, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProtocolTemplateForm from "../components/protocols/ProtocolTemplateForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProtocolTemplatesManagerPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, templatesData] = await Promise.all([User.me(), ProtocolTemplate.list()]);
      setCurrentUser(user);
      const hasAccess = user.role === 'admin' || user.permissions?.includes('manage_protocol_templates');
      if (hasAccess) {
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleFormSubmit = async (templateData) => {
    try {
      if (editingTemplate) {
        await ProtocolTemplate.update(editingTemplate.id, templateData);
      } else {
        await ProtocolTemplate.create(templateData);
      }
      setIsFormOpen(false);
      setEditingTemplate(null);
      loadData();
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

  const handleDeleteRequest = (template) => {
    setTemplateToDelete(template);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    try {
      await ProtocolTemplate.delete(templateToDelete.id);
      setTemplateToDelete(null);
      loadData();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  if (isLoading) return <p>טוען...</p>;

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_protocol_templates');
  if (!hasAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 border-red-500">
        <CardHeader className="text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
          <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">עמוד זה מיועד למנהלי מערכת או למשתמשים בעלי הרשאת "ניהול תבניות פרוטוקול".</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול תבניות פרוטוקול</h1>
          <p className="text-gray-500">יצירה ועריכה של תבניות למילוי.</p>
        </div>
        <Button onClick={handleCreate}><Plus className="w-4 h-4 ml-2" />תבנית חדשה</Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{editingTemplate ? 'עריכת תבנית' : 'יצירת תבנית חדשה'}</DialogTitle></DialogHeader>
          <div className="py-4 max-h-[80vh] overflow-y-auto pr-2">
            <ProtocolTemplateForm
              template={editingTemplate}
              allTemplates={templates}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את התבנית "{templateToDelete?.name}" לצמיתות. לא ניתן לשחזר פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">כן, מחק</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <div className="space-y-4">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>{template.name}</CardTitle>
                <p className="text-sm text-gray-500">{template.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  עדכון אחרון: {new Date(template.updated_date).toLocaleString('he-IL')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => handleEdit(template)}><Edit className="w-4 h-4" /></Button>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteRequest(template)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}