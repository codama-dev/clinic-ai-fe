import React, { useState, useEffect } from "react";
import { ProtocolTemplate, FilledProtocol, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Settings, Edit, Eye, Lock, Calendar, CheckCircle, Clock, AlertCircle, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FillProtocolForm from "../components/protocols/FillProtocolForm";
import SurgeryProtocolForm from "../components/protocols/SurgeryProtocolForm";
import DentalProtocolForm from "../components/protocols/DentalProtocolForm";
import UrineTestProtocolForm from "../components/protocols/UrineTestProtocolForm";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const SURGERY_PROTOCOL_NAME = "פרוטוקול חדר ניתוח - עמותות";
const DENTAL_PROTOCOL_NAME = "פרוטוקול שיניים";
const URINE_TEST_PROTOCOL_NAME = "פרוטוקול - בדיקת שתן";

// Helper function to check if a date is today
const isToday = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

export default function ProtocolsPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filledProtocols, setFilledProtocols] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [waitingPage, setWaitingPage] = useState(1);
  const [releasedPage, setReleasedPage] = useState(1);
  const itemsPerPage = 10;
  
  // State to manage the dialog's content and mode
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    mode: 'create', // 'create', 'edit', 'view'
    template: null,
    filledProtocol: null,
  });

  const [protocolToDelete, setProtocolToDelete] = useState(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, allTemplates, filledData] = await Promise.all([
        User.me(),
        ProtocolTemplate.list('-created_date'),
        FilledProtocol.list('-created_date')
      ]);
      setCurrentUser(user);
      setFilledProtocols(filledData);

      const uniqueTemplates = [];
      const seenNames = new Set();
      for (const template of allTemplates) {
          if (!seenNames.has(template.name)) {
              seenNames.add(template.name);
              uniqueTemplates.push(template);
          }
      }
      
      // Initialize surgery protocol template if it doesn't exist
      if (!uniqueTemplates.find(t => t.name === SURGERY_PROTOCOL_NAME)) {
        try {
          const surgeryTemplate = await ProtocolTemplate.create({
            name: SURGERY_PROTOCOL_NAME,
            description: "פרוטוקול לתיעוד פרוצדורות ניתוחיות המבוצעות עבור עמותות",
            fields: [{ name: "surgery_protocol", label: "פרוטוקול חדר ניתוח", type: "custom" }]
          });
          uniqueTemplates.push(surgeryTemplate);
        } catch (error) {
          console.error("Error creating surgery protocol template:", error);
        }
      }
      
      // Initialize dental protocol template if it doesn't exist
      if (!uniqueTemplates.find(t => t.name === DENTAL_PROTOCOL_NAME)) {
        try {
          const dentalTemplate = await ProtocolTemplate.create({
            name: DENTAL_PROTOCOL_NAME,
            description: "פרוטוקול לתיעוד טיפולי שיניים ומבנה פה",
            fields: [{ name: "dental_protocol", label: "פרוטוקול שיניים", type: "custom" }]
          });
          uniqueTemplates.push(dentalTemplate);
        } catch (error) {
          console.error("Error creating dental protocol template:", error);
        }
      }

      // Initialize urine test protocol template if it doesn't exist
      if (!uniqueTemplates.find(t => t.name === URINE_TEST_PROTOCOL_NAME)) {
        try {
          const urineTestTemplate = await ProtocolTemplate.create({
            name: URINE_TEST_PROTOCOL_NAME,
            description: "פרוטוקול לתיעוד בדיקת שתן",
            fields: [{ name: "urine_test_protocol", label: "בדיקת שתן", type: "custom" }]
          });
          uniqueTemplates.push(urineTestTemplate);
        } catch (error) {
          console.error("Error creating urine test protocol template:", error);
        }
      }
      
      setTemplates(uniqueTemplates);

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };
  
  const closeDialog = () => {
      setDialogState({ isOpen: false, mode: 'create', template: null, filledProtocol: null });
  }

  const handleCreateNew = (template) => {
    setDialogState({
      isOpen: true,
      mode: 'create',
      template: template,
      filledProtocol: null,
    });
  };
  
  const handleViewOrEdit = (protocol) => {
      const templateForProtocol = templates.find(t => t.id === protocol.template_id);
      
      if (!templateForProtocol) {
          alert("לא נמצאה תבנית מתאימה לפרוטוקול זה. ייתכן שהיא נמחקה.");
          return;
      }
      
      // Check if protocol was created today
      const createdToday = isToday(protocol.created_date);
      const isAdmin = currentUser?.role === 'admin';
      
      // Can edit if: (created today) OR (admin)
      const canEdit = createdToday || isAdmin;
      
      if (!canEdit && !createdToday) {
          alert("ניתן לערוך פרוטוקולים רק באותו יום שנוצרו.\nפרוטוקול זה נוצר ב-" + new Date(protocol.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }));
      }
      
      setDialogState({
          isOpen: true,
          mode: canEdit ? 'edit' : 'view',
          template: templateForProtocol,
          filledProtocol: protocol,
      });
  };

  const handleReleaseAnimal = async (protocol) => {
    const confirmed = window.confirm(`האם לשחרר את ${protocol.patient_name}?`);
    if (!confirmed) return;
    
    try {
      await FilledProtocol.update(protocol.id, {
        ...protocol, // Spread existing protocol data to avoid overwriting
        is_released: true,
        released_by: currentUser.display_name || currentUser.full_name,
        released_date: new Date().toISOString()
      });
      
      toast.success(`${protocol.patient_name} שוחרר/ה בהצלחה!`);
      loadData(); // Reload data to update lists
    } catch (error) {
      console.error("Error releasing animal:", error);
      toast.error("שגיאה בשחרור החיה");
    }
  };

  const handleDeleteProtocol = async () => {
    if (!protocolToDelete) return;
    
    try {
      await FilledProtocol.delete(protocolToDelete.id);
      toast.success("הפרוטוקול נמחק בהצלחה");
      setProtocolToDelete(null);
      loadData();
    } catch (error) {
      console.error("Error deleting protocol:", error);
      toast.error("שגיאה במחיקת הפרוטוקול");
    }
  };


  const handleFormSubmit = async (formData) => {
    try {
      if (dialogState.mode === 'create') {
        await FilledProtocol.create({
          template_id: dialogState.template.id,
          template_name: dialogState.template.name,
          patient_name: formData.patient_name || formData.animal_name || 'לא צוין',
          filled_by_name: formData.filled_by_name || currentUser.display_name || currentUser.full_name,
          data: formData.data || formData,
          field_metadata: formData.field_metadata || {}
        });
      } else if (dialogState.mode === 'edit') {
        await FilledProtocol.update(dialogState.filledProtocol.id, {
            ...dialogState.filledProtocol,
            patient_name: formData.patient_name || formData.animal_name || 'לא צוין',
            data: formData.data || formData,
            field_metadata: formData.field_metadata || {}
        });
      }
      
      closeDialog();
      loadData();
    } catch (error) {
      console.error("Error saving protocol:", error);
      toast.error("שגיאה בשמירת הפרוטוקול");
    }
  };

  const handlePartialSave = async (formData) => {
    try {
      let savedProtocol;
      if (dialogState.mode === 'create') {
        // Create new protocol
        savedProtocol = await FilledProtocol.create({
          template_id: dialogState.template.id,
          template_name: dialogState.template.name,
          patient_name: formData.animal_name || formData.organization_name || 'לא צוין',
          filled_by_name: currentUser.display_name || currentUser.full_name,
          data: formData,
          field_metadata: formData.field_metadata || {}
        });
        // Switch to edit mode with the newly created protocol
        setDialogState({
          ...dialogState,
          mode: 'edit',
          filledProtocol: savedProtocol
        });
      } else if (dialogState.mode === 'edit') {
        // Update existing protocol
        await FilledProtocol.update(dialogState.filledProtocol.id, {
            ...dialogState.filledProtocol,
            patient_name: formData.animal_name || formData.organization_name || 'לא צוין',
            data: formData,
            field_metadata: formData.field_metadata || {}
        });
      }
      
      // Show success message but keep dialog open
      toast.success("הנתונים נשמרו בהצלחה!");
      
      // Reload data in background
      loadData();
    } catch (error) {
      console.error("Error saving protocol:", error);
      toast.error("שגיאה בשמירת הנתונים");
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  // Filter and search logic
  const filterProtocols = (protocols) => {
    return protocols.filter(p => {
      // Search query
      const matchesSearch = searchQuery === '' || 
        p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.filled_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.template_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Template filter
      const matchesTemplate = selectedTemplate === 'all' || p.template_name === selectedTemplate;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const protocolDate = new Date(p.created_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFilter === 'today') {
          matchesDate = isToday(p.created_date);
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          matchesDate = protocolDate >= yesterday && protocolDate < today;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = protocolDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          matchesDate = protocolDate >= monthAgo;
        }
      }
      
      return matchesSearch && matchesTemplate && matchesDate;
    });
  };

  // Categorize protocols
  const waitingForRelease = filterProtocols(filledProtocols.filter(p => !p.is_released));
  const releasedAnimals = filterProtocols(filledProtocols.filter(p => p.is_released));

  // Pagination
  const totalWaitingPages = Math.ceil(waitingForRelease.length / itemsPerPage);
  const paginatedWaiting = waitingForRelease.slice(
    (waitingPage - 1) * itemsPerPage,
    waitingPage * itemsPerPage
  );

  const totalReleasedPages = Math.ceil(releasedAnimals.length / itemsPerPage);
  const paginatedReleased = releasedAnimals.slice(
    (releasedPage - 1) * itemsPerPage,
    releasedPage * itemsPerPage
  );
  
  // Check if template is surgery, dental or urine test protocol
  const isSurgeryProtocol = (template) => template?.name === SURGERY_PROTOCOL_NAME;
  const isDentalProtocol = (template) => template?.name === DENTAL_PROTOCOL_NAME;
  const isUrineTestProtocol = (template) => template?.name === URINE_TEST_PROTOCOL_NAME;

  return (
    <div className="max-w-7xl mx-auto">
      <AlertDialog open={!!protocolToDelete} onOpenChange={(open) => !open && setProtocolToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק פרוטוקול זה?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הפרוטוקול "{protocolToDelete?.patient_name}" לצמיתות. לא ניתן לשחזר אותו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProtocol} className="bg-red-600 hover:bg-red-700">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="relative flex justify-center items-center mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">פרוטוקולים רפואיים</h1>
          <p className="text-gray-500">בחר/י תבנית פרוטוקול למילוי או צפה/י בפרוטוקול קיים.</p>
          <p className="text-xs text-orange-600 mt-1 font-medium">⏰ ניתן לערוך פרוטוקולים רק באותו יום שנוצרו</p>
        </div>
        {isAdmin && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline">
              <Link to={createPageUrl("ProtocolTemplatesManager")}>
                <Settings className="w-4 h-4 ml-2" />
                ניהול תבניות
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="flex flex-col items-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/7c4ff2a29_-.png"
              alt="LoVeT לוגו"
              className="h-20 w-auto mb-2"
            />
            <DialogTitle className="text-2xl text-center">{dialogState.template?.name}</DialogTitle>
            {dialogState.filledProtocol && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isToday(dialogState.filledProtocol.created_date) ? "default" : "secondary"} className="text-xs">
                  <Calendar className="w-3 h-3 ml-1" />
                  נוצר ב-{new Date(dialogState.filledProtocol.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                </Badge>
                {!isToday(dialogState.filledProtocol.created_date) && !isAdmin && (
                  <Badge variant="destructive" className="text-xs">
                    <Lock className="w-3 h-3 ml-1" />
                    נעול לעריכה
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>
          {dialogState.template && (
            <div className="py-4">
              {isSurgeryProtocol(dialogState.template) ? (
                <SurgeryProtocolForm
                  protocol={dialogState.filledProtocol}
                  onSubmit={handleFormSubmit}
                  onPartialSave={handlePartialSave}
                  onCancel={closeDialog}
                  readOnly={dialogState.mode === 'view'}
                  currentUser={currentUser}
                />
              ) : isDentalProtocol(dialogState.template) ? (
                <DentalProtocolForm
                  protocol={dialogState.filledProtocol}
                  onSubmit={handleFormSubmit}
                  onPartialSave={handlePartialSave}
                  onCancel={closeDialog}
                  readOnly={dialogState.mode === 'view'}
                  currentUser={currentUser}
                />
              ) : isUrineTestProtocol(dialogState.template) ? (
                <UrineTestProtocolForm
                  protocol={dialogState.filledProtocol}
                  onSubmit={handleFormSubmit}
                  onPartialSave={handlePartialSave}
                  onCancel={closeDialog}
                  readOnly={dialogState.mode === 'view'}
                  currentUser={currentUser}
                />
              ) : (
                <FillProtocolForm
                  template={dialogState.template}
                  initialData={{
                    ...dialogState.filledProtocol?.data,
                    field_metadata: dialogState.filledProtocol?.field_metadata || {}
                  }}
                  isReadOnly={dialogState.mode === 'view'}
                  onSubmit={handleFormSubmit}
                  onPartialSave={handlePartialSave}
                  onCancel={closeDialog}
                  currentUser={currentUser}
                  protocolCreatedDate={dialogState.filledProtocol?.created_date}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Card className="mb-8">
          <CardHeader>
              <CardTitle>תבניות זמינות למילוי</CardTitle>
          </CardHeader>
          <CardContent>
              {isLoading && <p>טוען תבניות...</p>}
              {!isLoading && templates.length === 0 && <p>לא נמצאו תבניות פרוטוקול. מנהל יכול להוסיף תבניות חדשות.</p>}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button key={template.id} onClick={() => handleCreateNew(template)} className="text-right">
                      <Card className="h-full hover:shadow-md hover:border-purple-300 transition-all">
                          <CardHeader>
                              <CardTitle className="flex items-start gap-3"><FileText className="w-5 h-5 mt-1 text-purple-600"/> {template.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <p className="text-sm text-gray-500">{template.description}</p>
                          </CardContent>
                      </Card>
                  </button>
                ))}
              </div>
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>פרוטוקולים שמולאו</CardTitle>
          <div className="mt-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="חיפוש לפי שם חיה, תבנית או ממלא..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setWaitingPage(1);
                    setReleasedPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  setWaitingPage(1);
                  setReleasedPage(1);
                }}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">כל התבניות</option>
                {templates.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setWaitingPage(1);
                  setReleasedPage(1);
                }}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">כל התאריכים</option>
                <option value="today">היום</option>
                <option value="yesterday">אתמול</option>
                <option value="week">שבוע אחרון</option>
                <option value="month">חודש אחרון</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="waiting" dir="rtl" onValueChange={() => { setWaitingPage(1); setReleasedPage(1); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="waiting" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                ממתינים לשחרור ({waitingForRelease.length})
              </TabsTrigger>
              <TabsTrigger value="released" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                שוחררו ({releasedAnimals.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="waiting">
              {waitingForRelease.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>לא נמצאו פרוטוקולים ממתינים התואמים את הסינון</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedWaiting.map(p => {
                    const createdToday = isToday(p.created_date);
                    const canEdit = createdToday || isAdmin;
                    
                    return (
                      <div key={p.id} className={`p-3 border rounded-md transition-colors ${
                        createdToday 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <button onClick={() => handleViewOrEdit(p)} className="flex-grow text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{p.template_name} - {p.patient_name}</p>
                              {createdToday && (
                                <Badge variant="default" className="text-xs bg-yellow-600">
                                  <Clock className="w-3 h-3 ml-1" />
                                  היום
                                </Badge>
                              )}
                              {!createdToday && (
                                <Badge variant="secondary" className="text-xs">
                                  <Lock className="w-3 h-3 ml-1" />
                                  {isAdmin ? 'ניתן לצפייה' : 'נעול'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              מולא על ידי: {p.filled_by_name} בתאריך {new Date(p.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })} 
                              {' '}{new Date(p.created_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                          <div className="flex items-center gap-2">
                            {canEdit ? (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewOrEdit(p)}
                                title="עריכה/צפייה"
                              >
                                <Edit className="w-4 h-4 text-purple-600"/>
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewOrEdit(p)}
                                title="צפייה בלבד"
                              >
                                <Eye className="w-4 h-4 text-gray-400"/>
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProtocolToDelete(p);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="מחק פרוטוקול"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent parent button's onClick from firing
                                handleReleaseAnimal(p);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 ml-2" />
                              שחרר/י חיה
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  {totalWaitingPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWaitingPage(p => Math.max(1, p - 1))}
                        disabled={waitingPage === 1}
                      >
                        הקודם
                      </Button>
                      <span className="text-sm text-gray-600 font-medium">
                        עמוד {waitingPage} מתוך {totalWaitingPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWaitingPage(p => Math.min(totalWaitingPages, p + 1))}
                        disabled={waitingPage === totalWaitingPages}
                      >
                        הבא
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="released">
              {releasedAnimals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>לא נמצאו פרוטוקולים משוחררים התואמים את הסינון</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedReleased.map(p => {
                    const createdToday = isToday(p.created_date);
                    const canEdit = createdToday || isAdmin;
                    
                    return (
                      <div key={p.id} className="p-3 border rounded-md transition-colors bg-green-50 border-green-200">
                        <div className="flex justify-between items-center">
                          <button onClick={() => handleViewOrEdit(p)} className="flex-grow text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{p.template_name} - {p.patient_name}</p>
                              <Badge className="text-xs bg-green-600">
                                <CheckCircle className="w-3 h-3 ml-1" />
                                שוחרר/ה
                              </Badge>
                              {!createdToday && (
                                <Badge variant="secondary" className="text-xs">
                                  <Lock className="w-3 h-3 ml-1" />
                                  {isAdmin ? 'ניתן לצפייה' : 'נעול'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              מולא על ידי: {p.filled_by_name} בתאריך {new Date(p.created_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })} 
                              {' '}{new Date(p.created_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {p.released_by && (
                              <p className="text-xs text-green-700 mt-1">
                                ✓ שוחרר/ה ע"י: {p.released_by} בתאריך {new Date(p.released_date).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })} 
                                {' '}{new Date(p.released_date).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </button>
                          <div className="flex items-center gap-2">
                            {canEdit ? (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewOrEdit(p)}
                                title="עריכה/צפייה"
                              >
                                <Edit className="w-4 h-4 text-purple-600"/>
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewOrEdit(p)}
                                title="צפייה בלבד"
                              >
                                <Eye className="w-4 h-4 text-gray-400"/>
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProtocolToDelete(p);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="מחק פרוטוקול"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  {totalReleasedPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReleasedPage(p => Math.max(1, p - 1))}
                        disabled={releasedPage === 1}
                      >
                        הקודם
                      </Button>
                      <span className="text-sm text-gray-600 font-medium">
                        עמוד {releasedPage} מתוך {totalReleasedPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReleasedPage(p => Math.min(totalReleasedPages, p + 1))}
                        disabled={releasedPage === totalReleasedPages}
                      >
                        הבא
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
}