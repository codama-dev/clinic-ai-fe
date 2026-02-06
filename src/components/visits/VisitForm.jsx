import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Upload, Plus, Trash2, FileText, CheckCircle, Camera, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PrescriptionPDF from "./PrescriptionPDF";
import AppointmentForm from "../clinic-calendar/AppointmentForm";
import { toast } from "sonner";

export default function VisitForm({ visit, client, patients, onSubmit, onCancel }) {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  console.log('VisitForm initialized with:', { visit, client, patientsCount: patients?.length });

  const [formData, setFormData] = useState({
    client_number: client?.client_number || visit?.client_number || null,
    patient_number: visit?.patient_number || null,
    full_name: client?.full_name || visit?.full_name || '',
    client_name: client?.full_name || visit?.client_name || '',
    patient_name: visit?.patient_name || '',
    doctor_name: visit?.doctor_name || '',
    doctor_license: visit?.doctor_license || '',
    visit_date: visit?.visit_date || currentDate,
    visit_time: visit?.visit_time || currentTime,
    chief_complaint: visit?.chief_complaint || '',
    findings_and_tests: visit?.findings_and_tests || '',
    diagnosis: visit?.diagnosis || '',
    treatment: visit?.treatment || '',
    vital_signs: visit?.vital_signs || {},
    lab_tests: visit?.lab_tests || [],
    items_from_pricelist: visit?.items_from_pricelist || [],
    prescriptions: visit?.prescriptions || [],
    follow_up_days: visit?.follow_up_days || '',
    follow_up_date: visit?.follow_up_date || '',
    attachments: visit?.attachments || [],
    notes: visit?.notes || '',
    status: visit?.status || 'draft'
  });
  
  // Update formData when client prop changes
  useEffect(() => {
    if (client) {
      console.log('Client updated in VisitForm:', client);
      setFormData(prev => ({
        ...prev,
        client_number: client.client_number || prev.client_number,
        full_name: client.full_name || prev.full_name,
        client_name: client.full_name || prev.client_name
      }));
    }
  }, [client]);

  const [uploading, setUploading] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState(null);
  const [visitId, setVisitId] = useState(visit?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const [showLabResultsDialog, setShowLabResultsDialog] = useState(false);
  const [currentLabTestIndex, setCurrentLabTestIndex] = useState(null);
  const [extractingResults, setExtractingResults] = useState(false);
  const [selectedLabTestType, setSelectedLabTestType] = useState('');
  const [showFollowUpAppointmentForm, setShowFollowUpAppointmentForm] = useState(false);

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const allProfiles = await base44.entities.PublicProfile.list();
      return allProfiles.filter(p => p.job === 'doctor' && p.is_active);
    }
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list('-created_date', 1000)
  });

  const { data: clientPriceList = [] } = useQuery({
    queryKey: ['clientPriceList'],
    queryFn: () => base44.entities.ClientPriceList.list('-created_date', 500)
  });

  const { data: labTestTypes = [] } = useQuery({
    queryKey: ['labTestTypes'],
    queryFn: () => base44.entities.LabTestType.list('-created_date', 100)
  });

  const { data: recentMetrics = [] } = useQuery({
    queryKey: ['recentMetrics', formData.patient_number],
    queryFn: async () => {
      if (!formData.patient_number) return [];
      const allMetrics = await base44.entities.PatientMetric.list('-measurement_date', 5);
      return allMetrics.filter(m => m.patient_number === formData.patient_number).slice(0, 3);
    },
    enabled: !!formData.patient_number
  });

  // Set visit ID if editing existing visit
  useEffect(() => {
    if (visit?.id) {
      setVisitId(visit.id);
    }
  }, [visit]);

  // Auto-save changes only for existing visits
  useEffect(() => {
    // Only auto-save if this is an existing visit (has visitId)
    if (!visitId || !formData || !visit) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        // Save all current form data including lab tests and price list items
        await base44.entities.MedicalVisit.update(visitId, {
          ...formData,
          lab_tests: formData.lab_tests || [],
          items_from_pricelist: formData.items_from_pricelist || []
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save error:', error);
        toast.error('שגיאה בשמירה אוטומטית');
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, visitId, visit]);

  useEffect(() => {
    if (formData.follow_up_days && formData.visit_date) {
      const visitDate = new Date(formData.visit_date);
      visitDate.setDate(visitDate.getDate() + parseInt(formData.follow_up_days));
      setFormData(prev => ({ ...prev, follow_up_date: visitDate.toISOString().split('T')[0] }));
    }
  }, [formData.follow_up_days, formData.visit_date]);

  const handlePatientChange = (patientNumber) => {
    const selectedPatient = patients.find(p => p.patient_number === parseInt(patientNumber));
    console.log('Selected patient:', selectedPatient);
    
    // Find the client linked to this patient via client_number
    const linkedClient = allClients.find(c => c.client_number === selectedPatient?.client_number);
    console.log('Linked client found:', linkedClient);
    
    setFormData({
      ...formData,
      patient_number: selectedPatient?.patient_number || null,
      patient_name: selectedPatient?.name || '',
      // Get client data from the linked client
      client_number: linkedClient?.client_number || selectedPatient?.client_number || null,
      full_name: linkedClient?.full_name || '',
      client_name: linkedClient?.full_name || ''
    });
  };

  const handleDoctorChange = (doctorId) => {
    const selectedDoctor = doctors.find(d => d.user_id === doctorId);
    console.log('Selected doctor:', selectedDoctor);
    
    setFormData({
      ...formData,
      doctor_name: selectedDoctor?.display_name || '',
      doctor_license: selectedDoctor?.id_number || ''
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, attachments: [...formData.attachments, file_url] });
      setUploading(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('שגיאה בהעלאת הקובץ');
      setUploading(false);
    }
  };

  const addLabTest = () => {
    setFormData({
      ...formData,
      lab_tests: [...formData.lab_tests, { test_name: '', results: '', status: 'pending', from_price_list: false, price: 0 }]
    });
  };

  const addLabTestFromPriceList = (priceListItem) => {
    setFormData({
      ...formData,
      lab_tests: [...formData.lab_tests, { 
        test_name: priceListItem.product_name, 
        results: '', 
        status: 'pending',
        from_price_list: true,
        price: parseFloat(priceListItem.client_price) || 0
      }]
    });
  };

  const updateLabTest = (index, field, value) => {
    const updated = [...formData.lab_tests];
    updated[index][field] = value;
    
    // If updating test_name, auto-fill price from price list
    if (field === 'test_name') {
      const priceListItem = clientPriceList.find(p => 
        p.product_name === value && p.sub_category === 'בדיקות מעבדה'
      );
      if (priceListItem) {
        updated[index].price = parseFloat(priceListItem.client_price) || 0;
        updated[index].from_price_list = true;
      }
    }
    
    setFormData({ ...formData, lab_tests: updated });
  };

  const removeLabTest = async (index) => {
    const testToRemove = formData.lab_tests[index];
    
    // If visit exists and the test was already saved to LabTest entity, delete it
    if (visitId && testToRemove.test_name && formData.patient_number) {
      try {
        const allLabTests = await base44.entities.LabTest.list('-created_date', 1000);
        const matchingLabTest = allLabTests.find(lt => 
          lt.patient_number === parseInt(formData.patient_number) &&
          lt.test_name === testToRemove.test_name &&
          lt.test_date === formData.visit_date
        );
        
        if (matchingLabTest) {
          await base44.entities.LabTest.delete(matchingLabTest.id);
          toast.success('הבדיקה הוסרה מהביקור ומטאב מעבדה');
        }
      } catch (error) {
        console.error('Error deleting lab test:', error);
      }
    }
    
    setFormData({ ...formData, lab_tests: formData.lab_tests.filter((_, i) => i !== index) });
  };

  const addPriceItem = () => {
    setFormData({
      ...formData,
      items_from_pricelist: [...formData.items_from_pricelist, { product_name: '', quantity: 1, price: 0 }]
    });
  };

  const updatePriceItem = (index, field, value) => {
    const updated = [...formData.items_from_pricelist];
    if (field === 'product_name') {
      const item = clientPriceList.find(p => p.product_name === value);
      updated[index] = { ...updated[index], product_name: value, price: item?.client_price || 0 };
    } else {
      updated[index][field] = value;
    }
    setFormData({ ...formData, items_from_pricelist: updated });
  };

  const removePriceItem = async (index) => {
    const itemToRemove = formData.items_from_pricelist[index];
    
    // If this visit is saved, check if there's a billing for this item and delete it
    if (visitId && itemToRemove.product_name) {
      try {
        // Fetch all billings related to this visit
        const allBillings = await base44.entities.Billing.list('-created_date', 1000);
        const relatedBillings = allBillings.filter(b => b.visit_id === visitId);
        
        // Check if any billing contains this item
        for (const billing of relatedBillings) {
          if (billing.items && Array.isArray(billing.items)) {
            const hasItem = billing.items.some(bi => bi.product_name === itemToRemove.product_name);
            
            if (hasItem) {
              // Remove this item from the billing or delete the billing if it's the only item
              const remainingItems = billing.items.filter(bi => bi.product_name !== itemToRemove.product_name);
              
              if (remainingItems.length === 0) {
                // Delete the entire billing if no items remain
                await base44.entities.Billing.delete(billing.id);
              } else {
                // Update the billing with remaining items
                const newTotal = remainingItems.reduce((sum, bi) => sum + (bi.price * bi.quantity), 0);
                await base44.entities.Billing.update(billing.id, {
                  items: remainingItems,
                  total_amount: newTotal
                });
              }
              toast.success('הפריט הוסר מהביקור ומטאב חיובים');
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error removing item from billing:', error);
      }
    }
    
    setFormData({ ...formData, items_from_pricelist: formData.items_from_pricelist.filter((_, i) => i !== index) });
  };

  const addPrescription = () => {
    setCurrentPrescription({
      medication_name: '',
      dosage: '',
      duration: '',
      administration_method: 'בליעה',
      frequency: 'פעם אחת ביום',
      instructions: ''
    });
    setShowPrescriptionDialog(true);
  };

  const savePrescription = () => {
    setFormData({
      ...formData,
      prescriptions: [...formData.prescriptions, currentPrescription]
    });
    setShowPrescriptionDialog(false);
    setCurrentPrescription(null);
  };

  const removePrescription = (index) => {
    setFormData({ ...formData, prescriptions: formData.prescriptions.filter((_, i) => i !== index) });
  };

  const openLabResultsDialog = (index) => {
    setCurrentLabTestIndex(index);
    const test = formData.lab_tests[index];
    
    setSelectedLabTestType(test.test_name || '');
    
    const testType = labTestTypes.find(t => t.name === test.test_name);
    if (testType && testType.parameters) {
      const initialResults = test.results || {};
      if (typeof initialResults === 'string') {
        const newResults = {};
        testType.parameters.forEach(param => {
          newResults[param.name] = '';
        });
        updateLabTest(index, 'results', newResults);
      } else {
        const newResults = { ...initialResults };
        testType.parameters.forEach(param => {
          if (!newResults[param.name]) {
            newResults[param.name] = '';
          }
        });
        updateLabTest(index, 'results', newResults);
      }
    } else if (!test.test_name) {
      updateLabTest(index, 'results', {});
    }
    
    setShowLabResultsDialog(true);
  };

  const saveLabResults = () => {
    setShowLabResultsDialog(false);
    setCurrentLabTestIndex(null);
    setSelectedLabTestType('');
  };

  const handleLabTestTypeChange = (testTypeName) => {
    setSelectedLabTestType(testTypeName);
    
    if (currentLabTestIndex !== null) {
      updateLabTest(currentLabTestIndex, 'test_name', testTypeName);
      
      const testType = labTestTypes.find(t => t.name === testTypeName);
      if (testType && testType.parameters) {
        const initialResults = {};
        testType.parameters.forEach(param => {
          initialResults[param.name] = '';
        });
        updateLabTest(currentLabTestIndex, 'results', initialResults);
      }
    }
  };

  const handleImageForResults = async (file) => {
    if (!file || currentLabTestIndex === null) return;
    
    try {
      setExtractingResults(true);
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const test = formData.lab_tests[currentLabTestIndex];
      const testType = labTestTypes.find(t => t.name === (selectedLabTestType || test.test_name));
      
      if (!testType || !testType.parameters) {
        toast.error('לא נמצאו פרמטרים לבדיקה זו');
        setExtractingResults(false);
        return;
      }
      
      const parametersDescription = testType.parameters.map(p => 
        `${p.name} (${p.unit || 'ללא יחידה'}${p.min_normal && p.max_normal ? `, טווח תקין: ${p.min_normal}-${p.max_normal}` : ''})`
      ).join('\n');
      
      const prompt = `נא לחלץ את ערכי הבדיקה הבאים מהתמונה:
${parametersDescription}

החזר את הנתונים בפורמט JSON עם שמות הפרמטרים כמפתחות והערכים המספריים בלבד (ללא יחידות).
אם פרמטר לא נמצא בתמונה, השאר אותו ריק.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            results: {
              type: 'object',
              additionalProperties: { type: 'string' }
            }
          }
        }
      });
      
      if (response && response.results) {
        updateLabTest(currentLabTestIndex, 'results', response.results);
        toast.success('הערכים חולצו בהצלחה מהתמונה');
      }
      
      setExtractingResults(false);
    } catch (error) {
      console.error('Error extracting results:', error);
      toast.error('שגיאה בחילוץ הערכים מהתמונה');
      setExtractingResults(false);
    }
  };

  const handleFollowUpCheckboxChange = (checked) => {
    if (checked) {
      if (!formData.patient_number || !formData.doctor_name) {
        toast.error('נא לבחור מטופל ורופא מטפל תחילה');
        return;
      }
      setShowFollowUpAppointmentForm(true);
    } else {
      setFormData({ ...formData, follow_up_days: '', follow_up_date: '' });
    }
  };

  const handleFollowUpAppointmentSubmit = async (appointmentData) => {
    try {
      // Create the actual appointment in the system
      await base44.entities.Appointment.create(appointmentData);
      
      const visitDate = new Date(formData.visit_date);
      const followDate = new Date(appointmentData.date);
      const diffTime = Math.abs(followDate - visitDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setFormData({ 
        ...formData, 
        follow_up_days: diffDays.toString(),
        follow_up_date: appointmentData.date 
      });

      setShowFollowUpAppointmentForm(false);
      toast.success('תור המעקב נקבע בהצלחה ביומן');
    } catch (error) {
      console.error('Error creating follow-up appointment:', error);
      toast.error('שגיאה ביצירת תור המעקב');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validation - Required fields check
    const requiredFields = [
      { field: 'patient_number', label: 'מטופל' },
      { field: 'doctor_name', label: 'רופא מטפל' },
      { field: 'visit_date', label: 'תאריך ביקור' },
      { field: 'visit_time', label: 'שעת ביקור' },
      { field: 'client_number', label: 'מספר לקוח' },
      { field: 'full_name', label: 'שם לקוח' },
      { field: 'patient_name', label: 'שם מטופל' }
    ];

    const missingFields = requiredFields.filter(({ field }) => {
      const value = formData[field];
      return !value || value === '' || value === null || value === undefined;
    });

    if (missingFields.length > 0) {
      const fieldsList = missingFields.map(f => f.label).join(', ');
      toast.error(`לא ניתן לשמור ביקור: חסרים שדות חובה - ${fieldsList}`);
      console.error('Missing required fields:', missingFields.map(f => f.field));
      return;
    }

    // Clear auto-save timer to prevent conflicts
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setIsSubmitting(true);

    try {
      console.log('Starting visit save with data:', formData);

      // Calculate visit_number for new visits only
      let visitNumber = formData.visit_number;
      if (!visitId) {
        const allVisits = await base44.entities.MedicalVisit.list('-created_date', 1000);
        const maxVisitNumber = allVisits.length > 0 
          ? Math.max(...allVisits.map(v => v.visit_number || 0))
          : 0;
        visitNumber = maxVisitNumber + 1;
      }

      // Prepare completed visit data with proper type conversions
      const completedVisitData = { 
        ...formData,
        visit_number: visitNumber,
        // CRITICAL: Convert to numbers as required by entity schema
        client_number: parseInt(formData.client_number),
        patient_number: parseInt(formData.patient_number),
        // Convert follow_up_days to number if exists
        follow_up_days: formData.follow_up_days ? parseInt(formData.follow_up_days) : undefined,
        status: 'completed',
        lab_tests: formData.lab_tests || [],
        items_from_pricelist: formData.items_from_pricelist || [],
        prescriptions: formData.prescriptions || [],
        attachments: formData.attachments || [],
        vital_signs: formData.vital_signs || {},
        follow_up_completed: false
      };
      
      console.log('Prepared visit data:', completedVisitData);
      console.log('Types check:', {
        client_number: typeof completedVisitData.client_number,
        patient_number: typeof completedVisitData.patient_number
      });
      
      let finalVisitId = visitId;
      
      if (visitId) {
        // Update existing draft visit
        console.log('Updating existing visit:', visitId);
        await base44.entities.MedicalVisit.update(visitId, completedVisitData);
        console.log('Visit updated successfully');
        toast.success('הביקור נשמר והושלם בהצלחה ✓');
      } else {
        // Create new visit
        console.log('Creating new visit');
        const newVisit = await base44.entities.MedicalVisit.create(completedVisitData);
        finalVisitId = newVisit.id;
        console.log('Visit created successfully with ID:', finalVisitId);
        toast.success('הביקור נוצר ונשמר בהצלחה ✓');
      }
      
      // Create LabTest records for each lab test (with or without results)
      console.log('Creating LabTest records for lab tests:', formData.lab_tests);

      const labTestsToSave = formData.lab_tests.filter(test => test.test_name);

      if (labTestsToSave.length > 0) {
        // Get all existing lab tests to check for duplicates and calculate next test_number
        const allExistingTests = await base44.entities.LabTest.list('-created_date', 1000);
        const maxTestNumber = allExistingTests.length > 0 
          ? Math.max(...allExistingTests.map(t => t.test_number || 0))
          : 0;

        let testNumberCounter = maxTestNumber;

        for (const labTest of labTestsToSave) {
          try {
            // Check for duplicate: same patient, test name, and date
            const isDuplicate = allExistingTests.some(existing => 
              existing.patient_number === parseInt(formData.patient_number) &&
              existing.test_name === labTest.test_name &&
              existing.test_date === formData.visit_date
            );

            if (isDuplicate) {
              console.log('Skipping duplicate lab test:', labTest.test_name);
              continue;
            }

            // Determine status based on whether results exist
            const hasResults = labTest.results && 
              (typeof labTest.results === 'object' ? Object.keys(labTest.results).length > 0 : labTest.results);

            testNumberCounter++;

            await base44.entities.LabTest.create({
              test_number: testNumberCounter,
              client_number: parseInt(formData.client_number),
              client_name: formData.full_name,
              patient_number: parseInt(formData.patient_number),
              patient_name: formData.patient_name,
              test_name: labTest.test_name,
              test_date: formData.visit_date,
              results: labTest.results || {},
              performed_by: formData.doctor_name,
              notes: labTest.notes || '',
              status: hasResults ? (labTest.status || 'completed') : 'pending'
            });
            console.log('Created LabTest record for:', labTest.test_name, 'with test_number:', testNumberCounter);
          } catch (error) {
            console.error('Error creating LabTest record:', error);
            console.error('Failed lab test data:', labTest);
          }
        }
        console.log(`Created ${labTestsToSave.length} LabTest records`);
      }
      
      // Close dialog and trigger parent refresh
      console.log('Calling onSubmit callback with ID:', finalVisitId);
      onSubmit(finalVisitId);
      
    } catch (error) {
      console.error('Error saving visit - Full error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'שגיאה בשמירת הביקור';
      
      if (error.message) {
        if (error.message.includes('permission') || error.message.includes('authorized')) {
          errorMessage = 'אין הרשאה ליצור ביקור. פנה למנהל מערכת.';
        } else if (error.message.includes('required')) {
          errorMessage = `שדה חובה חסר: ${error.message}`;
        } else if (error.message.includes('unique')) {
          errorMessage = 'הביקור כבר קיים במערכת';
        } else {
          errorMessage = `שגיאה: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const selectedPatient = patients.find(p => p.patient_number === formData.patient_number);

  const missingRequiredFields = !formData.patient_number || !formData.doctor_name || !formData.visit_date || !formData.visit_time;
  
  const getMissingFieldsList = () => {
    const missing = [];
    if (!formData.patient_number) missing.push('מטופל');
    if (!formData.doctor_name) missing.push('רופא מטפל');
    if (!formData.visit_date) missing.push('תאריך ביקור');
    if (!formData.visit_time) missing.push('שעת ביקור');
    return missing;
  };

  // Debug current state before render
  useEffect(() => {
    console.log('Current formData state:', {
      client_number: formData.client_number,
      full_name: formData.full_name,
      patient_number: formData.patient_number,
      patient_name: formData.patient_name,
      doctor_name: formData.doctor_name,
      visit_date: formData.visit_date,
      visit_time: formData.visit_time
    });
  }, [formData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {missingRequiredFields && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-900">נא למלא את השדות החובה לפני שמירת הביקור:</span>
          </div>
          <ul className="text-sm text-red-700 mr-7 list-disc">
            {getMissingFieldsList().map((field, idx) => (
              <li key={idx}>{field}</li>
            ))}
          </ul>
        </div>
      )}
      
      {visitId && formData.status === 'draft' && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {isSaving ? 'שומר שינויים...' : lastSaved ? `נשמר אוטומטית ${lastSaved.toLocaleTimeString('he-IL')}` : 'הביקור נשמר אוטומטית'}
            </span>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            טיוטה
          </Badge>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>פרטי הביקור</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                תאריך הביקור <span className="text-red-600">*</span>
              </Label>
              <Input 
                type="date"
                value={formData.visit_date} 
                onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                required
                className={!formData.visit_date ? 'border-red-500 border-2' : ''}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                שעת הביקור <span className="text-red-600">*</span>
              </Label>
              <Input 
                type="time"
                value={formData.visit_time} 
                onChange={(e) => setFormData({ ...formData, visit_time: e.target.value })}
                required
                className={!formData.visit_time ? 'border-red-500 border-2' : ''}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="patient_id" className="flex items-center gap-2">
              מטופל <span className="text-red-600">*</span>
              {!formData.patient_number && (
                <Badge variant="destructive" className="text-xs">חובה</Badge>
              )}
              {formData.follow_up_date && (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  מעקב: {(() => {
                    const d = new Date(formData.follow_up_date);
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  })()}
                </Badge>
              )}
            </Label>
            {visit?.appointment_id ? (
              <div className="p-3 bg-gray-100 border-2 border-gray-300 rounded-lg">
                <p className="font-semibold text-gray-900">{formData.patient_name}</p>
                <p className="text-sm text-gray-600">מטופל מקושר לתור - לא ניתן לשינוי</p>
              </div>
            ) : (
              <Select value={formData.patient_number?.toString()} onValueChange={handlePatientChange} required>
                <SelectTrigger className={!formData.patient_number ? 'border-red-500 border-2 ring-2 ring-red-200' : ''}>
                  <SelectValue placeholder="בחר מטופל" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.patient_number?.toString()}>
                      {patient.name} ({patient.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!formData.patient_number && (
              <p className="text-xs text-red-600 mt-1">⚠ שדה חובה - נא לבחור מטופל</p>
            )}
          </div>

          <div>
            <Label htmlFor="doctor_name" className="flex items-center gap-2">
              רופא מטפל <span className="text-red-600">*</span>
              {!formData.doctor_name && (
                <Badge variant="destructive" className="text-xs">חובה</Badge>
              )}
            </Label>
            <Select 
              value={doctors.find(d => d.display_name === formData.doctor_name)?.user_id || ''} 
              onValueChange={handleDoctorChange}
              required
            >
              <SelectTrigger className={!formData.doctor_name ? 'border-red-500 border-2 ring-2 ring-red-200' : ''}>
                <SelectValue placeholder="בחר רופא" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.user_id} value={doctor.user_id}>
                    {doctor.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.doctor_name && (
              <p className="text-xs text-red-600 mt-1">⚠ שדה חובה - נא לבחור רופא מטפל</p>
            )}
          </div>
        </CardContent>
      </Card>

      {recentMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>מדדים אחרונים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentMetrics.map((metric, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                  <p className="font-semibold">{(() => {
                    const d = new Date(metric.measurement_date);
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  })()}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {metric.weight && <p>משקל: {metric.weight} ק"ג</p>}
                    {metric.temperature && <p>טמפ': {metric.temperature}°C</p>}
                    {metric.heart_rate && <p>דופק: {metric.heart_rate}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>מדדים חיוניים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>משקל (ק"ג)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.vital_signs.weight || ''}
                onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, weight: parseFloat(e.target.value) } })}
              />
            </div>
            <div>
              <Label>טמפרטורה (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.vital_signs.temperature || ''}
                onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, temperature: parseFloat(e.target.value) } })}
              />
            </div>
            <div>
              <Label>קצב לב</Label>
              <Input
                type="number"
                value={formData.vital_signs.heart_rate || ''}
                onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, heart_rate: parseFloat(e.target.value) } })}
              />
            </div>
            <div>
              <Label>קצב נשימות</Label>
              <Input
                type="number"
                value={formData.vital_signs.respiratory_rate || ''}
                onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, respiratory_rate: parseFloat(e.target.value) } })}
              />
            </div>
            <div>
              <Label>לחץ דם סיסטולי</Label>
              <Input
                type="number"
                value={formData.vital_signs.blood_pressure_systolic || ''}
                onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, blood_pressure_systolic: parseFloat(e.target.value) } })}
              />
            </div>
            <div>
              <Label>לחץ דם דיאסטולי</Label>
              <Input
                type="number"
                value={formData.vital_signs.blood_pressure_diastolic || ''}
                onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, blood_pressure_diastolic: parseFloat(e.target.value) } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תיעוד רפואי</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="chief_complaint">סיבת הביקור</Label>
            <Textarea
              id="chief_complaint"
              value={formData.chief_complaint}
              onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="findings_and_tests">ממצאים ובדיקות</Label>
            <Textarea
              id="findings_and_tests"
              value={formData.findings_and_tests}
              onChange={(e) => setFormData({ ...formData, findings_and_tests: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="diagnosis">אבחנה</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="treatment">הטיפול שניתן</Label>
            <Textarea
              id="treatment"
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>בדיקות מעבדה</CardTitle>
            <div className="flex gap-2">
              <Input
                list="lab-tests-price-list"
                placeholder="בחר מהמחירון או הקלד..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value;
                    if (value) {
                      const item = clientPriceList
                        .filter(p => p.sub_category === 'בדיקות מעבדה')
                        .find(p => p.product_name === value);
                      if (item) {
                        addLabTestFromPriceList(item);
                        e.target.value = '';
                      }
                    }
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const item = clientPriceList
                      .filter(p => p.sub_category === 'בדיקות מעבדה')
                      .find(p => p.product_name === value);
                    if (item) {
                      addLabTestFromPriceList(item);
                      e.target.value = '';
                    }
                  }
                }}
              />
              <datalist id="lab-tests-price-list">
                {clientPriceList
                  .filter(p => p.sub_category === 'בדיקות מעבדה')
                  .map(p => (
                    <option key={p.id} value={p.product_name}>
                      ₪{p.client_price}
                    </option>
                  ))}
              </datalist>
              <Button type="button" size="sm" onClick={addLabTest}>
                <Plus className="w-4 h-4 ml-2" />
                בדיקה חדשה
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.lab_tests.map((test, index) => (
              <div key={index} className="flex gap-2 items-center p-3 border-2 rounded-lg bg-purple-50 border-purple-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        list="lab-test-names"
                        placeholder="שם הבדיקה"
                        value={test.test_name}
                        onChange={(e) => updateLabTest(index, 'test_name', e.target.value)}
                        className="font-semibold"
                      />
                      <datalist id="lab-test-names">
                        {clientPriceList
                          .filter(p => p.sub_category === 'בדיקות מעבדה')
                          .map(p => (
                            <option key={p.id} value={p.product_name} />
                          ))}
                      </datalist>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="מחיר"
                        value={test.price || 0}
                        disabled
                        className="text-center font-bold text-green-700 bg-gray-100"
                      />
                    </div>
                    <Badge className="bg-green-600 text-white whitespace-nowrap">
                      ₪{(test.price || 0).toFixed(2)}
                    </Badge>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLabTest(index)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>פריטים ממחירון</CardTitle>
            <Button type="button" size="sm" onClick={addPriceItem}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף פריט
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.items_from_pricelist.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border rounded">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <select
                    className="border rounded px-3 py-2"
                    value={item.product_name}
                    onChange={(e) => updatePriceItem(index, 'product_name', e.target.value)}
                  >
                    <option value="">בחר פריט</option>
                    {(() => {
                      const grouped = clientPriceList.reduce((acc, p) => {
                        const subCategory = p.sub_category || p.item_type || 'ללא קטגוריה';
                        if (!acc[subCategory]) acc[subCategory] = [];
                        acc[subCategory].push(p);
                        return acc;
                      }, {});
                      
                      return Object.entries(grouped)
                        .sort(([catA], [catB]) => catA.localeCompare(catB, 'he'))
                        .map(([subCategory, items]) => (
                          <optgroup key={subCategory} label={subCategory}>
                            {items.map(p => (
                              <option key={p.id} value={p.product_name}>
                                {p.product_name} - ₪{p.client_price}
                              </option>
                            ))}
                          </optgroup>
                        ));
                    })()}
                  </select>
                  <Input
                    type="number"
                    placeholder="כמות"
                    value={item.quantity}
                    onChange={(e) => updatePriceItem(index, 'quantity', parseInt(e.target.value))}
                  />
                  <Input
                    type="number"
                    placeholder="מחיר"
                    value={item.price}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePriceItem(index)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>מרשמים</CardTitle>
            <Button type="button" size="sm" onClick={addPrescription}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף מרשם
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.prescriptions.map((rx, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border rounded bg-blue-50">
                <div className="flex-1">
                  <p className="font-semibold">{rx.medication_name}</p>
                  <p className="text-sm text-gray-600">{rx.dosage} • {rx.frequency} • {rx.administration_method}</p>
                  <p className="text-sm">{rx.instructions}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const patient = patients.find(p => p.patient_number === formData.patient_number);
                    const doctor = doctors.find(d => d.display_name === formData.doctor_name);
                    const clientData = { full_name: formData.full_name, phone: '', address: '' };
                    const pdfContent = PrescriptionPDF({ prescription: rx, patient, doctor, client: clientData });
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(pdfContent);
                    printWindow.document.close();
                  }}
                  title="הדפס מרשם"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePrescription(index)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מעקב</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="needs_followup"
              checked={!!formData.follow_up_days}
              onChange={(e) => handleFollowUpCheckboxChange(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <Label htmlFor="needs_followup" className="cursor-pointer">נדרש מעקב - קבע תור</Label>
          </div>
          
          {formData.follow_up_days !== '' && formData.follow_up_date && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-semibold text-green-800">✓ תור מעקב נקבע</p>
              <p className="text-sm text-green-700">
                תאריך: {(() => {
                  const d = new Date(formData.follow_up_date);
                  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                })()}
              </p>
              <p className="text-sm text-green-700">
                בעוד {formData.follow_up_days} ימים מהביקור
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>קבצים מצורפים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">לחץ להעלאת קובץ</p>
              </div>
            </Label>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              disabled={uploading}
            />
            {formData.attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {formData.attachments.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      קובץ מצורף {idx + 1}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setFormData({ ...formData, attachments: formData.attachments.filter((_, i) => i !== idx) })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הערות</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="הערות נוספות..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || missingRequiredFields}
          className={missingRequiredFields ? 'opacity-50 cursor-not-allowed' : ''}
          title={missingRequiredFields ? `חסרים שדות חובה: ${getMissingFieldsList().join(', ')}` : 'שמור ביקור'}
        >
          <Save className={`w-4 h-4 ml-2 ${isSubmitting ? 'animate-spin' : ''}`} />
          {isSubmitting ? 'שומר...' : 'שמור ביקור'}
        </Button>
      </div>

      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent dir="rtl" className="max-w-xl">
          <DialogHeader>
            <DialogTitle>הוספת מרשם</DialogTitle>
          </DialogHeader>
          {currentPrescription && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="prescription-patient">מטופל</Label>
                <Select value={formData.patient_number?.toString()} onValueChange={handlePatientChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מטופל" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.patient_number?.toString()}>
                        {patient.name} ({patient.species})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="prescription-doctor">רופא מטפל</Label>
                <Select 
                  value={doctors.find(d => d.display_name === formData.doctor_name)?.user_id || ''} 
                  onValueChange={handleDoctorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר רופא" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(doctor => (
                      <SelectItem key={doctor.user_id} value={doctor.user_id}>
                        {doctor.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>שם התרופה</Label>
                <Input
                  list="medications-list"
                  value={currentPrescription.medication_name}
                  onChange={(e) => setCurrentPrescription({ ...currentPrescription, medication_name: e.target.value })}
                  placeholder="התחל להקליד שם תרופה..."
                />
                <datalist id="medications-list">
                  {clientPriceList.filter(p => (p.sub_category || p.item_type) === 'תרופה').map(p => (
                    <option key={p.id} value={p.product_name} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>מינון</Label>
                <Input
                  value={currentPrescription.dosage}
                  onChange={(e) => setCurrentPrescription({ ...currentPrescription, dosage: e.target.value })}
                  placeholder="למשל: 10mg"
                />
              </div>
              <div>
                <Label>משך השימוש</Label>
                <Input
                  value={currentPrescription.duration}
                  onChange={(e) => setCurrentPrescription({ ...currentPrescription, duration: e.target.value })}
                  placeholder="למשל: 7 ימים"
                />
              </div>
              <div>
                <Label>צורת מתן</Label>
                <Select
                  value={currentPrescription.administration_method}
                  onValueChange={(val) => setCurrentPrescription({ ...currentPrescription, administration_method: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="בליעה">בליעה</SelectItem>
                    <SelectItem value="מריחה">מריחה</SelectItem>
                    <SelectItem value="טיפות">טיפות</SelectItem>
                    <SelectItem value="זריקה">זריקה</SelectItem>
                    <SelectItem value="אחר">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תדירות</Label>
                <Select
                  value={currentPrescription.frequency}
                  onValueChange={(val) => setCurrentPrescription({ ...currentPrescription, frequency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="פעם אחת ביום">פעם אחת ביום</SelectItem>
                    <SelectItem value="פעמיים ביום">פעמיים ביום</SelectItem>
                    <SelectItem value="שלוש פעמים ביום">שלוש פעמים ביום</SelectItem>
                    <SelectItem value="ארבע פעמים ביום">ארבע פעמים ביום</SelectItem>
                    <SelectItem value="לפי הצורך">לפי הצורך</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>הנחיות נוספות</Label>
                <Textarea
                  value={currentPrescription.instructions}
                  onChange={(e) => setCurrentPrescription({ ...currentPrescription, instructions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowPrescriptionDialog(false)}>ביטול</Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    const patient = patients.find(p => p.patient_number === formData.patient_number);
                    const doctor = doctors.find(d => d.display_name === formData.doctor_name);
                    const clientData = { 
                      full_name: formData.full_name, 
                      phone: '', 
                      address: '' 
                    };
                    const pdfContent = PrescriptionPDF({ 
                      prescription: currentPrescription, 
                      patient, 
                      doctor: { ...doctor, license_number: formData.doctor_license }, 
                      client: clientData 
                    });
                    const newWindow = window.open('', '_blank');
                    newWindow.document.write(pdfContent);
                    newWindow.document.close();
                  }}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  תצוגה מקדימה
                </Button>
                <Button type="button" onClick={savePrescription}>שמור מרשם</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLabResultsDialog} onOpenChange={setShowLabResultsDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>הזנת תוצאות בדיקה</DialogTitle>
          </DialogHeader>
          {currentLabTestIndex !== null && (() => {
            const test = formData.lab_tests[currentLabTestIndex];
            const testType = labTestTypes.find(t => t.name === (selectedLabTestType || test.test_name));
            
            const results = typeof test.results === 'object' ? test.results : {};
            
            const getValuePosition = (value, min, max) => {
              if (!value || !min || !max) return 0;
              const numValue = parseFloat(value);
              const numMin = parseFloat(min);
              const numMax = parseFloat(max);
              
              if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) return 0;
              
              const range = numMax - numMin;
              const position = ((numValue - numMin) / range) * 100;
              return Math.max(0, Math.min(100, position));
            };

            const isOutOfRange = (value, min, max) => {
              if (!value || !min || !max) return false;
              const numValue = parseFloat(value);
              const numMin = parseFloat(min);
              const numMax = parseFloat(max);
              
              if (isNaN(numValue)) return false;
              
              return numValue < numMin || numValue > numMax;
            };

            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label>בחר סוג בדיקה</Label>
                    <Select value={selectedLabTestType} onValueChange={handleLabTestTypeChange}>
                      <SelectTrigger className="border-2 border-purple-300">
                        <SelectValue placeholder="בחר סוג בדיקה מהרשימה" />
                      </SelectTrigger>
                      <SelectContent>
                        {labTestTypes.filter(lt => lt.is_active !== false).map(lt => (
                          <SelectItem key={lt.id} value={lt.name}>
                            {lt.name}
                            {lt.parameters?.length > 0 && (
                              <span className="text-xs text-gray-500 mr-2">
                                ({lt.parameters.length} פרמטרים)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedLabTestType && testType && (
                    <div className="p-4 border-2 border-dashed rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">צילום/העלאת תוצאות לחילוץ אוטומטי</Label>
                        {extractingResults && (
                          <span className="text-xs text-blue-600 animate-pulse">מחלץ נתונים...</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Label htmlFor="lab-image-upload" className="cursor-pointer flex-1">
                          <div className="border rounded-lg p-3 text-center hover:bg-white transition-colors">
                            <Upload className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                            <span className="text-xs text-gray-600">העלה תמונה</span>
                          </div>
                        </Label>
                        <Input
                          id="lab-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageForResults(e.target.files[0])}
                          disabled={extractingResults}
                        />
                        <Label htmlFor="lab-image-camera" className="cursor-pointer flex-1">
                          <div className="border rounded-lg p-3 text-center hover:bg-white transition-colors">
                            <Camera className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                            <span className="text-xs text-gray-600">צלם תמונה</span>
                          </div>
                        </Label>
                        <Input
                          id="lab-image-camera"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageForResults(e.target.files[0])}
                          disabled={extractingResults}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {!selectedLabTestType && (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg bg-gray-50">
                    <p className="text-gray-500">נא לבחור סוג בדיקה כדי להתחיל להזין תוצאות</p>
                  </div>
                )}

                {selectedLabTestType && (!testType || !testType.parameters || testType.parameters.length === 0) && (
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">לא הוגדרו פרמטרים לבדיקה זו. ניתן להזין תוצאות בטקסט חופשי.</p>
                    </div>
                    <div>
                      <Label>תוצאות טקסט חופשי</Label>
                      <Textarea
                        value={typeof test.results === 'string' ? test.results : JSON.stringify(test.results || '')}
                        onChange={(e) => updateLabTest(currentLabTestIndex, 'results', e.target.value)}
                        rows={4}
                        placeholder="הזן תוצאות..."
                      />
                    </div>
                  </div>
                )}
                
                {selectedLabTestType && testType && testType.parameters && testType.parameters.length > 0 && testType.parameters.map((param, idx) => {
                  const value = results[param.name] || '';
                  const hasRange = param.min_normal !== undefined && param.max_normal !== undefined;
                  const outOfRange = isOutOfRange(value, param.min_normal, param.max_normal);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${outOfRange ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="flex-1 font-semibold text-base">
                          {param.name}
                          {param.unit && <span className="text-gray-500 font-normal text-sm ml-1">({param.unit})</span>}
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={value}
                          onChange={(e) => {
                            const newResults = { ...results, [param.name]: e.target.value };
                            updateLabTest(currentLabTestIndex, 'results', newResults);
                          }}
                          placeholder="ערך"
                          className={`w-28 text-center font-semibold ${outOfRange ? 'border-red-500 text-red-700' : ''}`}
                        />
                      </div>

                      {hasRange && (
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>טווח תקין: {param.min_normal} - {param.max_normal}</span>
                            {outOfRange && (
                              <span className="text-red-600 font-semibold">⚠ חריג מהנורמה</span>
                            )}
                          </div>
                          
                          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-full bg-green-300"></div>
                            
                            <div className="absolute top-0 left-0 bottom-0 flex items-center px-2 text-xs font-semibold text-gray-700">
                              {param.min_normal}
                            </div>
                            <div className="absolute top-0 right-0 bottom-0 flex items-center px-2 text-xs font-semibold text-gray-700">
                              {param.max_normal}
                            </div>
                            
                            {value && (
                              <div
                                className="absolute top-0 bottom-0 w-1"
                                style={{
                                  left: `${getValuePosition(value, param.min_normal, param.max_normal)}%`,
                                  backgroundColor: outOfRange ? '#ef4444' : '#1e40af',
                                  transform: 'translateX(-50%)'
                                }}
                              >
                                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                                  outOfRange ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                }`}>
                                  {value}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowLabResultsDialog(false)}>
                    <X className="w-4 h-4 ml-2" />
                    ביטול
                  </Button>
                  <Button 
                    type="button" 
                    onClick={saveLabResults}
                    disabled={!selectedLabTestType}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    שמור תוצאות
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {showFollowUpAppointmentForm && (
        <Dialog open={showFollowUpAppointmentForm} onOpenChange={setShowFollowUpAppointmentForm}>
          <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>קביעת תור מעקב</DialogTitle>
            </DialogHeader>
            <AppointmentForm
              appointment={{
                client_id: client?.id || '',
                client_name: formData.full_name,
                patient_id: selectedPatient?.id || '',
                patient_name: formData.patient_name,
                doctor_id: doctors.find(d => d.display_name === formData.doctor_name)?.user_id || '',
                doctor_name: formData.doctor_name,
                notes: `ביקור מעקב - ${formData.chief_complaint || ''}`
              }}
              onSubmit={handleFollowUpAppointmentSubmit}
              onCancel={() => setShowFollowUpAppointmentForm(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}