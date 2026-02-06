import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Phone, Mail, MapPin, Calendar, FileText, DollarSign, Plus, PawPrint, Edit, FlaskConical, Pill, Syringe, Files, Activity, X, MessageSquare, Hash, StickyNote, MessageCircle, Send, Upload, Trash2, Download, ExternalLink, Dog, Cat, Rabbit, Bird, Printer, Shield } from "lucide-react";
import moment from "moment";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PatientForm from "../components/clinic-calendar/PatientForm";
import MetricForm from "../components/metrics/MetricForm";
import VisitForm from "../components/visits/VisitForm";
import VaccinationForm from "../components/vaccinations/VaccinationForm";
import LabTestForm from "../components/lab/LabTestForm";
import LabTestSelection from "../components/lab/LabTestSelection";
import LabTestResultsUpload from "../components/lab/LabTestResultsUpload";
import BillingManager from "../components/billing/BillingManager";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function ClientFilePage() {
  const [clientId, setClientId] = useState(null);
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [isMetricFormOpen, setIsMetricFormOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [isVisitFormOpen, setIsVisitFormOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [isVaccinationFormOpen, setIsVaccinationFormOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [isLabTestFormOpen, setIsLabTestFormOpen] = useState(false);
  const [editingLabTest, setEditingLabTest] = useState(null);
  const [isLabTestSelectionOpen, setIsLabTestSelectionOpen] = useState(false);
  const [selectedTestData, setSelectedTestData] = useState(null);
  const [isLabResultsUploadOpen, setIsLabResultsUploadOpen] = useState(false);
  const [uploadingLabTest, setUploadingLabTest] = useState(null);
  const [expandedLabTest, setExpandedLabTest] = useState(null);
  const [uploadingVisitLabItem, setUploadingVisitLabItem] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setClientId(id);
    
    // Save viewing history with timestamps (24-hour expiry)
    if (id) {
      const historyKey = 'viewedClientsHistory';
      let history = [];
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      
      try {
        const stored = localStorage.getItem(historyKey);
        history = stored ? JSON.parse(stored) : [];
        
        // Filter out expired entries (older than 24 hours) and current ID
        history = history.filter(entry => 
          (now - entry.timestamp) < TWENTY_FOUR_HOURS && entry.id !== id
        );
      } catch (e) {
        history = [];
      }
      
      // Add current client to the beginning with timestamp
      history.unshift({ id, timestamp: now });
      
      // Keep only last 50 viewed clients
      history = history.slice(0, 50);
      
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  }, []);

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.Client.list();
      return clients.find(c => c.id === clientId);
    },
    enabled: !!clientId
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', clientId],
    queryFn: async () => {
      if (!client?.client_number) return [];
      const allPatients = await base44.entities.Patient.list();
      return allPatients.filter(p => p.client_number === client.client_number);
    },
    enabled: !!clientId && !!client
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['clientAppointments', clientId],
    queryFn: async () => {
      const allAppointments = await base44.entities.Appointment.list('-date', 100);
      return allAppointments.filter(a => a.client_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['clientVisits', client?.client_number],
    queryFn: async () => {
      if (!client?.client_number) return [];
      const allVisits = await base44.entities.MedicalVisit.list('-visit_date', 100);
      return allVisits.filter(v => v.client_number === client.client_number);
    },
    enabled: !!client?.client_number
  });

  const { data: billings = [] } = useQuery({
    queryKey: ['clientBillings', clientId],
    queryFn: async () => {
      const allBillings = await base44.entities.Billing.list('-billing_date', 100);
      return allBillings.filter(b => b.client_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: clientPriceList = [] } = useQuery({
    queryKey: ['clientPriceList'],
    queryFn: () => base44.entities.ClientPriceList.list('-created_date', 500)
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['clientMetrics', clientId],
    queryFn: async () => {
      const allMetrics = await base44.entities.PatientMetric.list('-measurement_date', 200);
      return allMetrics.filter(m => m.client_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: vaccinations = [] } = useQuery({
    queryKey: ['clientVaccinations', clientId],
    queryFn: async () => {
      const allVaccinations = await base44.entities.Vaccination.list('-vaccination_date', 100);
      return allVaccinations.filter(v => v.client_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['clientDocuments', clientId],
    queryFn: async () => {
      const allDocuments = await base44.entities.ClientDocument.list('-created_date', 100);
      return allDocuments.filter(d => d.client_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: labTests = [] } = useQuery({
    queryKey: ['clientLabTests', client?.client_number],
    queryFn: async () => {
      if (!client?.client_number) return [];
      const allLabTests = await base44.entities.LabTest.list('-test_date', 100);
      return allLabTests.filter(t => t.client_number === client.client_number);
    },
    enabled: !!client?.client_number
  });

  const { data: labTestTypes = [] } = useQuery({
    queryKey: ['labTestTypes'],
    queryFn: () => base44.entities.LabTestType.list('-created_date', 100)
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const allProfiles = await base44.entities.PublicProfile.list();
      return allProfiles.filter(p => p.job === 'doctor' && p.is_active);
    }
  });

  useEffect(() => {
    if (client) {
      setClientNotes(client.notes || '');
    }
  }, [client]);

  const updateClientNotesMutation = useMutation({
    mutationFn: (notes) => base44.entities.Client.update(client.id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['client', clientId]);
      toast.success('ההערות נשמרו בהצלחה');
      setIsNotesDialogOpen(false);
    }
  });

  const handleSaveNotes = () => {
    updateClientNotesMutation.mutate(clientNotes);
  };

  const handleSendEmail = () => {
    if (client.email) {
      window.location.href = `mailto:${client.email}`;
    } else {
      toast.error('אין כתובת דוא"ל ללקוח');
    }
  };

  const handleSendSMS = () => {
    if (client.phone) {
      window.location.href = `sms:${client.phone}`;
    } else {
      toast.error('אין מספר טלפון ללקוח');
    }
  };

  const handleSendWhatsApp = () => {
    if (client.phone) {
      const phoneNumber = client.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    } else {
      toast.error('אין מספר טלפון ללקוח');
    }
  };

  const createPatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['patients', clientId]);
      setIsPatientFormOpen(false);
      setEditingPatient(null);
      toast.success('המטופל נוסף בהצלחה');
    },
    onError: (error) => {
      console.error('Error creating patient:', error);
      toast.error('שגיאה בשמירת המטופל');
    }
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Patient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['patients', clientId]);
      setIsPatientFormOpen(false);
      setEditingPatient(null);
      toast.success('המטופל עודכן בהצלחה');
    },
    onError: (error) => {
      console.error('Error updating patient:', error);
      toast.error('שגיאה בעדכון המטופל');
    }
  });

  const handlePatientSubmit = async (data) => {
    try {
      if (editingPatient) {
        await updatePatientMutation.mutateAsync({ id: editingPatient.id, data });
      } else {
        // Get all patients to find the highest patient_number
        const allPatients = await base44.entities.Patient.list('-created_date', 5000);
        const patientNumbers = allPatients
          .map(p => p.patient_number)
          .filter(num => num != null && num > 0);
        
        const maxPatientNumber = patientNumbers.length > 0 
          ? Math.max(...patientNumbers)
          : 0;
        
        const patientData = {
          ...data,
          patient_number: maxPatientNumber + 1
        };
        
        await createPatientMutation.mutateAsync(patientData);
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const createMetricMutation = useMutation({
    mutationFn: (data) => base44.entities.PatientMetric.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientMetrics', clientId]);
      setIsMetricFormOpen(false);
      setEditingMetric(null);
      toast.success('המדד נוסף בהצלחה');
    }
  });

  const updateMetricMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PatientMetric.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientMetrics', clientId]);
      setIsMetricFormOpen(false);
      setEditingMetric(null);
      toast.success('המדד עודכן בהצלחה');
    }
  });

  const deleteMetricMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientMetric.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientMetrics', clientId]);
      toast.success('המדד נמחק בהצלחה');
    }
  });

  const handleMetricSubmit = (data) => {
    const finalData = {
      ...data,
      measured_by: data.measured_by || currentUser?.display_name || currentUser?.full_name
    };
    
    if (editingMetric) {
      updateMetricMutation.mutate({ id: editingMetric.id, data: finalData });
    } else {
      createMetricMutation.mutate(finalData);
    }
  };

  const handleDeleteMetric = (metricId) => {
    if (window.confirm('האם למחוק את המדד?')) {
      deleteMetricMutation.mutate(metricId);
    }
  };

  const createVisitMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalVisit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientVisits', clientId]);
      setIsVisitFormOpen(false);
      setEditingVisit(null);
      toast.success('הביקור נוסף בהצלחה');
    }
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MedicalVisit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientVisits', clientId]);
      setIsVisitFormOpen(false);
      setEditingVisit(null);
      toast.success('הביקור עודכן בהצלחה');
    }
  });

  const deleteVisitMutation = useMutation({
    mutationFn: (id) => base44.entities.MedicalVisit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientVisits', clientId]);
      toast.success('הביקור נמחק בהצלחה');
    }
  });

  const handleVisitSubmit = async (visitId) => {
    // The VisitForm component handles the save internally and marks it as completed
    // Close the form and refresh all related data
    setIsVisitFormOpen(false);
    setEditingVisit(null);
    
    // Refresh visits, appointments, billings, and lab tests to show updated data
    await queryClient.invalidateQueries(['clientVisits', client?.client_number]);
    await queryClient.invalidateQueries(['clientAppointments', clientId]);
    await queryClient.invalidateQueries(['clientBillings', clientId]);
    await queryClient.invalidateQueries(['clientLabTests', client?.client_number]);
    
    toast.success('הביקור נשמר בהצלחה ומוצג בטאב ביקורים');
  };

  const handleDeleteVisit = async (id) => {
    if (!window.confirm('האם למחוק את הביקור? כל הבדיקות, הפריטים והמרשמים הקשורים יימחקו מכל הטאבים.')) {
      return;
    }

    try {
      // Find the visit to be deleted
      const visit = visits.find(v => v.id === id);
      if (!visit) return;

      // Delete associated LabTest records created from this visit
      if (visit.lab_tests && visit.lab_tests.length > 0) {
        const allLabTests = await base44.entities.LabTest.list('-created_date', 1000);
        
        // Find LabTest records that match this visit's tests
        const labTestsToDelete = allLabTests.filter(lt => 
          lt.patient_number === visit.patient_number &&
          lt.test_date === visit.visit_date &&
          visit.lab_tests.some(vt => vt.test_name === lt.test_name)
        );

        // Delete each matching lab test
        for (const labTest of labTestsToDelete) {
          await base44.entities.LabTest.delete(labTest.id);
        }
      }

      // Delete associated billing records for this visit
      const visitBillings = billings.filter(b => b.visit_id === id);
      for (const billing of visitBillings) {
        await base44.entities.Billing.delete(billing.id);
      }

      // Now delete the visit itself
      deleteVisitMutation.mutate(id);
    } catch (error) {
      console.error('Error deleting visit and related records:', error);
      toast.error('שגיאה במחיקת הביקור');
    }
  };

  const createVaccinationMutation = useMutation({
    mutationFn: (data) => base44.entities.Vaccination.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientVaccinations', clientId]);
      setIsVaccinationFormOpen(false);
      setEditingVaccination(null);
      toast.success('החיסון נוסף בהצלחה');
    }
  });

  const updateVaccinationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vaccination.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientVaccinations', clientId]);
      setIsVaccinationFormOpen(false);
      setEditingVaccination(null);
      toast.success('החיסון עודכן בהצלחה');
    }
  });

  const deleteVaccinationMutation = useMutation({
    mutationFn: (id) => base44.entities.Vaccination.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientVaccinations', clientId]);
      toast.success('החיסון נמחק בהצלחה');
    }
  });

  const handleVaccinationSubmit = (data) => {
    if (editingVaccination) {
      updateVaccinationMutation.mutate({ id: editingVaccination.id, data });
    } else {
      createVaccinationMutation.mutate(data);
    }
  };

  const handleDeleteVaccination = (id) => {
    if (window.confirm('האם למחוק את החיסון?')) {
      deleteVaccinationMutation.mutate(id);
    }
  };

  const createDocumentMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientDocuments', clientId]);
      setIsDocumentFormOpen(false);
      toast.success('המסמך הועלה בהצלחה');
    }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientDocuments', clientId]);
      toast.success('המסמך נמחק בהצלחה');
    }
  });

  const handleDeleteDocument = (id) => {
    if (window.confirm('האם למחוק את המסמך?')) {
      deleteDocumentMutation.mutate(id);
    }
  };

  const createLabTestMutation = useMutation({
    mutationFn: (data) => base44.entities.LabTest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientLabTests', clientId]);
      setIsLabTestFormOpen(false);
      setEditingLabTest(null);
      toast.success('הבדיקה נוספה בהצלחה');
    }
  });

  const updateLabTestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LabTest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientLabTests', clientId]);
      setIsLabTestFormOpen(false);
      setEditingLabTest(null);
      toast.success('הבדיקה עודכנה בהצלחה');
    }
  });

  const deleteLabTestMutation = useMutation({
    mutationFn: (id) => base44.entities.LabTest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientLabTests', clientId]);
      toast.success('הבדיקה נמחקה בהצלחה');
    }
  });

  const handleLabTestSubmit = (data) => {
    if (editingLabTest) {
      updateLabTestMutation.mutate({ id: editingLabTest.id, data });
    } else {
      createLabTestMutation.mutate(data);
    }
  };

  const handleSelectFromPriceList = (testData) => {
    setSelectedTestData(testData);
    setIsLabTestSelectionOpen(false);
    setIsLabTestFormOpen(true);
  };

  const handleCreateNewTest = () => {
    setSelectedTestData(null);
    setIsLabTestSelectionOpen(false);
    setIsLabTestFormOpen(true);
  };

  const openLabTestSelection = () => {
    setEditingLabTest(null);
    setSelectedTestData(null);
    setIsLabTestSelectionOpen(true);
  };

  const handleDeleteLabTest = (id) => {
    if (window.confirm('האם למחוק את הבדיקה?')) {
      deleteLabTestMutation.mutate(id);
    }
  };

  const handleAddResultsToVisitLabItem = async (visitLabItem) => {
    // Create a LabTest record from the visit lab item
    const testType = labTestTypes.find(t => t.name === visitLabItem.test_name);
    
    const allExistingTests = await base44.entities.LabTest.list('-created_date', 1000);
    const maxTestNumber = allExistingTests.length > 0 
      ? Math.max(...allExistingTests.map(t => t.test_number || 0))
      : 0;

    const newLabTest = {
      test_number: maxTestNumber + 1,
      client_number: client.client_number,
      client_name: client.full_name,
      patient_number: patients.find(p => p.name === visitLabItem.patient_name)?.patient_number,
      patient_name: visitLabItem.patient_name,
      test_type_id: testType?.id || '',
      test_name: visitLabItem.test_name,
      test_date: visitLabItem.visit_date,
      results: {},
      performed_by: currentUser?.display_name || currentUser?.full_name || '',
      notes: '',
      status: 'pending'
    };

    const createdTest = await base44.entities.LabTest.create(newLabTest);
    queryClient.invalidateQueries(['clientLabTests', client?.client_number]);
    
    // Now open the upload dialog for this newly created test
    setUploadingLabTest(createdTest);
    setIsLabResultsUploadOpen(true);
  };

  // Check for follow-ups
  const pendingFollowUps = visits.filter(v => 
    v.follow_up_date && 
    !v.follow_up_completed && 
    new Date(v.follow_up_date) <= new Date()
  );

  // Calculate unbilled visits and unpaid billings
  const unbilledVisits = visits.filter(v => {
    if (v.status !== 'completed') return false;
    
    const items = [];
    
    // Items from price list (excluding lab tests - they're in lab_tests array)
    if (v.items_from_pricelist && Array.isArray(v.items_from_pricelist)) {
      const nonLabItems = v.items_from_pricelist.filter(item => {
        const priceListItem = clientPriceList.find(p => p.product_name === item.product_name);
        return priceListItem && priceListItem.category !== 'בדיקות';
      });
      items.push(...nonLabItems);
    }
    
    // ALL lab tests (whether from price list or not, as long as they have a price)
    if (v.lab_tests && Array.isArray(v.lab_tests)) {
      items.push(...v.lab_tests.filter(test => test.test_name && test.price > 0));
    }
    
    // Prescriptions with prices
    if (v.prescriptions && Array.isArray(v.prescriptions)) {
      items.push(...v.prescriptions.filter(rx => {
        return clientPriceList.some(p => p.product_name === rx.medication_name);
      }));
    }
    
    if (items.length === 0) return false;
    
    // Check if already billed
    const isBilled = billings.some(b => b.visit_id === v.id);
    return !isBilled;
  });

  const unpaidBillings = billings.filter(b => b.status !== 'paid');
  const totalOpenBillings = unbilledVisits.length + unpaidBillings.length;

  // Separate upcoming/today visits from past visits
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_date);
    visitDate.setHours(0, 0, 0, 0);
    return visitDate >= today;
  }).sort((a, b) => {
    const dateA = new Date(a.visit_date + ' ' + (a.visit_time || '00:00'));
    const dateB = new Date(b.visit_date + ' ' + (b.visit_time || '00:00'));
    return dateA - dateB; // Earliest first
  });

  const pastVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_date);
    visitDate.setHours(0, 0, 0, 0);
    return visitDate < today;
  }).sort((a, b) => {
    const dateA = new Date(a.visit_date + ' ' + (a.visit_time || '00:00'));
    const dateB = new Date(b.visit_date + ' ' + (b.visit_time || '00:00'));
    return dateB - dateA; // Most recent first
  });

  if (!clientId) {
    return <div className="text-center py-12">לא נמצא מזהה לקוח</div>;
  }

  if (isLoadingClient) {
    return <div className="text-center py-12">טוען...</div>;
  }

  if (!client) {
    return <div className="text-center py-12">לקוח לא נמצא</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">תיק לקוח</h1>
        <p className="text-gray-500">מידע מלא על הלקוח והמטופלים</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">
                    {client.client_number || '?'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">מספר לקוח</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {client.full_name}
                    {patients.some(p => p.is_insured) && <Shield className="w-5 h-5 text-blue-600" title="יש מטופל מבוטח" />}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                    {client.status === 'active' ? 'פעיל' : 'לא פעיל'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSendEmail} 
                title="שלח מייל"
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Mail className="w-4 h-4 ml-1" />
                מייל
              </Button>
              <Button 
                size="sm" 
                onClick={handleSendSMS} 
                title="שלח SMS"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <MessageSquare className="w-4 h-4 ml-1" />
                SMS
              </Button>
              <Button 
                size="sm" 
                onClick={handleSendWhatsApp} 
                title="שלח WhatsApp"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <MessageCircle className="w-4 h-4 ml-1" />
                WhatsApp
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsNotesDialogOpen(true)} 
                title="הערות"
                className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-700"
              >
                <StickyNote className="w-4 h-4 ml-1" />
                הערות
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {client.balance !== 0 && client.balance > 0 && (
            <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-full">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">יתרת חוב</p>
                  <p className="text-3xl font-bold text-red-600">₪{Math.abs(client.balance).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
          
          {client.balance !== 0 && client.balance < 0 && (
            <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-full">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">יתרת זכות</p>
                  <p className="text-3xl font-bold text-green-600">₪{Math.abs(client.balance).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {client.id_number && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Hash className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">תעודת זהות</p>
                  <p className="font-semibold text-gray-900">{client.id_number}</p>
                </div>
              </div>
            )}
            
            {client.phone && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">טלפון ראשי</p>
                  <p className="font-semibold text-gray-900" dir="ltr">{client.phone}</p>
                </div>
              </div>
            )}
            
            {client.phone_secondary && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">טלפון משני</p>
                  <p className="font-semibold text-gray-900" dir="ltr">{client.phone_secondary}</p>
                </div>
              </div>
            )}
            
            {client.email && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">אימייל</p>
                  <p className="font-semibold text-gray-900 break-all">{client.email}</p>
                </div>
              </div>
            )}
            
            {client.address && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">רחוב</p>
                  <p className="font-semibold text-gray-900">{client.address}</p>
                </div>
              </div>
            )}
            
            {client.city && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">עיר</p>
                  <p className="font-semibold text-gray-900">{client.city}</p>
                </div>
              </div>
            )}
          </div>
          
          {client.notes && (
            <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <div className="flex items-start gap-2 mb-2">
                <StickyNote className="w-5 h-5 text-yellow-600 mt-0.5" />
                <p className="text-sm font-semibold text-yellow-900">הערות</p>
              </div>
              <p className="text-sm text-gray-700 mr-7">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="patients" dir="rtl" className="relative">
        <TabsList className="flex flex-wrap w-full bg-transparent gap-1 p-0 h-auto rounded-none mb-[-2px] relative z-10">
          <TabsTrigger 
            value="patients" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-purple-500 data-[state=active]:border-b-white data-[state=active]:text-purple-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <PawPrint className="w-4 h-4 ml-2" />
            מטופלים ({patients.length})
          </TabsTrigger>
          <TabsTrigger 
            value="visits" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-blue-500 data-[state=active]:border-b-white data-[state=active]:text-blue-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <FileText className="w-4 h-4 ml-2" />
            ביקורים ({visits.length})
          </TabsTrigger>
          <TabsTrigger 
            value="billing" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-green-500 data-[state=active]:border-b-white data-[state=active]:text-green-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <DollarSign className="w-4 h-4 ml-2" />
            חיובים
            {totalOpenBillings > 0 && (
              <Badge className="bg-red-600 text-white mr-2 text-xs">
                {totalOpenBillings}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="lab" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-teal-500 data-[state=active]:border-b-white data-[state=active]:text-teal-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <FlaskConical className="w-4 h-4 ml-2" />
            מעבדה
          </TabsTrigger>
          <TabsTrigger 
            value="prescriptions" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-indigo-500 data-[state=active]:border-b-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <Pill className="w-4 h-4 ml-2" />
            מרשמים
          </TabsTrigger>
          <TabsTrigger 
            value="vaccines" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-pink-500 data-[state=active]:border-b-white data-[state=active]:text-pink-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <Syringe className="w-4 h-4 ml-2" />
            חיסונים
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-amber-500 data-[state=active]:border-b-white data-[state=active]:text-amber-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <Files className="w-4 h-4 ml-2" />
            מסמכים
          </TabsTrigger>
          <TabsTrigger 
            value="metrics" 
            className="flex-1 min-w-[140px] rounded-t-xl rounded-b-none border-2 border-gray-300 bg-gray-200 text-gray-600 font-semibold pt-3 pb-3 px-4 z-10
                       data-[state=active]:bg-white data-[state=active]:border-rose-500 data-[state=active]:border-b-white data-[state=active]:text-rose-700 data-[state=active]:shadow-lg data-[state=active]:pt-4 data-[state=active]:pb-5 data-[state=active]:z-30
                       hover:bg-gray-50 transition-all relative"
          >
            <Activity className="w-4 h-4 ml-2" />
            מדדים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>מטופלים</CardTitle>
                <Button size="sm" onClick={() => { setEditingPatient(null); setIsPatientFormOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף מטופל
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <p className="text-center py-8 text-gray-500">אין מטופלים רשומים</p>
              ) : (
                <>
                  {(() => {
                    // Group patients by species
                    const groupedPatients = patients.reduce((acc, patient) => {
                      const species = patient.species || 'אחר';
                      if (!acc[species]) {
                        acc[species] = [];
                      }
                      acc[species].push(patient);
                      return acc;
                    }, {});

                    // Species colors and icons
                    const speciesStyles = {
                      'כלב': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', icon: '🐕', cardBorder: 'border-amber-200' },
                      'חתול': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', icon: '🐈', cardBorder: 'border-purple-200' },
                      'ארנב': { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-800', icon: '🐰', cardBorder: 'border-pink-200' },
                      'תוכי': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', icon: '🦜', cardBorder: 'border-green-200' },
                      'חמוס': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', icon: '🐹', cardBorder: 'border-orange-200' },
                      'שרקן': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800', icon: '🦎', cardBorder: 'border-teal-200' },
                      'אחר': { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', icon: '🐾', cardBorder: 'border-gray-200' }
                    };

                    return Object.entries(groupedPatients).map(([species, speciesPatients]) => {
                      const style = speciesStyles[species] || speciesStyles['אחר'];
                      return (
                        <div key={species} className="mb-8 last:mb-0">
                          <div className={`flex items-center gap-3 mb-4 p-4 rounded-xl ${style.bg} border-2 ${style.border} shadow-sm`}>
                            <span className="text-4xl">{style.icon}</span>
                            <div>
                              <h3 className={`text-2xl font-bold ${style.text}`}>{species}</h3>
                              <p className="text-sm text-gray-600 font-medium">{speciesPatients.length} מטופלים</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {speciesPatients.map(patient => {
                              const patientAppointments = appointments.filter(apt => apt.patient_id === patient.id);
                              const upcomingAppointments = patientAppointments.filter(apt => 
                                new Date(apt.date) >= new Date() && apt.status !== 'cancelled'
                              );
                              const patientVisits = visits.filter(v => v.patient_id === patient.id);
                              const hasFollowUp = patientVisits.some(v => v.follow_up_date && !v.follow_up_completed);
                              
                              return (
                                <div key={patient.id} className={`p-4 border-2 ${style.cardBorder} rounded-lg hover:shadow-lg transition-all bg-white h-full flex flex-col`}>
                        <div className="flex flex-col items-center mb-4">
                          {patient.photo_url ? (
                            <img 
                              src={patient.photo_url} 
                              alt={patient.name} 
                              className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-md mb-3"
                            />
                          ) : (
                            <div className={`w-24 h-24 rounded-full ${style.bg} flex items-center justify-center border-4 ${style.border} mb-3`}>
                              {(() => {
                                const iconMap = {
                                  'כלב': Dog,
                                  'חתול': Cat,
                                  'ארנב': Rabbit,
                                  'תוכי': Bird,
                                  'חמוס': PawPrint,
                                  'שרקן': PawPrint,
                                  'אחר': PawPrint
                                };
                                const Icon = iconMap[patient.species] || PawPrint;
                                return <Icon className={`w-12 h-12 ${style.text}`} />;
                              })()}
                            </div>
                          )}
                          <h3 className="font-bold text-lg text-center">{patient.name}</h3>
                          <p className="text-sm text-gray-500 text-center">{patient.species} • {patient.breed}</p>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap gap-2 justify-center">
                            <Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>
                              {patient.status === 'active' ? 'פעיל' : patient.inactive_reason || 'לא פעיל'}
                            </Badge>
                            {patient.is_insured && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                מבוטח
                              </Badge>
                            )}
                            {hasFollowUp && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                                מעקב
                              </Badge>
                            )}
                            {upcomingAppointments.length > 0 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1 text-xs">
                                <Calendar className="w-3 h-3" />
                                {upcomingAppointments.length}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm space-y-2 text-center">
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-600">
                                <span className="font-medium">{patient.sex}</span>
                                {patient.neutered && <span className="text-blue-600 mr-2">• {patient.sex === 'זכר' ? 'מסורס' : 'מעוקרת'}</span>}
                              </p>
                              {patient.date_of_birth && (
                               <p className="text-gray-600">
                                 גיל: {(() => {
                                   // Parse birth date - support multiple formats
                                   const birthDate = moment(patient.date_of_birth, ['YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY'], true);

                                   // If invalid date, return error
                                   if (!birthDate.isValid()) {
                                     return 'תאריך לא תקין';
                                   }

                                   const today = moment();
                                   const years = today.diff(birthDate, 'years');
                                   const months = today.diff(birthDate.clone().add(years, 'years'), 'months');

                                   if (years === 0 && months === 0) return 'פחות מחודש';
                                   if (years === 0) return `${months} חודשים`;
                                   if (months === 0) return `${years} שנים`;
                                   return `${years} שנים ו-${months} חודשים`;
                                 })()}
                               </p>
                              )}
                              {patient.weight && <p className="text-gray-600">משקל: {patient.weight} ק"ג</p>}
                              {patient.microchip && (
                                <p className="text-gray-600 text-xs">שבב: {patient.microchip}</p>
                              )}
                            </div>
                            {((patient.allergies && patient.allergies !== '-') || (patient.chronic_conditions && patient.chronic_conditions !== '-')) && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded text-xs border border-yellow-200">
                                {patient.allergies && patient.allergies !== '-' && <p className="text-red-600">⚠ אלרגיות</p>}
                                {patient.chronic_conditions && patient.chronic_conditions !== '-' && <p className="text-orange-600">⚠ מחלות כרוניות</p>}
                              </div>
                            )}
                            {patient.description && (
                              <p className="text-xs mt-2 text-gray-500 text-center line-clamp-2">{patient.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingPatient(patient); setIsPatientFormOpen(true); }}
                            className="w-full"
                          >
                            <Edit className="w-4 h-4 ml-2" />
                            ערוך פרטים
                          </Button>
                        </div>
                        </div>
                            );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>ביקורים רפואיים</CardTitle>
                  {pendingFollowUps.length > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      {pendingFollowUps.length} מעקבים ממתינים
                    </Badge>
                  )}
                </div>
                <Button size="sm" onClick={() => { setEditingVisit(null); setIsVisitFormOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  ביקור חדש
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {visits.length === 0 && appointments.length === 0 ? (
                <p className="text-center py-8 text-gray-500">אין ביקורים או תורים רשומים</p>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Filter out appointments that already have a linked visit
                    const appointmentIdsWithVisits = visits.map(v => v.appointment_id).filter(Boolean);
                    const appointmentsWithoutVisits = appointments.filter(apt => !appointmentIdsWithVisits.includes(apt.id));

                    // Debug logging
                    console.log('All visits:', visits.map(v => ({ id: v.id, appointment_id: v.appointment_id, patient: v.patient_name })));
                    console.log('Appointment IDs with visits:', appointmentIdsWithVisits);
                    console.log('All appointments:', appointments.map(a => ({ id: a.id, patient: a.patient_name })));
                    console.log('Appointments without visits:', appointmentsWithoutVisits.map(a => ({ id: a.id, patient: a.patient_name })));

                    if (appointmentsWithoutVisits.length === 0) return null;

                    return (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Badge className="bg-purple-600">
                            תורים קבועים
                          </Badge>
                          <span className="text-sm text-gray-500">- {appointmentsWithoutVisits.length} תורים</span>
                        </h3>
                        <div className="space-y-3">
                          {appointmentsWithoutVisits.map((apt, index) => {
                            const aptDate = new Date(apt.date);
                            const isPast = aptDate < today;
                            const isCancelled = apt.status === 'cancelled' || apt.status === 'no_show';
                          
                          return (
                            <div key={apt.id} className={`p-4 border-2 rounded-lg hover:shadow-md transition-shadow ${
                              isCancelled ? 'border-gray-300 bg-gray-50 opacity-60' :
                              isPast ? 'border-gray-200 bg-white' : 
                              'border-purple-200 bg-purple-50/30'
                            }`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className={`${
                                      isCancelled ? 'bg-gray-100 text-gray-600' :
                                      isPast ? 'bg-gray-100 text-gray-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                      תור #{index + 1}
                                    </Badge>
                                    <p className="font-semibold text-lg">{apt.patient_name}</p>
                                    <Badge variant="outline" className={`text-xs ${
                                      apt.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                                      apt.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                                      apt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                      apt.status === 'no_show' ? 'bg-red-50 text-red-700' :
                                      apt.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                                      'bg-yellow-50 text-yellow-700'
                                    }`}>
                                      {apt.status === 'scheduled' ? 'נקבע' :
                                       apt.status === 'confirmed' ? 'אושר' :
                                       apt.status === 'completed' ? 'הושלם' :
                                       apt.status === 'no_show' ? 'לא הגיע' :
                                       apt.status === 'cancelled' ? 'בוטל' :
                                       apt.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    📅 {formatDate(apt.date)} • ⏰ {apt.start_time} - {apt.end_time} ({apt.duration_minutes} דק׳)
                                  </p>
                                  <p className="text-sm text-gray-600 mb-2">
                                    👨‍⚕️ {apt.doctor_name}
                                  </p>
                                  <p className="text-sm mb-2">
                                    <strong>סוג ביקור:</strong> {apt.appointment_type_name}
                                  </p>
                                  {apt.chief_complaint && (
                                    <p className="text-sm mb-2">
                                      <strong>סיבת הגעה:</strong> {apt.chief_complaint}
                                    </p>
                                  )}
                                  {apt.reception_notes && (
                                    <p className="text-sm text-gray-500 p-2 bg-yellow-50 rounded border border-yellow-200">
                                      💬 {apt.reception_notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {!isCancelled && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        // Find or create visit for this appointment
                                        const linkedVisit = visits.find(v => v.appointment_id === apt.id);
                                        if (linkedVisit) {
                                          setEditingVisit(linkedVisit);
                                        } else {
                                          // Prepare initial visit data from appointment
                                          const aptPatient = patients.find(p => p.id === apt.patient_id);
                                          setEditingVisit({
                                            appointment_id: apt.id,
                                            client_number: client.client_number,
                                            patient_number: aptPatient?.patient_number || null,
                                            full_name: client.full_name,
                                            client_name: apt.client_name,
                                            patient_name: apt.patient_name,
                                            doctor_name: apt.doctor_name,
                                            visit_date: apt.date,
                                            visit_time: apt.start_time,
                                            chief_complaint: apt.chief_complaint || '',
                                            status: 'draft'
                                          });
                                        }
                                        setIsVisitFormOpen(true);
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <FileText className="w-4 h-4 ml-1" />
                                      {visits.find(v => v.appointment_id === apt.id) ? 'ערוך ביקור' : 'צור ביקור'}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <Link to={createPageUrl("ClinicCalendar")}>
                                      📆 ליומן
                                    </Link>
                                  </Button>
                                  </div>
                                  </div>
                                  </div>
                                  );
                                  })}
                                  </div>
                                  </div>
                                  );
                                  })()}

                                  {upcomingVisits.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Badge className="bg-blue-600">
                          ביקורים ממתינים
                        </Badge>
                        <span className="text-sm text-gray-500">- {upcomingVisits.length} ביקורים</span>
                      </h3>
                      <div className="space-y-3">
                        {upcomingVisits.map((visit, index) => {
                          const needsFollowUp = visit.follow_up_date && !visit.follow_up_completed && new Date(visit.follow_up_date) <= new Date();
                          const isLinkedToAppointment = !!visit.appointment_id;
                          return (
                            <div key={visit.id} className={`p-4 border-2 rounded-lg hover:shadow-md transition-shadow ${needsFollowUp ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50/30'}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                      #{index + 1}
                                    </Badge>
                                    <p className="font-semibold text-lg">{visit.patient_name}</p>
                                    {isLinkedToAppointment && (
                                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                        📅 מקושר לתור
                                      </Badge>
                                    )}
                                    {needsFollowUp && (
                                      <Badge variant="destructive">דרוש מעקב!</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mb-2">
                                    {formatDate(visit.visit_date)} {visit.visit_time && `• ${visit.visit_time}`} • {visit.doctor_name}
                                  </p>
                                  {visit.chief_complaint && (
                                    <p className="text-sm mb-2"><strong>סיבת הביקור:</strong> {visit.chief_complaint}</p>
                                  )}
                                  {visit.diagnosis && <p className="text-sm mb-2"><strong>אבחנה:</strong> {visit.diagnosis}</p>}
                                  {visit.treatment && <p className="text-sm mb-2"><strong>טיפול:</strong> {visit.treatment}</p>}
                                  {visit.prescriptions && visit.prescriptions.length > 0 && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                      <p className="text-sm font-semibold text-blue-900">מרשמים:</p>
                                      {visit.prescriptions.map((rx, idx) => (
                                        <p key={idx} className="text-xs text-blue-700">• {rx.medication_name} - {rx.dosage}</p>
                                      ))}
                                    </div>
                                  )}
                                  {visit.follow_up_date && (
                                    <p className="text-sm mt-2 text-orange-600">
                                      מעקב: {formatDate(visit.follow_up_date)}
                                      {visit.follow_up_completed && ' ✓'}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {(currentUser?.job === 'doctor' || currentUser?.role === 'admin') ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setEditingVisit(visit); setIsVisitFormOpen(true); }}
                                        title="ערוך"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteVisit(visit.id)}
                                        title="מחק ביקור"
                                      >
                                        <X className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => { setEditingVisit(visit); setIsVisitFormOpen(true); }}
                                      title="צפה"
                                    >
                                      צפה
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pastVisits.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Badge className="bg-gray-600">
                          היסטוריית ביקורים
                        </Badge>
                        <span className="text-sm text-gray-500">- {pastVisits.length} ביקורים</span>
                      </h3>
                      <div className="space-y-3">
                        {pastVisits.map((visit, index) => {
                          const needsFollowUp = visit.follow_up_date && !visit.follow_up_completed && new Date(visit.follow_up_date) <= new Date();
                          const isLinkedToAppointment = !!visit.appointment_id;
                          return (
                            <div key={visit.id} className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${needsFollowUp ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                      #{index + 1}
                                    </Badge>
                                    <p className="font-semibold text-lg">{visit.patient_name}</p>
                                    {isLinkedToAppointment && (
                                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                        📅 מקושר לתור
                                      </Badge>
                                    )}
                                    {needsFollowUp && (
                                      <Badge variant="destructive">דרוש מעקב!</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mb-2">
                                    {formatDate(visit.visit_date)} {visit.visit_time && `• ${visit.visit_time}`} • {visit.doctor_name}
                                  </p>
                                  {visit.chief_complaint && (
                                    <p className="text-sm mb-2"><strong>סיבת הביקור:</strong> {visit.chief_complaint}</p>
                                  )}
                                  {visit.diagnosis && <p className="text-sm mb-2"><strong>אבחנה:</strong> {visit.diagnosis}</p>}
                                  {visit.treatment && <p className="text-sm mb-2"><strong>טיפול:</strong> {visit.treatment}</p>}
                                  {visit.prescriptions && visit.prescriptions.length > 0 && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                      <p className="text-sm font-semibold text-blue-900">מרשמים:</p>
                                      {visit.prescriptions.map((rx, idx) => (
                                        <p key={idx} className="text-xs text-blue-700">• {rx.medication_name} - {rx.dosage}</p>
                                      ))}
                                    </div>
                                  )}
                                  {visit.follow_up_date && (
                                    <p className="text-sm mt-2 text-orange-600">
                                      מעקב: {formatDate(visit.follow_up_date)}
                                      {visit.follow_up_completed && ' ✓'}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {(currentUser?.job === 'doctor' || currentUser?.role === 'admin') ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setEditingVisit(visit); setIsVisitFormOpen(true); }}
                                        title="ערוך"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteVisit(visit.id)}
                                        title="מחק ביקור"
                                      >
                                        <X className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => { setEditingVisit(visit); setIsVisitFormOpen(true); }}
                                      title="צפה"
                                    >
                                      צפה
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardContent className="pt-6">
              <BillingManager 
            clientId={clientId}
            clientName={client.full_name}
            visits={visits}
            onRefresh={() => {
              queryClient.invalidateQueries(['clientBillings', clientId]);
              queryClient.invalidateQueries(['client', clientId]);
            }}
          />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>בדיקות מעבדה</CardTitle>
                <Button size="sm" onClick={openLabTestSelection}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף בדיקה
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Collect all lab-related items - AVOIDING DUPLICATES
                const allLabItems = [];
                const seenTests = new Set(); // Track unique tests: patient_number + test_name + test_date
                
                // First, add standalone LabTest records
                labTests.forEach(test => {
                  const uniqueKey = `${test.patient_number}-${test.test_name}-${test.test_date}`;
                  if (!seenTests.has(uniqueKey)) {
                    seenTests.add(uniqueKey);
                    allLabItems.push({
                      ...test,
                      source: 'labtest',
                      id: test.id
                    });
                  }
                });
                
                // Then, add lab tests from visits ONLY if not already added
                visits.forEach(visit => {
                  const patientNum = visit.patient_number;
                  
                  // Lab tests from visit.lab_tests array
                  if (visit.lab_tests && Array.isArray(visit.lab_tests)) {
                    visit.lab_tests.forEach(test => {
                      const uniqueKey = `${patientNum}-${test.test_name}-${visit.visit_date}`;
                      if (!seenTests.has(uniqueKey)) {
                        seenTests.add(uniqueKey);
                        allLabItems.push({
                          source: 'visit',
                          visit_id: visit.id,
                          visit_date: visit.visit_date,
                          patient_number: patientNum,
                          patient_name: visit.patient_name,
                          test_name: test.test_name,
                          from_price_list: test.from_price_list,
                          price: test.price,
                          results: test.results,
                          status: test.status || 'בוצעה בביקור'
                        });
                      }
                    });
                  }
                  
                  // Lab tests from items_from_pricelist that are actually lab tests
                  if (visit.items_from_pricelist && Array.isArray(visit.items_from_pricelist)) {
                    visit.items_from_pricelist.forEach(item => {
                      const priceListItem = clientPriceList.find(p => p.product_name === item.product_name);
                      if (priceListItem && (priceListItem.sub_category === 'בדיקות מעבדה' || priceListItem.category === 'בדיקות')) {
                        const uniqueKey = `${patientNum}-${item.product_name}-${visit.visit_date}`;
                        if (!seenTests.has(uniqueKey)) {
                          seenTests.add(uniqueKey);
                          allLabItems.push({
                            source: 'pricelist',
                            visit_id: visit.id,
                            visit_date: visit.visit_date,
                            patient_number: patientNum,
                            patient_name: visit.patient_name,
                            test_name: item.product_name,
                            quantity: item.quantity || 1,
                            price: item.price,
                            status: 'נרכשה'
                          });
                        }
                      }
                    });
                  }
                });

                const hasAnyLabData = allLabItems.length > 0;

                if (!hasAnyLabData) {
                  return <p className="text-center py-8 text-gray-500">אין בדיקות מעבדה רשומות</p>;
                }

                return (
                  <>
                    {(() => {
                      // Group all lab items by patient (no duplicates already)
                      const testsByPatient = allLabItems.reduce((acc, test) => {
                        const patientName = test.patient_name || 'לא ידוע';
                        if (!acc[patientName]) {
                          acc[patientName] = [];
                        }
                        acc[patientName].push(test);
                        return acc;
                      }, {});

                      return Object.entries(testsByPatient).map(([patientName, patientTests]) => {
                        const patient = patients.find(p => p.name === patientName);
                        const totalTests = patientTests.length;
                        const completedTests = patientTests.filter(t => t.status === 'completed' || t.status === 'reviewed' || t.status === 'בוצעה בביקור').length;
                        const pendingTests = patientTests.filter(t => t.status === 'pending').length;
                        const purchasedTests = patientTests.filter(t => t.status === 'נרכשה').length;
                        
                        // Sort tests by date (most recent first)
                        const sortedTests = [...patientTests].sort((a, b) => {
                          const dateA = new Date(a.test_date || a.visit_date);
                          const dateB = new Date(b.test_date || b.visit_date);
                          return dateB - dateA;
                        });

                      return (
                        <div key={patientName} className="mb-6 last:mb-0">
                          <div className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-purple-50 border-2 border-purple-300 shadow-sm">
                            {patient?.photo_url ? (
                              <img src={patient.photo_url} alt={patientName} className="w-16 h-16 rounded-full object-cover border-2 border-purple-400" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-400">
                                <PawPrint className="w-8 h-8 text-purple-600" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-purple-900">{patientName}</h3>
                              <p className="text-sm text-gray-600">
                                {patient?.species} {patient?.breed && `• ${patient.breed}`}
                              </p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  <Badge className="bg-purple-600 text-white">
                                    {totalTests} בדיקות
                                  </Badge>
                                  {pendingTests > 0 && (
                                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                      {pendingTests} ממתינות
                                    </Badge>
                                  )}
                                  {completedTests > 0 && (
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                      {completedTests} הושלמו
                                    </Badge>
                                  )}
                                  {purchasedTests > 0 && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                      {purchasedTests} נרכשו
                                    </Badge>
                                  )}
                                </div>
                            </div>
                          </div>

                              <div className="space-y-3 pr-4">
                                {sortedTests.map((test, idx) => {
                                  // Check if this is from a visit (pricelist item) or a lab test record
                                  const isFromVisit = test.source === 'visit' || test.source === 'pricelist';
                                  const hasResults = test.results && Object.keys(test.results).length > 0;
                                  const testType = test.test_type_id ? labTestTypes.find(t => t.id === test.test_type_id) : null;
                                  const testTypeByName = isFromVisit ? labTestTypes.find(t => t.name === test.test_name) : null;
                                  const isExpanded = expandedLabTest === (test.id || `visit-${test.visit_id}-${idx}`);
                                  const expandKey = test.id || `visit-${test.visit_id}-${idx}`;
                                  
                                  return (
                                    <div key={expandKey} className={`border-2 rounded-lg hover:shadow-md transition-shadow ${
                                      isFromVisit ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'
                                    }`}>
                                      <div className="p-4">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              {test.test_number && (
                                                <Badge variant="outline" className="bg-gray-100 text-gray-700 font-mono">
                                                  #{test.test_number}
                                                </Badge>
                                              )}
                                              <h3 className="font-semibold text-lg">{test.test_name}</h3>
                                              <Badge variant={
                                                test.status === 'reviewed' ? 'default' : 
                                                test.status === 'completed' ? 'secondary' : 
                                                test.status === 'pending' ? 'outline' :
                                                test.status === 'נרכשה' ? 'default' :
                                                'secondary'
                                              } className={
                                                test.status === 'נרכשה' ? 'bg-blue-600' :
                                                test.status === 'בוצעה בביקור' ? 'bg-green-600' : ''
                                              }>
                                                {test.status === 'completed' ? 'הושלמה' : 
                                                 test.status === 'reviewed' ? 'נבדקה' : 
                                                 test.status === 'pending' ? 'ממתינה' :
                                                 test.status}
                                              </Badge>
                                              {isFromVisit && (
                                                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                                  מביקור
                                                </Badge>
                                              )}
                                              {testTypeByName && (
                                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                                                  ניתן לחילוץ אוטומטי
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">
                                              {formatDate(test.test_date || test.visit_date)}
                                              {test.performed_by && ` • ${test.performed_by}`}
                                              {test.quantity > 1 && ` • כמות: ${test.quantity}`}
                                            </p>
                                            {test.price && (
                                              <p className="text-sm text-blue-600 font-semibold">
                                                מחיר: ₪{(test.price * (test.quantity || 1)).toFixed(2)}
                                              </p>
                                            )}
                                            {!isExpanded && hasResults && (
                                              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                                <p className="text-sm font-semibold text-blue-900 mb-1">תוצאות:</p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                                  {Object.entries(test.results).slice(0, 6).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between">
                                                      <span className="text-gray-600">{key}:</span>
                                                      <span className="font-semibold text-blue-700">{value}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                                {Object.keys(test.results).length > 6 && (
                                                  <p className="text-xs text-gray-500 mt-1">ועוד {Object.keys(test.results).length - 6} תוצאות...</p>
                                                )}
                                              </div>
                                            )}
                                            </div>
                                          <div className="flex gap-2">
                                            {isFromVisit ? (
                                              <>
                                                <Button
                                                  variant="default"
                                                  size="sm"
                                                  onClick={() => handleAddResultsToVisitLabItem(test)}
                                                  className="bg-green-600 hover:bg-green-700"
                                                >
                                                  <Upload className="w-4 h-4 ml-1" />
                                                  הוסף תוצאות
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => setExpandedLabTest(isExpanded ? null : expandKey)}
                                                >
                                                  {isExpanded ? 'הסתר' : 'הרחב'}
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {test.status === 'pending' && (
                                                  <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => { setUploadingLabTest(test); setIsLabResultsUploadOpen(true); }}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                  >
                                                    <Upload className="w-4 h-4 ml-1" />
                                                    הוסף תוצאות
                                                  </Button>
                                                )}
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => setExpandedLabTest(isExpanded ? null : test.id)}
                                                >
                                                  {isExpanded ? 'הסתר' : 'הרחב'}
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => handleDeleteLabTest(test.id)}
                                                >
                                                  <X className="w-4 h-4 text-red-600" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {isExpanded && (
                                        <div className="border-t p-4 bg-gray-50">
                                          {isFromVisit ? (
                                            <div className="text-center py-6 text-gray-500">
                                              <p className="text-sm mb-2">בדיקה זו נרכשה בביקור</p>
                                              <p className="text-xs">להוספת תוצאות, לחץ על "הוסף תוצאות"</p>
                                            </div>
                                          ) : hasResults && testType?.parameters ? (
                                            <div className="space-y-3">
                                              <h4 className="font-semibold text-sm mb-2">פרמטרים מפורטים:</h4>
                                              {testType.parameters.map((param, idx) => {
                                                const value = test.results[param.name];
                                                const hasRange = param.min_normal !== undefined && param.max_normal !== undefined;
                                                const isOutOfRange = hasRange && value && (parseFloat(value) < parseFloat(param.min_normal) || parseFloat(value) > parseFloat(param.max_normal));
                                                
                                                return (
                                                  <div key={idx} className={`p-2 rounded border text-sm ${isOutOfRange ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                                                    <div className="flex justify-between items-center">
                                                      <span className="font-medium">{param.name}</span>
                                                      <span className={`font-semibold ${isOutOfRange ? 'text-red-700' : 'text-blue-700'}`}>
                                                        {value || '-'} {param.unit && `${param.unit}`}
                                                      </span>
                                                    </div>
                                                    {hasRange && (
                                                      <div className="text-xs text-gray-500 mt-1">
                                                        טווח תקין: {param.min_normal} - {param.max_normal}
                                                        {isOutOfRange && <span className="text-red-600 font-semibold mr-2">⚠ חריג מהנורמה</span>}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : hasResults ? (
                                            <div className="space-y-2">
                                              <h4 className="font-semibold text-sm mb-2">תוצאות:</h4>
                                              {Object.entries(test.results).map(([key, value]) => (
                                                <div key={key} className="flex justify-between p-2 bg-white rounded border text-sm">
                                                  <span className="text-gray-600">{key}:</span>
                                                  <span className="font-semibold text-blue-700">{value}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-sm text-gray-500">אין תוצאות זמינות</p>
                                          )}
                                          
                                          {test.results_file_url && (
                                            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                                              <p className="text-sm font-semibold text-blue-900 mb-2">קובץ תוצאות מצורף:</p>
                                              <a 
                                                href={test.results_file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                              >
                                                <ExternalLink className="w-4 h-4" />
                                                צפה בקובץ
                                              </a>
                                            </div>
                                          )}
                                          
                                          {test.notes && (
                                            <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                                              <p className="text-sm font-semibold text-yellow-900">הערות:</p>
                                              <p className="text-sm text-gray-700">{test.notes}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>מרשמים</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Collect all prescriptions from all visits
                const allPrescriptions = visits.flatMap(visit => 
                  (visit.prescriptions || []).map(rx => ({
                    ...rx,
                    visit_id: visit.id,
                    visit_date: visit.visit_date,
                    visit_time: visit.visit_time,
                    patient_name: visit.patient_name,
                    doctor_name: visit.doctor_name
                  }))
                );

                if (allPrescriptions.length === 0) {
                  return <p className="text-center py-8 text-gray-500">אין מרשמים רשומים</p>;
                }

                // Group prescriptions by patient
                const prescriptionsByPatient = allPrescriptions.reduce((acc, rx) => {
                  const patientName = rx.patient_name || 'לא ידוע';
                  if (!acc[patientName]) {
                    acc[patientName] = [];
                  }
                  acc[patientName].push(rx);
                  return acc;
                }, {});

                return Object.entries(prescriptionsByPatient).map(([patientName, patientPrescriptions]) => {
                  const patient = patients.find(p => p.name === patientName);
                  const totalPrescriptions = patientPrescriptions.length;

                  // Sort prescriptions by date (most recent first)
                  const sortedPrescriptions = [...patientPrescriptions].sort((a, b) => {
                    const dateA = new Date(a.visit_date);
                    const dateB = new Date(b.visit_date);
                    return dateB - dateA;
                  });

                  return (
                    <div key={patientName} className="mb-6 last:mb-0">
                      <div className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-blue-50 border-2 border-blue-300 shadow-sm">
                        {patient?.photo_url ? (
                          <img src={patient.photo_url} alt={patientName} className="w-16 h-16 rounded-full object-cover border-2 border-blue-400" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-400">
                            <PawPrint className="w-8 h-8 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-blue-900">{patientName}</h3>
                          <p className="text-sm text-gray-600">
                            {patient?.species} {patient?.breed && `• ${patient.breed}`}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge className="bg-blue-600 text-white">
                              {totalPrescriptions} מרשמים
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pr-4">
                        {sortedPrescriptions.map((rx, index) => {
                          const doctor = doctors.find(d => d.display_name === rx.doctor_name);

                          return (
                            <div key={`${rx.visit_id}-${index}`} className="border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-blue-50/30">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                      מרשם #{index + 1}
                                    </Badge>
                                    <h3 className="font-bold text-lg text-blue-900">{rx.medication_name}</h3>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    <strong>רופא מטפל:</strong> {rx.doctor_name}
                                  </p>
                                  <p className="text-sm text-gray-500 mb-3">
                                    📅 {formatDate(rx.visit_date)} {rx.visit_time && `• ${rx.visit_time}`}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const clientData = { 
                                      full_name: client.full_name, 
                                      phone: client.phone || '', 
                                      address: client.address || '' 
                                    };
                                    const pdfContent = PrescriptionPDF({ 
                                      prescription: rx, 
                                      patient, 
                                      doctor: { ...doctor, license_number: doctor?.id_number }, 
                                      client: clientData 
                                    });
                                    const printWindow = window.open('', '_blank');
                                    printWindow.document.write(pdfContent);
                                    printWindow.document.close();
                                  }}
                                  title="הדפס מרשם"
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-700"
                                >
                                  <Printer className="w-4 h-4 ml-1" />
                                  הדפס
                                </Button>
                              </div>

                              <div className="bg-white rounded-lg p-3 space-y-2 border border-blue-200">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-500 text-xs mb-1">מינון</p>
                                    <p className="font-semibold text-blue-900">{rx.dosage}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-xs mb-1">משך השימוש</p>
                                    <p className="font-semibold text-blue-900">{rx.duration}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-xs mb-1">צורת מתן</p>
                                    <p className="font-semibold text-blue-900">{rx.administration_method}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-xs mb-1">תדירות</p>
                                    <p className="font-semibold text-blue-900">{rx.frequency}</p>
                                  </div>
                                </div>

                                {rx.instructions && (
                                  <div className="pt-2 border-t">
                                    <p className="text-gray-500 text-xs mb-1">הנחיות</p>
                                    <p className="text-sm text-gray-700">{rx.instructions}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vaccines" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>חיסונים וטיפולים מונעים</CardTitle>
                <Button size="sm" onClick={() => { setEditingVaccination(null); setIsVaccinationFormOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף חיסון
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vaccinations.length === 0 ? (
                <p className="text-center py-8 text-gray-500">אין חיסונים רשומים</p>
              ) : (
                <div className="space-y-3">
                  {vaccinations.map(vacc => {
                    const needsReminder = vacc.next_vaccination_date && new Date(vacc.next_vaccination_date) <= new Date();
                    const firstReminderDue = vacc.first_reminder_date && new Date(vacc.first_reminder_date) <= new Date() && new Date(vacc.next_vaccination_date) > new Date();
                    const secondReminderDue = vacc.second_reminder_date && new Date(vacc.second_reminder_date) <= new Date() && new Date(vacc.next_vaccination_date) > new Date();
                    
                    return (
                      <div key={vacc.id} className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${needsReminder ? 'border-red-300 bg-red-50' : firstReminderDue || secondReminderDue ? 'border-orange-300 bg-orange-50' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{vacc.patient_name}</h3>
                              {needsReminder && (
                                <Badge variant="destructive">דרוש חיסון!</Badge>
                              )}
                              {(firstReminderDue || secondReminderDue) && !needsReminder && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-700">תזכורת</Badge>
                              )}
                            </div>
                            <p className="font-semibold text-blue-600 mb-2">{vacc.vaccination_type}</p>
                            <div className="text-sm space-y-1">
                              <p><strong>תאריך חיסון:</strong> {formatDate(vacc.vaccination_date)}</p>
                              {vacc.next_vaccination_date && (
                                <p><strong>מועד הבא:</strong> {formatDate(vacc.next_vaccination_date)}</p>
                              )}
                              {vacc.first_reminder_date && (
                                <p className="text-orange-600"><strong>תזכורת ראשונה:</strong> {formatDate(vacc.first_reminder_date)}</p>
                              )}
                              {vacc.second_reminder_date && (
                                <p className="text-orange-600"><strong>תזכורת שנייה:</strong> {formatDate(vacc.second_reminder_date)}</p>
                              )}
                              {vacc.batch_number && (
                                <p><strong>מס' אצווה:</strong> {vacc.batch_number}</p>
                              )}
                              {vacc.administered_by && (
                                <p className="text-gray-500">מבצע: {vacc.administered_by}</p>
                              )}
                              {vacc.notes && (
                                <p className="text-gray-600 mt-2 p-2 bg-white rounded border">{vacc.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingVaccination(vacc); setIsVaccinationFormOpen(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteVaccination(vacc.id)}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>מסמכים</CardTitle>
                <Button size="sm" onClick={() => setIsDocumentFormOpen(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף מסמך
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-center py-8 text-gray-500">אין מסמכים מצורפים</p>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Files className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-lg">{doc.document_name}</h3>
                          </div>
                          {doc.patient_name && (
                            <p className="text-sm text-gray-600 mb-1">מטופל: {doc.patient_name}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            הועלה ב-{formatDate(doc.created_date)} על ידי {doc.uploaded_by}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="צפה במסמך">
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={doc.file_url} download title="הורד מסמך">
                              <Download className="w-4 h-4 text-green-600" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="mt-0">
          <Card className="rounded-tr-xl rounded-tl-none border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>מדדים - היסטוריית מדידות</CardTitle>
                <Button size="sm" onClick={() => { setEditingMetric(null); setIsMetricFormOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף מדד
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="text-center py-8 text-gray-500">אין מדדים רשומים</p>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">3 מדידות אחרונות</h3>
                    <div className="space-y-3">
                      {metrics.slice(0, 3).map((metric, index) => (
                        <div key={metric.id} className="p-4 border-2 border-purple-200 rounded-lg hover:shadow-md transition-shadow bg-purple-50/30">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">{metric.patient_name}</h4>
                                <Badge variant="secondary" className="bg-purple-600 text-white">
                                  #{index + 1}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">
                                {formatDate(metric.measurement_date)}
                                {metric.measurement_time && ` • ${metric.measurement_time}`}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingMetric(metric); setIsMetricFormOpen(true); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMetric(metric.id)}
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <p className="text-xs text-gray-500">משקל</p>
                              <p className="font-semibold">{metric.weight ? `${metric.weight} ק"ג` : '-'}</p>
                            </div>
                            <div className="bg-orange-50 p-2 rounded border border-orange-200">
                              <p className="text-xs text-gray-500">טמפרטורה</p>
                              <p className="font-semibold">{metric.temperature ? `${metric.temperature}°C` : '-'}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded border border-red-200">
                              <p className="text-xs text-gray-500">קצב לב</p>
                              <p className="font-semibold">{metric.heart_rate ? `${metric.heart_rate} BPM` : '-'}</p>
                            </div>
                            <div className="bg-teal-50 p-2 rounded border border-teal-200">
                              <p className="text-xs text-gray-500">קצב נשימות</p>
                              <p className="font-semibold">{metric.respiratory_rate ? `${metric.respiratory_rate}/דקה` : '-'}</p>
                            </div>
                            <div className="bg-purple-50 p-2 rounded border border-purple-200">
                              <p className="text-xs text-gray-500">לחץ דם</p>
                              <p className="font-semibold">
                                {metric.blood_pressure_systolic || '-'}/{metric.blood_pressure_diastolic || '-'}
                              </p>
                            </div>
                          </div>
                          {metric.notes && (
                            <p className="text-sm text-gray-600 mt-2 p-2 bg-white rounded border">{metric.notes}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">נמדד על ידי: {metric.measured_by}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {metrics.length > 3 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 border-t pt-4">היסטוריה מלאה</h3>
                      <div className="space-y-3">
                        {metrics.slice(3).map(metric => (
                          <div key={metric.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold">{metric.patient_name}</h4>
                                <p className="text-sm text-gray-500">
                                  {formatDate(metric.measurement_date)}
                                  {metric.measurement_time && ` • ${metric.measurement_time}`}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setEditingMetric(metric); setIsMetricFormOpen(true); }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteMetric(metric.id)}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              <div className="bg-blue-50 p-2 rounded">
                                <p className="text-xs text-gray-500">משקל</p>
                                <p className="font-semibold">{metric.weight ? `${metric.weight} ק"ג` : '-'}</p>
                              </div>
                              <div className="bg-orange-50 p-2 rounded">
                                <p className="text-xs text-gray-500">טמפרטורה</p>
                                <p className="font-semibold">{metric.temperature ? `${metric.temperature}°C` : '-'}</p>
                              </div>
                              <div className="bg-red-50 p-2 rounded">
                                <p className="text-xs text-gray-500">קצב לב</p>
                                <p className="font-semibold">{metric.heart_rate ? `${metric.heart_rate} BPM` : '-'}</p>
                              </div>
                              <div className="bg-teal-50 p-2 rounded">
                                <p className="text-xs text-gray-500">קצב נשימות</p>
                                <p className="font-semibold">{metric.respiratory_rate ? `${metric.respiratory_rate}/דקה` : '-'}</p>
                              </div>
                              <div className="bg-purple-50 p-2 rounded">
                                <p className="text-xs text-gray-500">לחץ דם</p>
                                <p className="font-semibold">
                                  {metric.blood_pressure_systolic || '-'}/{metric.blood_pressure_diastolic || '-'}
                                </p>
                              </div>
                            </div>
                            {metric.notes && (
                              <p className="text-sm text-gray-600 mt-2 p-2 bg-white rounded">{metric.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">נמדד על ידי: {metric.measured_by}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'עריכת מטופל' : 'הוספת מטופל חדש'}</DialogTitle>
          </DialogHeader>
          <PatientForm
            patient={editingPatient}
            clientId={client?.id}
            clientName={client?.full_name}
            clientNumber={client?.client_number}
            onSubmit={handlePatientSubmit}
            onCancel={() => { setIsPatientFormOpen(false); setEditingPatient(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isMetricFormOpen} onOpenChange={setIsMetricFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingMetric ? 'עריכת מדד' : 'הוספת מדד חדש'}</DialogTitle>
          </DialogHeader>
          <MetricForm
            patients={patients}
            clientId={client.id}
            metric={editingMetric}
            currentUser={currentUser}
            onSubmit={handleMetricSubmit}
            onCancel={() => { setIsMetricFormOpen(false); setEditingMetric(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isVisitFormOpen} onOpenChange={setIsVisitFormOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingVisit ? 'עריכת ביקור' : 'ביקור חדש'}</DialogTitle>
          </DialogHeader>
          <VisitForm
            visit={editingVisit}
            client={client}
            patients={patients}
            onSubmit={handleVisitSubmit}
            onCancel={() => { setIsVisitFormOpen(false); setEditingVisit(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isVaccinationFormOpen} onOpenChange={setIsVaccinationFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingVaccination ? 'עריכת חיסון' : 'הוספת חיסון חדש'}</DialogTitle>
          </DialogHeader>
          <VaccinationForm
            vaccination={editingVaccination}
            clientId={client.id}
            clientName={client.full_name}
            patients={patients}
            currentUser={currentUser}
            onSubmit={handleVaccinationSubmit}
            onCancel={() => { setIsVaccinationFormOpen(false); setEditingVaccination(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>הערות לתיק לקוח</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              className="w-full min-h-[200px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="הוסף הערות כלליות על הלקוח..."
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSaveNotes}>
                שמור הערות
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLabTestSelectionOpen} onOpenChange={setIsLabTestSelectionOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחירת בדיקת מעבדה</DialogTitle>
          </DialogHeader>
          <LabTestSelection
            onSelectFromPriceList={handleSelectFromPriceList}
            onCreateNew={handleCreateNewTest}
            onCancel={() => setIsLabTestSelectionOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isLabTestFormOpen} onOpenChange={setIsLabTestFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingLabTest ? 'עריכת בדיקת מעבדה' : 'הוספת בדיקת מעבדה חדשה'}</DialogTitle>
          </DialogHeader>
          <LabTestForm
            patients={patients}
            clientId={client.id}
            clientName={client.full_name}
            currentUser={currentUser}
            labTest={editingLabTest}
            selectedTestData={selectedTestData}
            onSubmit={handleLabTestSubmit}
            onCancel={() => { setIsLabTestFormOpen(false); setEditingLabTest(null); setSelectedTestData(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isLabResultsUploadOpen} onOpenChange={setIsLabResultsUploadOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת תוצאות לבדיקה: {uploadingLabTest?.test_name}</DialogTitle>
          </DialogHeader>
          {uploadingLabTest && (() => {
            // Find the lab test type by test_type_id or by name
            const testType = uploadingLabTest.test_type_id 
              ? labTestTypes.find(t => t.id === uploadingLabTest.test_type_id)
              : labTestTypes.find(t => t.name === uploadingLabTest.test_name);
            
            return (
              <LabTestResultsUpload
                labTest={uploadingLabTest}
                labTestType={testType}
                onResultsUpdated={() => {
                  setIsLabResultsUploadOpen(false);
                  setUploadingLabTest(null);
                  queryClient.invalidateQueries(['clientLabTests', client?.client_number]);
                }}
                onCancel={() => { setIsLabResultsUploadOpen(false); setUploadingLabTest(null); }}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={isDocumentFormOpen} onOpenChange={setIsDocumentFormOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>העלאת מסמך חדש</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const file = formData.get('file');
            const documentName = formData.get('document_name');
            const patientId = formData.get('patient_id');

            if (!file || !documentName) {
              toast.error('נא למלא שם מסמך ולהעלות קובץ');
              return;
            }

            try {
              setUploadingDocument(true);
              const { file_url } = await base44.integrations.Core.UploadFile({ file });
              
              const selectedPatient = patients.find(p => p.id === patientId);
              
              await createDocumentMutation.mutateAsync({
                client_id: client.id,
                client_name: client.full_name,
                patient_id: patientId || null,
                patient_name: selectedPatient?.name || null,
                document_name: documentName,
                file_url: file_url,
                uploaded_by: currentUser?.display_name || currentUser?.full_name || 'לא ידוע'
              });
            } catch (error) {
              toast.error('שגיאה בהעלאת המסמך');
              console.error(error);
            } finally {
              setUploadingDocument(false);
            }
          }} className="space-y-4">
            <div>
              <Label htmlFor="document_name">שם המסמך *</Label>
              <Input
                id="document_name"
                name="document_name"
                placeholder="למשל: תעודת חיסונים, תוצאות מעבדה..."
                required
              />
            </div>

            <div>
              <Label htmlFor="patient_id">קשור למטופל (אופציונלי)</Label>
              <Select name="patient_id">
                <SelectTrigger>
                  <SelectValue placeholder="בחר מטופל (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>ללא מטופל ספציפי</SelectItem>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file">קובץ *</Label>
              <Input
                id="file"
                name="file"
                type="file"
                required
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                פורמטים נתמכים: PDF, Word, תמונות
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDocumentFormOpen(false)}
                disabled={uploadingDocument}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={uploadingDocument}>
                {uploadingDocument ? (
                  <>
                    <Upload className="w-4 h-4 ml-2 animate-pulse" />
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 ml-2" />
                    העלה מסמך
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
      );
      }