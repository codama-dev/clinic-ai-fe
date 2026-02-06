import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Syringe, FlaskConical, Bell, Save, DollarSign, Upload, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientManagementSettingsPage() {
  const [isVaccinationFormOpen, setIsVaccinationFormOpen] = useState(false);
  const [editingVaccinationType, setEditingVaccinationType] = useState(null);
  const [vaccinationFormData, setVaccinationFormData] = useState({
    name: '',
    description: '',
    default_interval_days: '',
    first_reminder_days_before: 14,
    second_reminder_days_before: 7,
    is_active: true,
    client_price: '',
    add_to_price_list: false,
    category: 'תרופות',
    sub_category: 'חיסונים'
  });

  const [isLabTestFormOpen, setIsLabTestFormOpen] = useState(false);
  const [editingLabTest, setEditingLabTest] = useState(null);
  const [labTestFormData, setLabTestFormData] = useState({
    name: '',
    description: '',
    parameters: [],
    is_active: true
  });
  const [currentParameter, setCurrentParameter] = useState({ name: '', unit: '', min_normal: '', max_normal: '' });
  const [editingParameterIndex, setEditingParameterIndex] = useState(null);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [selectedLabTestForPrice, setSelectedLabTestForPrice] = useState(null);
  const [priceFormData, setPriceFormData] = useState({ client_price: '', supplier_price: '', supplier_name: '', notes: '' });

  const [isImportVaccinationDialogOpen, setIsImportVaccinationDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showVaccinationPreflightDialog, setShowVaccinationPreflightDialog] = useState(false);
  const [vaccinationPreflightResult, setVaccinationPreflightResult] = useState(null);
  const [analyzingVaccinationFile, setAnalyzingVaccinationFile] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: vaccinationTypes = [] } = useQuery({
    queryKey: ['vaccinationTypes'],
    queryFn: () => base44.entities.VaccinationType.list('-created_date', 100)
  });

  const { data: labTestTypes = [] } = useQuery({
    queryKey: ['labTestTypes'],
    queryFn: () => base44.entities.LabTestType.list('-created_date', 100)
  });

  const { data: clientPriceList = [] } = useQuery({
    queryKey: ['clientPriceList'],
    queryFn: () => base44.entities.ClientPriceList.list('-created_date', 500)
  });

  const createVaccinationTypeMutation = useMutation({
    mutationFn: (data) => base44.entities.VaccinationType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vaccinationTypes']);
      setIsVaccinationFormOpen(false);
      setEditingVaccinationType(null);
      resetVaccinationForm();
      toast.success('סוג החיסון נוסף בהצלחה');
    }
  });

  const updateVaccinationTypeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VaccinationType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vaccinationTypes']);
      setIsVaccinationFormOpen(false);
      setEditingVaccinationType(null);
      resetVaccinationForm();
      toast.success('סוג החיסון עודכן בהצלחה');
    }
  });

  const deleteVaccinationTypeMutation = useMutation({
    mutationFn: (id) => base44.entities.VaccinationType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['vaccinationTypes']);
      toast.success('סוג החיסון נמחק בהצלחה');
    }
  });

  const resetVaccinationForm = () => {
    setVaccinationFormData({
      name: '',
      description: '',
      default_interval_days: '',
      first_reminder_days_before: 14,
      second_reminder_days_before: 7,
      is_active: true,
      client_price: '',
      add_to_price_list: false,
      category: 'תרופות',
      sub_category: 'חיסונים'
    });
  };

  const handleVaccinationFormSubmit = async (e) => {
    e.preventDefault();
    if (!vaccinationFormData.name) {
      alert('נא למלא שם');
      return;
    }

    try {
      if (editingVaccinationType) {
        await updateVaccinationTypeMutation.mutateAsync({ id: editingVaccinationType.id, data: vaccinationFormData });
      } else {
        await createVaccinationTypeMutation.mutateAsync(vaccinationFormData);
      }

      // Add or update in client price list if user checked the box and price is provided
      if (vaccinationFormData.add_to_price_list && vaccinationFormData.client_price) {
        const existingPrice = clientPriceList.find(p => p.product_name === vaccinationFormData.name);
        const priceData = {
          product_name: vaccinationFormData.name,
          category: vaccinationFormData.category,
          sub_category: vaccinationFormData.sub_category,
          client_price: parseFloat(vaccinationFormData.client_price),
          notes: vaccinationFormData.description || undefined
        };

        if (existingPrice) {
          await updatePriceListItemMutation.mutateAsync({ id: existingPrice.id, data: priceData });
        } else {
          await createPriceListItemMutation.mutateAsync(priceData);
        }
      }
    } catch (error) {
      console.error('Error saving vaccination type:', error);
    }
  };

  const handleEditVaccinationType = (type) => {
    setEditingVaccinationType(type);
    const existingPrice = clientPriceList.find(p => p.product_name === type.name);
    setVaccinationFormData({
      name: type.name,
      description: type.description || '',
      default_interval_days: type.default_interval_days || '',
      first_reminder_days_before: type.first_reminder_days_before || 14,
      second_reminder_days_before: type.second_reminder_days_before || 7,
      is_active: type.is_active !== false,
      client_price: existingPrice?.client_price || '',
      add_to_price_list: !!existingPrice,
      category: existingPrice?.category || 'תרופות',
      sub_category: existingPrice?.sub_category || 'חיסונים'
    });
    setIsVaccinationFormOpen(true);
  };

  const handleDeleteVaccinationType = (id) => {
    if (window.confirm('האם למחוק סוג חיסון זה?')) {
      deleteVaccinationTypeMutation.mutate(id);
    }
  };

  const handleAddDefaultVaccinations = async () => {
    const defaultTypes = [
      { name: 'חיסון כלבת', default_interval_days: 365, first_reminder_days_before: 30, second_reminder_days_before: 14 },
      { name: 'חיסון כלבת - בוגרים (מעל 2 חיסונים)', default_interval_days: 1095, first_reminder_days_before: 60, second_reminder_days_before: 30 },
      { name: 'חיסון משושה - בוגרים', default_interval_days: 365, first_reminder_days_before: 30, second_reminder_days_before: 14 },
      { name: 'תולעת הפארק', default_interval_days: 90, first_reminder_days_before: 14, second_reminder_days_before: 7 },
      { name: 'תילוע', default_interval_days: 90, first_reminder_days_before: 14, second_reminder_days_before: 7 }
    ];

    try {
      await base44.entities.VaccinationType.bulkCreate(defaultTypes);
      queryClient.invalidateQueries(['vaccinationTypes']);
      toast.success('סוגי החיסונים ברירת המחדל נוספו בהצלחה');
    } catch (error) {
      toast.error('שגיאה בהוספת סוגי חיסונים');
    }
  };

  const createLabTestMutation = useMutation({
    mutationFn: (data) => base44.entities.LabTestType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labTestTypes']);
      setIsLabTestFormOpen(false);
      setEditingLabTest(null);
      resetLabTestForm();
      toast.success('בדיקת המעבדה נוספה בהצלחה');
    }
  });

  const updateLabTestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LabTestType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labTestTypes']);
      setIsLabTestFormOpen(false);
      setEditingLabTest(null);
      resetLabTestForm();
      toast.success('בדיקת המעבדה עודכנה בהצלחה');
    }
  });

  const deleteLabTestMutation = useMutation({
    mutationFn: (id) => base44.entities.LabTestType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['labTestTypes']);
      toast.success('בדיקת המעבדה נמחקה בהצלחה');
    }
  });

  const createPriceListItemMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientPriceList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientPriceList']);
      toast.success('הבדיקה נוספה למחירון בהצלחה');
    }
  });

  const updatePriceListItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientPriceList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientPriceList']);
      toast.success('הבדיקה במחירון עודכנה בהצלחה');
    }
  });

  const resetLabTestForm = () => {
    setLabTestFormData({
      name: '',
      description: '',
      parameters: [],
      is_active: true
    });
    setCurrentParameter({ name: '', unit: '', min_normal: '', max_normal: '' });
  };

  const handleLabTestFormSubmit = (e) => {
    e.preventDefault();
    if (!labTestFormData.name) {
      alert('נא למלא שם בדיקה');
      return;
    }

    if (editingLabTest) {
      updateLabTestMutation.mutate({ id: editingLabTest.id, data: labTestFormData });
    } else {
      createLabTestMutation.mutate(labTestFormData);
    }
  };

  const handleEditLabTest = (test) => {
    setEditingLabTest(test);
    setLabTestFormData({
      name: test.name,
      description: test.description || '',
      parameters: test.parameters || [],
      is_active: test.is_active !== false
    });
    setIsLabTestFormOpen(true);
  };

  const handleDeleteLabTest = (id) => {
    if (window.confirm('האם למחוק בדיקה זו?')) {
      deleteLabTestMutation.mutate(id);
    }
  };

  const handleAddParameter = () => {
    if (!currentParameter.name) {
      toast.error('נא למלא שם פרמטר');
      return;
    }
    
    if (editingParameterIndex !== null) {
      // Update existing parameter
      const updatedParameters = [...labTestFormData.parameters];
      updatedParameters[editingParameterIndex] = currentParameter;
      setLabTestFormData({
        ...labTestFormData,
        parameters: updatedParameters
      });
      setEditingParameterIndex(null);
    } else {
      // Add new parameter
      setLabTestFormData({
        ...labTestFormData,
        parameters: [...labTestFormData.parameters, currentParameter]
      });
    }
    
    setCurrentParameter({ name: '', unit: '', min_normal: '', max_normal: '' });
  };

  const handleEditParameter = (index) => {
    setCurrentParameter(labTestFormData.parameters[index]);
    setEditingParameterIndex(index);
  };

  const handleCancelEditParameter = () => {
    setCurrentParameter({ name: '', unit: '', min_normal: '', max_normal: '' });
    setEditingParameterIndex(null);
  };

  const handleRemoveParameter = (index) => {
    setLabTestFormData({
      ...labTestFormData,
      parameters: labTestFormData.parameters.filter((_, i) => i !== index)
    });
  };

  const handleAddToPriceList = (labTest) => {
    setSelectedLabTestForPrice(labTest);
    const existingItem = clientPriceList.find(p => p.product_name === labTest.name);
    if (existingItem) {
      setPriceFormData({
        client_price: existingItem.client_price || '',
        supplier_price: existingItem.supplier_price || '',
        supplier_name: existingItem.supplier_name || '',
        notes: existingItem.notes || ''
      });
    } else {
      setPriceFormData({ client_price: '', supplier_price: '', supplier_name: '', notes: '' });
    }
    setIsPriceDialogOpen(true);
  };

  const handleSavePriceListItem = async () => {
    if (!priceFormData.client_price) {
      toast.error('נא למלא מחיר ללקוח');
      return;
    }

    const existingItem = clientPriceList.find(p => p.product_name === selectedLabTestForPrice.name);
    
    const data = {
      product_name: selectedLabTestForPrice.name,
      category: 'בדיקות',
      sub_category: 'בדיקות מעבדה',
      client_price: parseFloat(priceFormData.client_price),
      notes: priceFormData.notes || undefined
    };

    if (existingItem) {
      await updatePriceListItemMutation.mutateAsync({ id: existingItem.id, data });
    } else {
      await createPriceListItemMutation.mutateAsync(data);
    }

    setIsPriceDialogOpen(false);
    setSelectedLabTestForPrice(null);
    setPriceFormData({ client_price: '', supplier_price: '', supplier_name: '', notes: '' });
  };

  const handleEditPriceListItem = (item) => {
    // Find if this has a LabTestType definition
    const labTestType = labTestTypes.find(t => t.name === item.product_name);
    
    if (labTestType) {
      // Open the lab test form for editing
      handleEditLabTest(labTestType);
    } else {
      // Just edit the price
      setSelectedLabTestForPrice({ name: item.product_name });
      setPriceFormData({
        client_price: item.client_price || '',
        supplier_price: item.supplier_price || '',
        supplier_name: item.supplier_name || '',
        notes: item.notes || ''
      });
      setIsPriceDialogOpen(true);
    }
  };

  const handleAnalyzeVaccinationFile = async (file) => {
    if (!file) return;

    try {
      setAnalyzingVaccinationFile(true);
      toast.info('מנתח קובץ חיסונים...');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvContent = e.target.result;
          
          console.log('CSV Content length:', csvContent.length);
          console.log('First 100 chars:', csvContent.substring(0, 100));
          
          // Call with dry_run=true to get preflight analysis
          const response = await base44.functions.invoke('importVaccinationHistory', { 
            csvContent, 
            dry_run: true 
          });

          console.log('Response:', response);

          // The response structure is { data: { success: true, results: {...} } }
          const result = response.data || response;
          console.log('Processed result:', result);
          
          if (!result || !result.results) {
            throw new Error('תשובה לא תקינה מהשרת');
          }
          
          setVaccinationPreflightResult(result);
          setShowVaccinationPreflightDialog(true);
          setIsImportVaccinationDialogOpen(false);
          
          toast.success('ניתוח הושלם');
        } catch (error) {
          console.error('Preflight error:', error);
          console.error('Error details:', error.response?.data || error.message);
          toast.error(`שגיאה בניתוח הקובץ: ${error.response?.data?.error || error.message}`);
        } finally {
          setAnalyzingVaccinationFile(false);
        }
      };

      reader.onerror = () => {
        setAnalyzingVaccinationFile(false);
        toast.error('שגיאה בקריאת הקובץ');
      };

      reader.readAsText(file);
    } catch (error) {
      setAnalyzingVaccinationFile(false);
      toast.error('שגיאה בקריאת הקובץ');
    }
  };

  const handleConfirmVaccinationImport = async () => {
    if (!importFile) return;

    try {
      setShowVaccinationPreflightDialog(false);
      setIsImporting(true);
      setIsImportVaccinationDialogOpen(true);
      setImportResults(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvContent = e.target.result;

          // Call with dry_run=false to actually import
          const response = await base44.functions.invoke('importVaccinationHistory', { 
            csvContent, 
            dry_run: false 
          });

          // The response structure is { data: { success: true, results: {...} } }
          const results = response.data?.results || response.results;
          setImportResults(results);

          if (results.successful > 0) {
            toast.success(`${results.successful} חיסונים יובאו בהצלחה`);
            queryClient.invalidateQueries(['vaccinations']);
          }

          if (results.failed > 0) {
            toast.warning(`${results.failed} שורות נכשלו`);
          }

          if (results.failed === 0) {
            setImportFile(null);
            setTimeout(() => {
              setIsImportVaccinationDialogOpen(false);
              setImportResults(null);
            }, 3000);
          }
        } catch (error) {
          console.error('Import error:', error);
          toast.error('שגיאה בייבוא: ' + (error.message || 'שגיאה לא ידועה'));
        } finally {
          setIsImporting(false);
        }
      };

      reader.readAsText(importFile);
    } catch (error) {
      setIsImporting(false);
      toast.error('שגיאה בקריאת הקובץ');
    }
  };

  const getDefaultParametersForTest = (testName) => {
    const defaultTestsMap = {
      'CBC - ארנב': [
        { name: 'WBC', unit: '10^3/µL', min_normal: 2, max_normal: 13.5 },
        { name: 'GRAN', unit: '10^3/µL', min_normal: 0.61, max_normal: 9.9 },
        { name: 'LYM', unit: '10^3/µL', min_normal: 0.6, max_normal: 5.2 },
        { name: 'MON', unit: '10^3/µL', min_normal: 0, max_normal: 1.13 },
        { name: 'RBC', unit: '10^6/µL', min_normal: 3.4, max_normal: 6.5 },
        { name: 'HGB', unit: 'g/dL', min_normal: 8, max_normal: 14 },
        { name: 'HCT', unit: '%', min_normal: 25, max_normal: 45 },
        { name: 'MCV', unit: 'fL', min_normal: 60, max_normal: 83 },
        { name: 'MCH', unit: 'pg', min_normal: 18, max_normal: 26 },
        { name: 'MCHC', unit: 'g/L', min_normal: 275, max_normal: 360 },
        { name: 'RDW-CV', unit: '%', min_normal: 0.125, max_normal: 0.246 },
        { name: 'RDW-SD', unit: 'fL', min_normal: 33.5, max_normal: 78 },
        { name: 'PLT', unit: '10^3/µL', min_normal: 80, max_normal: 1250 },
        { name: 'MPV', unit: 'fL', min_normal: 4, max_normal: 7.8 },
        { name: 'PDW', unit: 'fL', min_normal: 12, max_normal: 17.5 },
        { name: 'PCT', unit: '%', min_normal: 0.3, max_normal: 7.9 }
      ],
      'CBC - חמוס זכר': [
        { name: 'WBC', unit: '10^3/µL', min_normal: 4.4, max_normal: 19.1 },
        { name: '%NEU', unit: '%', min_normal: 11, max_normal: 82 },
        { name: '%LYM', unit: '%', min_normal: 12, max_normal: 73 },
        { name: '%MONO', unit: '%', min_normal: 0, max_normal: 9 },
        { name: '%OS', unit: '%', min_normal: 0, max_normal: 8.5 },
        { name: 'RBC', unit: '10^6/µL', min_normal: 7.1, max_normal: 13.2 },
        { name: 'MCV', unit: 'fL', min_normal: 42.6, max_normal: 52.5 },
        { name: 'MVH', unit: 'pg', min_normal: 13.7, max_normal: 19.7 },
        { name: 'MCHC', unit: 'g/L', min_normal: 30.3, max_normal: 34.9 },
        { name: 'PCV', unit: '%', min_normal: 33.6, max_normal: 61 }
      ],
      'CBC - חמוס נקבה': [
        { name: 'WBC', unit: '10^3/µL', min_normal: 2.5, max_normal: 18.2 },
        { name: '%NEU', unit: '%', min_normal: 12, max_normal: 84 },
        { name: '%LYM', unit: '%', min_normal: 12, max_normal: 95 },
        { name: '%MONO', unit: '%', min_normal: 1, max_normal: 8 },
        { name: '%EOS', unit: '%', min_normal: 0, max_normal: 9 },
        { name: 'RBC', unit: '10^6/µL', min_normal: 6.77, max_normal: 9.76 },
        { name: 'MCV', unit: 'fL', min_normal: 44.4, max_normal: 53.7 },
        { name: 'MCH', unit: 'pg', min_normal: 16.4, max_normal: 19.4 },
        { name: 'MCHC', unit: 'g/L', min_normal: 33.2, max_normal: 42.2 },
        { name: 'PCV', unit: '%', min_normal: 34.6, max_normal: 55 }
      ],
      'PT/PTT - כלב': [
        { name: 'APTT', unit: 'שניות', min_normal: 30, max_normal: 90 },
        { name: 'PT', unit: 'שניות', min_normal: 5, max_normal: 15 },
        { name: 'TT', unit: 'שניות', min_normal: 8, max_normal: 26 },
        { name: 'Fib', unit: 'g/L', min_normal: 0.7, max_normal: 3.2 }
      ],
      'בדיקת שתן': [
        { name: 'BLOOD', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'BILI', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'URB', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'KETONES', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'GLU', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'PROTEIN', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'NITR', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'LEU', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'PH', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'S.G', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'צבע', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'משקעים', unit: '', min_normal: 0, max_normal: 0 }
      ],
      'כימיה - ארנב': [
        { name: 'ALB', unit: 'g/dL', min_normal: 2.5, max_normal: 5.2 },
        { name: 'TP', unit: 'g/dL', min_normal: 5.4, max_normal: 8.3 },
        { name: 'GLU', unit: 'mg/dL', min_normal: 75, max_normal: 155 },
        { name: 'ALP', unit: 'U/L', min_normal: 4, max_normal: 16 },
        { name: 'ALT', unit: 'U/L', min_normal: 15, max_normal: 80 },
        { name: 'TBIL', unit: 'mg/dL', min_normal: 0, max_normal: 0.75 },
        { name: 'AMY', unit: 'U/L', min_normal: 200, max_normal: 500 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 15, max_normal: 50 },
        { name: 'CREA', unit: 'mg/dL', min_normal: 0.5, max_normal: 2.6 },
        { name: 'CA', unit: 'mg/dL', min_normal: 8, max_normal: 14.8 },
        { name: 'PHOS', unit: 'mg/dL', min_normal: 2.3, max_normal: 6.9 },
        { name: 'GLOB', unit: 'g/dL', min_normal: 1.5, max_normal: 3.5 }
      ],
      'כימיה - חמוס זכר': [
        { name: 'ALB', unit: 'g/dL', min_normal: 3.3, max_normal: 4.1 },
        { name: 'TP', unit: 'g/dL', min_normal: 5.6, max_normal: 7.2 },
        { name: 'GLU', unit: 'mg/dL', min_normal: 62.5, max_normal: 198 },
        { name: 'ALP', unit: 'U/L', min_normal: 11, max_normal: 120 },
        { name: 'ALT', unit: 'U/L', min_normal: 54, max_normal: 289 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 11, max_normal: 42 },
        { name: 'CREA', unit: 'mg/dL', min_normal: 0.2, max_normal: 1 },
        { name: 'CA', unit: 'mg/dL', min_normal: 8.3, max_normal: 11.8 },
        { name: 'PHOS', unit: 'mg/dL', min_normal: 4, max_normal: 8.7 },
        { name: 'GLOB', unit: 'g/dL', min_normal: 2, max_normal: 4 }
      ],
      'כימיה מלאה - חתול': [
        { name: 'ALB', unit: 'g/dL', min_normal: 2.2, max_normal: 4.4 },
        { name: 'TP', unit: 'g/dL', min_normal: 5.7, max_normal: 8.9 },
        { name: 'GLOB', unit: 'g/dL', min_normal: 2.3, max_normal: 5.2 },
        { name: 'A/G', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'TB', unit: 'mg/dL', min_normal: 0, max_normal: 15 },
        { name: 'GGT', unit: 'U/L', min_normal: 0, max_normal: 8 },
        { name: 'AST', unit: 'U/L', min_normal: 0, max_normal: 48 },
        { name: 'ALT', unit: 'U/L', min_normal: 5, max_normal: 130 },
        { name: 'ALP', unit: 'U/L', min_normal: 14, max_normal: 111 },
        { name: 'TBA', unit: 'µmol/L', min_normal: 0, max_normal: 9 },
        { name: 'AMY', unit: 'U/L', min_normal: 500, max_normal: 1500 },
        { name: 'LPS', unit: 'U/L', min_normal: 0, max_normal: 40 },
        { name: 'LDH', unit: 'U/L', min_normal: 0, max_normal: 798 },
        { name: 'CK', unit: 'U/L', min_normal: 0, max_normal: 559 },
        { name: 'CREA', unit: 'mg/dL', min_normal: 0.5, max_normal: 2.4 },
        { name: 'UA', unit: 'mg/dL', min_normal: 0, max_normal: 60 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 11.24, max_normal: 36.25 },
        { name: 'BUN/CREA', unit: '', min_normal: 27000, max_normal: 182000 },
        { name: 'GLU', unit: 'mg/dL', min_normal: 74.06, max_normal: 159.12 },
        { name: 'TC', unit: 'mmol/L', min_normal: 1.68, max_normal: 5.81 },
        { name: 'TG', unit: 'mmol/L', min_normal: 0, max_normal: 1.13 },
        { name: 'iCO2', unit: 'mmol/L', min_normal: 13, max_normal: 25 },
        { name: 'CA', unit: 'mg/dL', min_normal: 7.8, max_normal: 11.32 },
        { name: 'PHOS', unit: 'mg/dL', min_normal: 3.1, max_normal: 7.5 }
      ],
      'כימיה מלאה - כלב': [
        { name: 'ALB', unit: 'g/dL', min_normal: 2.3, max_normal: 4 },
        { name: 'TP', unit: 'g/dL', min_normal: 4.9, max_normal: 8.2 },
        { name: 'GLOB', unit: 'g/dL', min_normal: 1.9, max_normal: 4.5 },
        { name: 'A/G', unit: '', min_normal: 0, max_normal: 0 },
        { name: 'TB', unit: 'mg/dL', min_normal: 0, max_normal: 15 },
        { name: 'GGT', unit: 'U/L', min_normal: 0, max_normal: 10 },
        { name: 'AST', unit: 'U/L', min_normal: 0, max_normal: 50 },
        { name: 'ALT', unit: 'U/L', min_normal: 5, max_normal: 125 },
        { name: 'ALP', unit: 'U/L', min_normal: 17, max_normal: 212 },
        { name: 'TBA', unit: 'µmol/L', min_normal: 0, max_normal: 17 },
        { name: 'AMY', unit: 'U/L', min_normal: 400, max_normal: 1500 },
        { name: 'LPS', unit: 'U/L', min_normal: 0, max_normal: 216 },
        { name: 'LDH', unit: 'U/L', min_normal: 40, max_normal: 400 },
        { name: 'CK', unit: 'U/L', min_normal: 10, max_normal: 200 },
        { name: 'CREA', unit: 'mg/dL', min_normal: 0.3, max_normal: 1.8 },
        { name: 'UA', unit: 'mg/dL', min_normal: 0, max_normal: 60 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 7.03, max_normal: 26.98 },
        { name: 'BUN/CREA', unit: '', min_normal: 16, max_normal: 218000 },
        { name: 'GLU', unit: 'mg/dL', min_normal: 74.06, max_normal: 143.08 },
        { name: 'TC', unit: 'mmol/L', min_normal: 2.84, max_normal: 8.27 },
        { name: 'TG', unit: 'mmol/L', min_normal: 0, max_normal: 1.13 },
        { name: 'iCO2', unit: 'mmol/L', min_normal: 12, max_normal: 27 },
        { name: 'CA', unit: 'mg/dL', min_normal: 7.92, max_normal: 12 },
        { name: 'PHOS', unit: 'mg/dL', min_normal: 2.51, max_normal: 6.79 }
      ],
      'כימיה קצרה - חתול': [
        { name: 'TP', unit: 'g/dL', min_normal: 5.7, max_normal: 8.9 },
        { name: 'AST', unit: 'U/L', min_normal: 0, max_normal: 48 },
        { name: 'ALT', unit: 'U/L', min_normal: 5, max_normal: 130 },
        { name: 'ALP', unit: 'U/L', min_normal: 14, max_normal: 111 },
        { name: 'LDH', unit: 'U/L', min_normal: 0, max_normal: 798 },
        { name: 'CK', unit: 'U/L', min_normal: 0, max_normal: 559 },
        { name: 'CREA', unit: 'mg/dL', min_normal: 0.5, max_normal: 2.4 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 11.24, max_normal: 36.25 },
        { name: 'BUN/CREA', unit: '', min_normal: 27, max_normal: 182 },
        { name: 'GLU', unit: 'mg/dL', min_normal: 74.06, max_normal: 159.12 }
      ],
      'כימיה קצרה - כלב': [
        { name: 'TP', unit: 'g/dL', min_normal: 4.9, max_normal: 8.2 },
        { name: 'AST', unit: 'U/L', min_normal: 0, max_normal: 50 },
        { name: 'ALT', unit: 'U/L', min_normal: 5, max_normal: 125 },
        { name: 'ALP', unit: 'U/L', min_normal: 17, max_normal: 212 },
        { name: 'LDH', unit: 'U/L', min_normal: 40, max_normal: 400 },
        { name: 'CK', unit: 'U/L', min_normal: 10, max_normal: 200 },
        { name: 'CREA', unit: 'mg/dL', min_normal: 0.3, max_normal: 1.8 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 7.03, max_normal: 26.98 },
        { name: 'BUN/CREA', unit: '', min_normal: 16, max_normal: 218 },
        { name: 'GLU', unit: 'mg/dL', min_normal: 74.06, max_normal: 143.08 }
      ],
      'CBC - חמוס נקבה': [
        { name: 'WBC', unit: '10^3/µL', min_normal: 2.5, max_normal: 10 },
        { name: 'RBC', unit: '10^6/µL', min_normal: 6, max_normal: 11 },
        { name: 'HGB', unit: 'g/dL', min_normal: 11, max_normal: 17 },
        { name: 'HCT', unit: '%', min_normal: 33, max_normal: 52 }
      ],
      'CBC - כלב': [
        { name: 'WBC', unit: '10^3/µL', min_normal: 6, max_normal: 17 },
        { name: 'RBC', unit: '10^6/µL', min_normal: 5.5, max_normal: 8.5 },
        { name: 'HGB', unit: 'g/dL', min_normal: 12, max_normal: 18 },
        { name: 'HCT', unit: '%', min_normal: 37, max_normal: 55 },
        { name: 'PLT', unit: '10^3/µL', min_normal: 200, max_normal: 500 }
      ],
      'CBC - חתול': [
        { name: 'WBC', unit: '10^3/µL', min_normal: 5.5, max_normal: 19.5 },
        { name: 'Neu#', unit: '10^3/µL', min_normal: 1.8, max_normal: 12.6 },
        { name: 'Lym#', unit: '10^3/µL', min_normal: 0.8, max_normal: 7.9 },
        { name: 'Mon#', unit: '10^3/µL', min_normal: 0, max_normal: 1.8 },
        { name: 'Eos#', unit: '10^3/µL', min_normal: 0, max_normal: 1.9 },
        { name: 'Neu%', unit: '%', min_normal: 30, max_normal: 85 },
        { name: 'Lym%', unit: '%', min_normal: 10, max_normal: 53 },
        { name: 'Mon%', unit: '%', min_normal: 0, max_normal: 10 },
        { name: 'Eos%', unit: '%', min_normal: 0, max_normal: 11 },
        { name: 'RBC', unit: '10^6/µL', min_normal: 5.1, max_normal: 11.2 },
        { name: 'HGB', unit: 'g/dL', min_normal: 8.5, max_normal: 16.2 },
        { name: 'HCT', unit: '%', min_normal: 26, max_normal: 51 },
        { name: 'MCV', unit: 'fL', min_normal: 35, max_normal: 54 },
        { name: 'MCH', unit: 'pg', min_normal: 11.8, max_normal: 18 },
        { name: 'MCHC', unit: 'g/L', min_normal: 300, max_normal: 380 },
        { name: 'RDW-CV', unit: '', min_normal: 0.132, max_normal: 0.256 },
        { name: 'RDW-SD', unit: 'fL', min_normal: 23.7, max_normal: 45.6 },
        { name: 'PLT', unit: '10^3/µL', min_normal: 100, max_normal: 518 },
        { name: 'MPV', unit: 'fL', min_normal: 8.2, max_normal: 16.3 },
        { name: 'PDW', unit: 'fL', min_normal: 12, max_normal: 17.5 },
        { name: 'PCT', unit: '%', min_normal: 0.9, max_normal: 7 }
      ],
      'בדיקת שתן': [
        { name: 'pH', unit: '', min_normal: 5.5, max_normal: 7.5 },
        { name: 'Protein', unit: 'mg/dL', min_normal: 0, max_normal: 30 },
        { name: 'Glucose', unit: 'mg/dL', min_normal: 0, max_normal: 0 },
        { name: 'Specific Gravity', unit: '', min_normal: 1.015, max_normal: 1.045 }
      ],
      'כימיה קצרה - כלב': [
        { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 140 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 7, max_normal: 27 },
        { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.5, max_normal: 1.8 },
        { name: 'ALT', unit: 'U/L', min_normal: 10, max_normal: 125 },
        { name: 'ALP', unit: 'U/L', min_normal: 23, max_normal: 212 }
      ],
      'כימיה קצרה - חתול': [
        { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 150 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 16, max_normal: 36 },
        { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.8, max_normal: 2.4 },
        { name: 'ALT', unit: 'U/L', min_normal: 12, max_normal: 130 },
        { name: 'ALP', unit: 'U/L', min_normal: 14, max_normal: 111 }
      ],
      'כימיה מלאה - חתול': [
        { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 150 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 16, max_normal: 36 },
        { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.8, max_normal: 2.4 },
        { name: 'Total Protein', unit: 'g/dL', min_normal: 5.4, max_normal: 7.8 },
        { name: 'Albumin', unit: 'g/dL', min_normal: 2.1, max_normal: 3.3 },
        { name: 'ALT', unit: 'U/L', min_normal: 12, max_normal: 130 },
        { name: 'ALP', unit: 'U/L', min_normal: 14, max_normal: 111 }
      ],
      'כימיה מלאה - כלב': [
        { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 140 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 7, max_normal: 27 },
        { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.5, max_normal: 1.8 },
        { name: 'Total Protein', unit: 'g/dL', min_normal: 5.2, max_normal: 8.2 },
        { name: 'Albumin', unit: 'g/dL', min_normal: 2.3, max_normal: 4 },
        { name: 'ALT', unit: 'U/L', min_normal: 10, max_normal: 125 },
        { name: 'ALP', unit: 'U/L', min_normal: 23, max_normal: 212 }
      ],
      'כימיה - ארנב': [
        { name: 'Glucose', unit: 'mg/dL', min_normal: 75, max_normal: 155 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 13, max_normal: 29 },
        { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.5, max_normal: 2.5 },
        { name: 'ALT', unit: 'U/L', min_normal: 25, max_normal: 65 }
      ],
      'כימיה - חמוס זכר': [
        { name: 'Glucose', unit: 'mg/dL', min_normal: 60, max_normal: 125 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 10, max_normal: 33 },
        { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.2, max_normal: 0.9 },
        { name: 'ALT', unit: 'U/L', min_normal: 28, max_normal: 184 }
      ],
      'כימיה - חמוס נקבה': [
        { name: 'ALB', unit: 'g/dL', min_normal: 3.3, max_normal: 4.1 },
        { name: 'TP', unit: 'g/dL', min_normal: 5.6, max_normal: 7.2 },
        { name: 'GLU', unit: 'mg/dL', min_normal: 85, max_normal: 207 },
        { name: 'ALP', unit: 'U/L', min_normal: 3, max_normal: 62 },
        { name: 'ALT', unit: 'U/L', min_normal: 54, max_normal: 280 },
        { name: 'BUN', unit: 'mg/dL', min_normal: 10, max_normal: 45 },
        { name: 'CREA', unit: 'mg/dL', min_normal: 0, max_normal: 5 },
        { name: 'CA', unit: 'mg/dL', min_normal: 8, max_normal: 10.2 },
        { name: 'PHOS', unit: 'mg/dL', min_normal: 4.2, max_normal: 10.1 },
        { name: 'GLOB', unit: 'g/dL', min_normal: 2.2, max_normal: 3.2 }
      ],
      'PT/PTT - כלב': [
        { name: 'PT', unit: 'seconds', min_normal: 6, max_normal: 10 },
        { name: 'PTT', unit: 'seconds', min_normal: 10, max_normal: 15 }
      ]
    };
    return defaultTestsMap[testName] || [];
  };

  const handleAddDefaultLabTests = async () => {
    const defaultTests = [
      {
        name: 'CBC - ארנב',
        parameters: getDefaultParametersForTest('CBC - ארנב')
      },
      {
        name: 'CBC - חמוס זכר',
        parameters: [
          { name: 'WBC', unit: '10^3/µL', min_normal: 2.5, max_normal: 10 },
          { name: 'RBC', unit: '10^6/µL', min_normal: 6.5, max_normal: 12 },
          { name: 'HGB', unit: 'g/dL', min_normal: 12, max_normal: 18 },
          { name: 'HCT', unit: '%', min_normal: 35, max_normal: 55 }
        ]
      },
      {
        name: 'CBC - חמוס נקבה',
        parameters: [
          { name: 'WBC', unit: '10^3/µL', min_normal: 2.5, max_normal: 10 },
          { name: 'RBC', unit: '10^6/µL', min_normal: 6, max_normal: 11 },
          { name: 'HGB', unit: 'g/dL', min_normal: 11, max_normal: 17 },
          { name: 'HCT', unit: '%', min_normal: 33, max_normal: 52 }
        ]
      },
      {
        name: 'CBC - כלב',
        parameters: [
          { name: 'WBC', unit: '10^3/µL', min_normal: 6, max_normal: 17 },
          { name: 'RBC', unit: '10^6/µL', min_normal: 5.5, max_normal: 8.5 },
          { name: 'HGB', unit: 'g/dL', min_normal: 12, max_normal: 18 },
          { name: 'HCT', unit: '%', min_normal: 37, max_normal: 55 },
          { name: 'PLT', unit: '10^3/µL', min_normal: 200, max_normal: 500 }
        ]
      },
      {
        name: 'CBC - חתול',
        parameters: [
          { name: 'WBC', unit: '10^3/µL', min_normal: 5.5, max_normal: 19.5 },
          { name: 'RBC', unit: '10^6/µL', min_normal: 5, max_normal: 10 },
          { name: 'HGB', unit: 'g/dL', min_normal: 8, max_normal: 15 },
          { name: 'HCT', unit: '%', min_normal: 24, max_normal: 45 },
          { name: 'PLT', unit: '10^3/µL', min_normal: 300, max_normal: 800 }
        ]
      },
      {
        name: 'בדיקת שתן',
        parameters: [
          { name: 'pH', unit: '', min_normal: 5.5, max_normal: 7.5 },
          { name: 'Protein', unit: 'mg/dL', min_normal: 0, max_normal: 30 },
          { name: 'Glucose', unit: 'mg/dL', min_normal: 0, max_normal: 0 },
          { name: 'Specific Gravity', unit: '', min_normal: 1.015, max_normal: 1.045 }
        ]
      },
      {
        name: 'כימיה קצרה - כלב',
        parameters: [
          { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 140 },
          { name: 'BUN', unit: 'mg/dL', min_normal: 7, max_normal: 27 },
          { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.5, max_normal: 1.8 },
          { name: 'ALT', unit: 'U/L', min_normal: 10, max_normal: 125 },
          { name: 'ALP', unit: 'U/L', min_normal: 23, max_normal: 212 }
        ]
      },
      {
        name: 'כימיה קצרה - חתול',
        parameters: [
          { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 150 },
          { name: 'BUN', unit: 'mg/dL', min_normal: 16, max_normal: 36 },
          { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.8, max_normal: 2.4 },
          { name: 'ALT', unit: 'U/L', min_normal: 12, max_normal: 130 },
          { name: 'ALP', unit: 'U/L', min_normal: 14, max_normal: 111 }
        ]
      },
      {
        name: 'כימיה מלאה - חתול',
        parameters: [
          { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 150 },
          { name: 'BUN', unit: 'mg/dL', min_normal: 16, max_normal: 36 },
          { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.8, max_normal: 2.4 },
          { name: 'Total Protein', unit: 'g/dL', min_normal: 5.4, max_normal: 7.8 },
          { name: 'Albumin', unit: 'g/dL', min_normal: 2.1, max_normal: 3.3 },
          { name: 'ALT', unit: 'U/L', min_normal: 12, max_normal: 130 },
          { name: 'ALP', unit: 'U/L', min_normal: 14, max_normal: 111 }
        ]
      },
      {
        name: 'כימיה מלאה - כלב',
        parameters: [
          { name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 140 },
          { name: 'BUN', unit: 'mg/dL', min_normal: 7, max_normal: 27 },
          { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.5, max_normal: 1.8 },
          { name: 'Total Protein', unit: 'g/dL', min_normal: 5.2, max_normal: 8.2 },
          { name: 'Albumin', unit: 'g/dL', min_normal: 2.3, max_normal: 4 },
          { name: 'ALT', unit: 'U/L', min_normal: 10, max_normal: 125 },
          { name: 'ALP', unit: 'U/L', min_normal: 23, max_normal: 212 }
        ]
      },
      {
        name: 'כימיה - ארנב',
        parameters: [
          { name: 'Glucose', unit: 'mg/dL', min_normal: 75, max_normal: 155 },
          { name: 'BUN', unit: 'mg/dL', min_normal: 13, max_normal: 29 },
          { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.5, max_normal: 2.5 },
          { name: 'ALT', unit: 'U/L', min_normal: 25, max_normal: 65 }
        ]
      },
      {
        name: 'כימיה - חמוס זכר',
        parameters: [
          { name: 'Glucose', unit: 'mg/dL', min_normal: 60, max_normal: 125 },
          { name: 'BUN', unit: 'mg/dL', min_normal: 10, max_normal: 33 },
          { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.2, max_normal: 0.9 },
          { name: 'ALT', unit: 'U/L', min_normal: 28, max_normal: 184 }
        ]
      },
      {
        name: 'כימיה - חמוס נקבה',
        parameters: [
          { name: 'Glucose', unit: 'mg/dL', min_normal: 60, max_normal: 125 },
          { name: 'BUN', unit: 'mg/dL', min_normal: 10, max_normal: 33 },
          { name: 'Creatinine', unit: 'mg/dL', min_normal: 0.2, max_normal: 0.9 },
          { name: 'ALT', unit: 'U/L', min_normal: 28, max_normal: 184 }
        ]
      },
      {
        name: 'PT/PTT - כלב',
        parameters: [
          { name: 'PT', unit: 'seconds', min_normal: 6, max_normal: 10 },
          { name: 'PTT', unit: 'seconds', min_normal: 10, max_normal: 15 }
        ]
      }
    ];

    try {
      await base44.entities.LabTestType.bulkCreate(defaultTests);
      queryClient.invalidateQueries(['labTestTypes']);
      toast.success('בדיקות המעבדה ברירת המחדל נוספו בהצלחה');
    } catch (error) {
      toast.error('שגיאה בהוספת בדיקות מעבדה');
    }
  };

  const hasManagementAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_settings');

  if (!hasManagementAccess) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">אין לך הרשאות לצפות בעמוד זה</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">הגדרות רפואיות</h1>
        <p className="text-gray-500">הגדרת סוגי חיסונים, בדיקות מעבדה, ותזכורות</p>
      </div>

      <Tabs defaultValue="vaccinations" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vaccinations">
            <Syringe className="w-4 h-4 ml-2" />
            סוגי חיסונים וטיפולים מונעים
          </TabsTrigger>
          <TabsTrigger value="lab">
            <FlaskConical className="w-4 h-4 ml-2" />
            סוגי בדיקות מעבדה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vaccinations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>סוגי חיסונים וטיפולים מונעים</CardTitle>
                <div className="flex gap-2">
                  {vaccinationTypes.length === 0 && (
                    <Button size="sm" variant="outline" onClick={handleAddDefaultVaccinations}>
                      הוסף חיסונים ברירת מחדל
                    </Button>
                  )}
                  <Button size="sm" onClick={() => { resetVaccinationForm(); setEditingVaccinationType(null); setIsVaccinationFormOpen(true); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף סוג חיסון
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsImportVaccinationDialogOpen(true)}>
                    <Upload className="w-4 h-4 ml-2" />
                    ייבוא היסטוריית חיסונים
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vaccinationTypes.length === 0 ? (
                <p className="text-center py-8 text-gray-500">אין סוגי חיסונים מוגדרים</p>
              ) : (
                <div className="space-y-3">
                  {vaccinationTypes.map(type => (
                    <div key={type.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{type.name}</h3>
                            {!type.is_active && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">לא פעיל</span>
                            )}
                          </div>
                          {type.description && (
                            <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                          )}
                          <div className="text-sm text-gray-500 space-y-1">
                            {type.default_interval_days && (
                              <p>• מרווח זמן: {type.default_interval_days} ימים ({Math.floor(type.default_interval_days / 365)} שנים)</p>
                            )}
                            {type.first_reminder_days_before && (
                              <p>• תזכורת ראשונה: {type.first_reminder_days_before} ימים לפני</p>
                            )}
                            {type.second_reminder_days_before && (
                              <p>• תזכורת שנייה: {type.second_reminder_days_before} ימים לפני</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditVaccinationType(type)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteVaccinationType(type.id)}>
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

        <TabsContent value="lab">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>סוגי בדיקות מעבדה</CardTitle>
                <div className="flex gap-2">
                  {labTestTypes.length === 0 && (
                    <Button size="sm" variant="outline" onClick={handleAddDefaultLabTests}>
                      הוסף בדיקות ברירת מחדל
                    </Button>
                  )}
                  <Button size="sm" onClick={() => { resetLabTestForm(); setEditingLabTest(null); setIsLabTestFormOpen(true); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף בדיקה
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const labTestsFromPriceList = clientPriceList.filter(p => 
                  p.sub_category === 'בדיקות מעבדה'
                );

                const hasAnyLabTests = labTestTypes.length > 0 || labTestsFromPriceList.length > 0;

                if (!hasAnyLabTests) {
                  return <p className="text-center py-8 text-gray-500">אין בדיקות מעבדה מוגדרות</p>;
                }

                return (
                  <div className="space-y-6">
                    {labTestTypes.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FlaskConical className="w-5 h-5 text-purple-600" />
                          בדיקות מעבדה מוגדרות
                          <span className="text-sm text-gray-500">({labTestTypes.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {labTestTypes.map(test => {
                            const existsInPriceList = clientPriceList.some(p => p.product_name === test.name);
                            const priceListItem = clientPriceList.find(p => p.product_name === test.name);
                            
                            return (
                              <div 
                                key={test.id} 
                                className="p-4 border rounded-lg hover:shadow-md transition-shadow hover:border-purple-300 hover:bg-purple-50"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-base">{test.name}</h3>
                                      {!test.is_active && (
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">לא פעיל</span>
                                      )}
                                    </div>
                                    {test.parameters && test.parameters.length > 0 && (
                                      <p className="text-sm text-gray-500">{test.parameters.length} פרמטרים</p>
                                    )}
                                    {existsInPriceList && priceListItem && (
                                      <p className="text-sm font-bold text-blue-600 mt-1">₪{priceListItem.client_price?.toFixed(2)}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditLabTest(test)}
                                      title="ערוך פרמטרים"
                                    >
                                      <Edit className="w-4 h-4 text-blue-600" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleDeleteLabTest(test.id)}
                                      title="מחק"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant={existsInPriceList ? "outline" : "default"}
                                  className={`w-full ${existsInPriceList ? 'text-blue-600 border-blue-300' : 'bg-green-600 hover:bg-green-700'}`}
                                  onClick={() => handleAddToPriceList(test)}
                                >
                                  <DollarSign className="w-4 h-4 ml-1" />
                                  {existsInPriceList ? 'ערוך מחיר' : 'הוסף למחירון'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {labTestsFromPriceList.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          בדיקות מעבדה במחירון לקוחות
                          <span className="text-sm text-gray-500">({labTestsFromPriceList.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {labTestsFromPriceList.map(item => {
                            const hasLabTestType = labTestTypes.some(t => t.name === item.product_name);
                            const labTestType = labTestTypes.find(t => t.name === item.product_name);
                            
                            return (
                              <div 
                                key={item.id} 
                                className="p-4 border-2 border-blue-200 rounded-lg hover:shadow-md transition-shadow bg-blue-50/30"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-base">{item.product_name}</h3>
                                      {hasLabTestType && labTestType?.parameters?.length > 0 && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                          {labTestType.parameters.length} פרמטרים
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-lg font-bold text-blue-700">₪{item.client_price?.toFixed(2)}</p>
                                    {item.item_type && (
                                      <p className="text-xs text-gray-500 mt-1">סוג: {item.item_type}</p>
                                    )}
                                    {item.supplier_name && (
                                      <p className="text-xs text-gray-500">ספק: {item.supplier_name}</p>
                                    )}
                                    {item.notes && (
                                      <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border">{item.notes}</p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditPriceListItem(item)}
                                    title="ערוך"
                                  >
                                    <Edit className="w-4 h-4 text-blue-600" />
                                  </Button>
                                </div>
                                {!hasLabTestType && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
                                    onClick={() => {
                                      // Create a LabTestType for this price list item
                                      setLabTestFormData({
                                        name: item.product_name,
                                        description: item.notes || '',
                                        parameters: [],
                                        is_active: true
                                      });
                                      setEditingLabTest(null);
                                      setIsLabTestFormOpen(true);
                                    }}
                                  >
                                    <Plus className="w-4 h-4 ml-1" />
                                    הוסף פרמטרים
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Dialog open={isVaccinationFormOpen} onOpenChange={setIsVaccinationFormOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingVaccinationType ? 'עריכת סוג חיסון' : 'הוספת סוג חיסון חדש'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVaccinationFormSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">שם החיסון/טיפול *</Label>
              <Input
                id="name"
                value={vaccinationFormData.name}
                onChange={(e) => setVaccinationFormData({ ...vaccinationFormData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">תיאור</Label>
              <Input
                id="description"
                value={vaccinationFormData.description}
                onChange={(e) => setVaccinationFormData({ ...vaccinationFormData, description: e.target.value })}
              />
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-blue-50/30">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add_to_price_list"
                  checked={vaccinationFormData.add_to_price_list}
                  onChange={(e) => setVaccinationFormData({ ...vaccinationFormData, add_to_price_list: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="add_to_price_list" className="cursor-pointer font-semibold">הוסף למחירון לקוחות</Label>
              </div>

              {vaccinationFormData.add_to_price_list && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="category">קטגוריה *</Label>
                      <Select
                        value={vaccinationFormData.category}
                        onValueChange={(value) => setVaccinationFormData({ ...vaccinationFormData, category: value })}
                      >
                        <SelectTrigger dir="rtl">
                          <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="בדיקות">בדיקות</SelectItem>
                          <SelectItem value="ניתוחים">ניתוחים</SelectItem>
                          <SelectItem value="תרופות">תרופות</SelectItem>
                          <SelectItem value="מזון">מזון</SelectItem>
                          <SelectItem value="תכשירים">תכשירים</SelectItem>
                          <SelectItem value="צעצועים">צעצועים</SelectItem>
                          <SelectItem value="צעצועים">צעצועים</SelectItem>
                          <SelectItem value="אחר">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sub_category">תת קטגוריה *</Label>
                      <Select
                        value={vaccinationFormData.sub_category}
                        onValueChange={(value) => setVaccinationFormData({ ...vaccinationFormData, sub_category: value })}
                      >
                        <SelectTrigger dir="rtl">
                          <SelectValue placeholder="בחר תת קטגוריה" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="אנטיביוטיקה">אנטיביוטיקה</SelectItem>
                          <SelectItem value="סטרואידים ואנטיהיסטמינים">סטרואידים ואנטיהיסטמינים</SelectItem>
                          <SelectItem value="שיכוך כאבים והרגעה">שיכוך כאבים והרגעה</SelectItem>
                          <SelectItem value="תרופות בהזרקה">תרופות בהזרקה</SelectItem>
                          <SelectItem value="חיסונים">חיסונים</SelectItem>
                          <SelectItem value="שתן">שתן</SelectItem>
                          <SelectItem value="גאסטרו">גאסטרו</SelectItem>
                          <SelectItem value="אוזניים">אוזניים</SelectItem>
                          <SelectItem value="עיניים">עיניים</SelectItem>
                          <SelectItem value="עור">עור</SelectItem>
                          <SelectItem value="תרופות שונות">תרופות שונות</SelectItem>
                          <SelectItem value="בדיקות מעבדה">בדיקות מעבדה</SelectItem>
                          <SelectItem value="בדיקות רופא">בדיקות רופא</SelectItem>
                          <SelectItem value="בדיקות מומחה">בדיקות מומחה</SelectItem>
                          <SelectItem value="טיפול מונע">טיפול מונע</SelectItem>
                          <SelectItem value="אחר">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="client_price">מחיר ללקוח (₪) *</Label>
                    <Input
                      id="client_price"
                      type="number"
                      step="0.01"
                      value={vaccinationFormData.client_price}
                      onChange={(e) => setVaccinationFormData({ ...vaccinationFormData, client_price: e.target.value })}
                      placeholder="0.00"
                      required={vaccinationFormData.add_to_price_list}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="default_interval_days">מרווח זמן לחיסון הבא</Label>
              <Select
                value={vaccinationFormData.default_interval_days?.toString() || ''}
                onValueChange={(value) => setVaccinationFormData({ ...vaccinationFormData, default_interval_days: parseInt(value) })}
              >
                <SelectTrigger dir="rtl">
                  <SelectValue placeholder="בחר מרווח זמן" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="7">שבוע (7 ימים)</SelectItem>
                  <SelectItem value="10">10 ימים</SelectItem>
                  <SelectItem value="30">חודש (30 ימים)</SelectItem>
                  <SelectItem value="90">3 חודשים (90 ימים)</SelectItem>
                  <SelectItem value="180">6 חודשים (180 ימים)</SelectItem>
                  <SelectItem value="365">שנה (365 ימים)</SelectItem>
                  <SelectItem value="730">שנתיים (730 ימים)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_reminder">תזכורת ראשונה (ימים לפני)</Label>
                <Input
                  id="first_reminder"
                  type="number"
                  value={vaccinationFormData.first_reminder_days_before}
                  onChange={(e) => setVaccinationFormData({ ...vaccinationFormData, first_reminder_days_before: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="second_reminder">תזכורת שנייה (ימים לפני)</Label>
                <Input
                  id="second_reminder"
                  type="number"
                  value={vaccinationFormData.second_reminder_days_before}
                  onChange={(e) => setVaccinationFormData({ ...vaccinationFormData, second_reminder_days_before: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={vaccinationFormData.is_active}
                onChange={(e) => setVaccinationFormData({ ...vaccinationFormData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">פעיל</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsVaccinationFormOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">
                {editingVaccinationType ? 'עדכן' : 'שמור'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLabTestFormOpen} onOpenChange={setIsLabTestFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingLabTest ? 'עריכת בדיקת מעבדה' : 'הוספת בדיקת מעבדה חדשה'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLabTestFormSubmit} className="space-y-4">
            <div>
              <Label htmlFor="lab_name">שם הבדיקה *</Label>
              <Input
                id="lab_name"
                list="lab-test-suggestions"
                value={labTestFormData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const defaultParams = getDefaultParametersForTest(val);
                  setLabTestFormData({ 
                    ...labTestFormData, 
                    name: val,
                    parameters: defaultParams.length > 0 ? defaultParams : labTestFormData.parameters
                  });
                }}
                placeholder="בחר מהרשימה או הקלד שם חדש"
                required
              />
              <datalist id="lab-test-suggestions">
                <option value="CBC - ארנב" />
                <option value="CBC - חמוס זכר" />
                <option value="CBC - חמוס נקבה" />
                <option value="CBC - כלב" />
                <option value="CBC - חתול" />
                <option value="בדיקת שתן" />
                <option value="כימיה קצרה - כלב" />
                <option value="כימיה קצרה - חתול" />
                <option value="כימיה מלאה - חתול" />
                <option value="כימיה מלאה - כלב" />
                <option value="כימיה - ארנב" />
                <option value="כימיה - חמוס זכר" />
                <option value="כימיה - חמוס נקבה" />
                <option value="PT/PTT - כלב" />
              </datalist>
            </div>

            <div>
              <Label htmlFor="lab_description">תיאור</Label>
              <Input
                id="lab_description"
                value={labTestFormData.description}
                onChange={(e) => setLabTestFormData({ ...labTestFormData, description: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">פרמטרים של הבדיקה</h3>
              
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label htmlFor="param_name">שם פרמטר</Label>
                    <Input
                      id="param_name"
                      value={currentParameter.name}
                      onChange={(e) => setCurrentParameter({ ...currentParameter, name: e.target.value })}
                      placeholder="למשל: WBC"
                    />
                  </div>
                  <div>
                    <Label htmlFor="param_unit">יחידה</Label>
                    <Input
                      id="param_unit"
                      value={currentParameter.unit}
                      onChange={(e) => setCurrentParameter({ ...currentParameter, unit: e.target.value })}
                      placeholder="למשל: 10^3/µL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="param_min">מינימום תקין</Label>
                    <Input
                      id="param_min"
                      type="number"
                      step="0.01"
                      value={currentParameter.min_normal}
                      onChange={(e) => setCurrentParameter({ ...currentParameter, min_normal: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="param_max">מקסימום תקין</Label>
                    <Input
                      id="param_max"
                      type="number"
                      step="0.01"
                      value={currentParameter.max_normal}
                      onChange={(e) => setCurrentParameter({ ...currentParameter, max_normal: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddParameter} variant="outline">
                    {editingParameterIndex !== null ? (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        עדכן פרמטר
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף פרמטר
                      </>
                    )}
                  </Button>
                  {editingParameterIndex !== null && (
                    <Button type="button" size="sm" onClick={handleCancelEditParameter} variant="ghost">
                      ביטול
                    </Button>
                  )}
                </div>
              </div>

              {labTestFormData.parameters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">פרמטרים שנוספו:</p>
                  {labTestFormData.parameters.map((param, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded border ${editingParameterIndex === idx ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}`}>
                      <div className="flex-1">
                        <span className="font-semibold">{param.name}</span>
                        {param.unit && <span className="text-gray-600 text-sm"> ({param.unit})</span>}
                        {(param.min_normal || param.max_normal) && (
                          <span className="text-gray-600 text-sm"> - טווח: {param.min_normal || '?'} - {param.max_normal || '?'}</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleEditParameter(idx)} disabled={editingParameterIndex !== null && editingParameterIndex !== idx}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveParameter(idx)} disabled={editingParameterIndex !== null}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lab_is_active"
                checked={labTestFormData.is_active}
                onChange={(e) => setLabTestFormData({ ...labTestFormData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="lab_is_active" className="cursor-pointer">פעיל</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsLabTestFormOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">
                {editingLabTest ? 'עדכן' : 'שמור'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {clientPriceList.find(p => p.product_name === selectedLabTestForPrice?.name) ? 'עריכת מחיר' : 'הוספת בדיקה למחירון'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
              <p className="text-sm font-semibold text-purple-900">בדיקה: {selectedLabTestForPrice?.name}</p>
              {selectedLabTestForPrice?.parameters?.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  מוגדרים {selectedLabTestForPrice.parameters.length} פרמטרים
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="client_price">מחיר ללקוח *</Label>
              <Input
                id="client_price"
                type="number"
                step="0.01"
                value={priceFormData.client_price}
                onChange={(e) => setPriceFormData({ ...priceFormData, client_price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="price_notes">הערות</Label>
              <Input
                id="price_notes"
                value={priceFormData.notes}
                onChange={(e) => setPriceFormData({ ...priceFormData, notes: e.target.value })}
                placeholder="הערות על הבדיקה"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPriceDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="button" onClick={handleSavePriceListItem}>
                <Save className="w-4 h-4 ml-2" />
                שמור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportVaccinationDialogOpen} onOpenChange={(open) => {
        if (!analyzingVaccinationFile) {
          setIsImportVaccinationDialogOpen(open);
          if (!open) {
            setImportFile(null);
          }
        }
      }}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>ייבוא היסטוריית חיסונים מקובץ CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv_file">בחר קובץ CSV</Label>
              <Input
                id="csv_file"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setImportFile(file);
                  if (file) {
                    handleAnalyzeVaccinationFile(file);
                  }
                }}
                disabled={analyzingVaccinationFile}
              />
              <p className="text-sm text-gray-500 mt-1">
                וודא שהקובץ מכיל עמודות: "תאריך החיסון", "שם הלקוח", "מספר לקוח", "שם החיה", "שם החיסון", "שם הרופא המחסן"
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsImportVaccinationDialogOpen(false)} disabled={analyzingVaccinationFile}>
                {analyzingVaccinationFile ? 'מנתח...' : 'ביטול'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVaccinationPreflightDialog} onOpenChange={(open) => {
        if (!isImporting) {
          setShowVaccinationPreflightDialog(open);
          if (!open) {
            setVaccinationPreflightResult(null);
          }
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl" hideCloseButton={isImporting}>
          <DialogHeader>
            <DialogTitle>סקירת ייבוא חיסונים</DialogTitle>
          </DialogHeader>
          
          {vaccinationPreflightResult && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    <div className="text-2xl font-bold text-green-700">{vaccinationPreflightResult.results?.to_create?.length || 0}</div>
                    <div className="text-sm text-green-600">חיסונים חדשים</div>
                  </CardContent>
                </Card>
                
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4 text-center">
                    <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                    <div className="text-2xl font-bold text-red-700">{vaccinationPreflightResult.results?.failed || 0}</div>
                    <div className="text-sm text-red-600">שגיאות</div>
                  </CardContent>
                </Card>
                
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <div className="text-2xl font-bold text-blue-700">{vaccinationPreflightResult.results?.total || 0}</div>
                    <div className="text-sm text-blue-600">סה"כ שורות</div>
                  </CardContent>
                </Card>
              </div>

              {/* Errors List */}
              {vaccinationPreflightResult.results?.errors?.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      שגיאות ({vaccinationPreflightResult.results.errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {vaccinationPreflightResult.results.errors.map((error, index) => (
                        <div key={index} className="p-3 border border-red-200 bg-red-50 rounded text-sm">
                          <p className="font-semibold text-red-800">שורה {error.row}: {error.error}</p>
                          {error.data && (
                            <div className="text-xs text-red-600 mt-1 mr-4 space-y-0.5">
                              <p>• לקוח: {error.data.client_name} (מספר: {error.data.client_number})</p>
                              <p>• חיה: {error.data.patient_name}</p>
                              <p>• חיסון: {error.data.vaccination_type}</p>
                              <p>• תאריך: {error.data.vaccination_date}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success Preview */}
              {vaccinationPreflightResult.results?.to_create?.length > 0 && (
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      חיסונים שיתווספו ({vaccinationPreflightResult.results.to_create.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {vaccinationPreflightResult.results.to_create.slice(0, 10).map((item, index) => (
                        <div key={index} className="p-3 border border-green-200 bg-green-50 rounded text-sm">
                          <div className="font-semibold text-green-800">שורה {item.row_index}</div>
                          <div className="text-xs text-green-700 mt-1 mr-4 space-y-0.5">
                            <p>• לקוח: {item.data.client_name} (#{item.data.client_number})</p>
                            <p>• מטופל: {item.data.patient_name} (#{item.data.patient_number})</p>
                            <p>• חיסון: {item.data.vaccination_type}</p>
                            <p>• תאריך: {item.data.vaccination_date}</p>
                            <p>• רופא: {item.data.administered_by}</p>
                          </div>
                        </div>
                      ))}
                      {vaccinationPreflightResult.results.to_create.length > 10 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          ועוד {vaccinationPreflightResult.results.to_create.length - 10} חיסונים נוספים...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowVaccinationPreflightDialog(false);
                setVaccinationPreflightResult(null);
                setImportFile(null);
              }}
              disabled={isImporting}
            >
              ביטול
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirmVaccinationImport}
              disabled={isImporting || !vaccinationPreflightResult?.results?.to_create?.length}
            >
              {isImporting ? 'מייבא...' : `ייבא ${vaccinationPreflightResult?.results?.to_create?.length || 0} חיסונים`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImporting && importResults} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" dir="rtl" hideCloseButton={true}>
          <DialogHeader>
            <DialogTitle>ייבוא חיסונים</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="text-4xl font-bold text-purple-600">
                  {importResults?.successful || 0}/{importResults?.total || 0}
                </div>
                <p className="text-gray-600 mt-2">חיסונים יובאו</p>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-purple-600 h-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${importResults?.total > 0 ? ((importResults?.successful || 0) / importResults.total) * 100 : 0}%` 
                  }}
                />
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                {isImporting ? 'מייבא נתונים...' : 'הושלם!'}
              </p>
            </div>

            {importResults?.errors?.length > 0 && (
              <div className="border border-red-200 bg-red-50 p-3 rounded-lg text-right max-h-40 overflow-y-auto">
                <p className="font-semibold text-red-800 mb-2">שגיאות:</p>
                {importResults.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 pb-1">
                    שורה {error.row}: {error.error}
                  </div>
                ))}
              </div>
            )}

            {!isImporting && (
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => {
                    setImportResults(null);
                    setImportFile(null);
                  }}
                >
                  סגור
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}