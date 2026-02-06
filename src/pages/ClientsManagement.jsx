import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, Mail, MapPin, User, Edit, Eye, PawPrint, Send, Dog, Cat, Rabbit, Bird, Download, Upload, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, AlertCircle, Shield, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientForm from "../components/clinic-calendar/ClientForm";
import PatientForm from "../components/clinic-calendar/PatientForm";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { performClientsPreflight, performPatientsPreflight, generateImportReport, normalizeIdNumber, normalizePhone, normalizeEmail, retryWithBackoff, processBatches } from "../components/import/importHelpers";
import PreflightReportDialog from "../components/import/PreflightReportDialog";

export default function ClientsManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [selectedClientForPatient, setSelectedClientForPatient] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState(''); // 'clients' or 'patients'
  const [showUpdateConfirmDialog, setShowUpdateConfirmDialog] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const cancelImportRef = useRef(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [sortBy, setSortBy] = useState('name-asc'); // name-asc, name-desc, client-number-asc, client-number-desc, city-asc
  const [sortField, setSortField] = useState('full_name'); // 'full_name' or 'client_number'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [selectedLetter, setSelectedLetter] = useState(''); // New state for letter filter
  
  // New preflight state
  const [showPreflightDialog, setShowPreflightDialog] = useState(false);
  const [preflightResult, setPreflightResult] = useState(null);
  const [preflightReport, setPreflightReport] = useState(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 5000)
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 5000)
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: async ({ clientData, patients }) => {
      // Get all clients to find the highest client_number
      const allClients = await base44.entities.Client.list('-created_date', 5000);
      const clientNumbers = allClients
        .map(c => c.client_number)
        .filter(num => num != null && num > 0);
      
      const maxClientNumber = clientNumbers.length > 0 
        ? Math.max(...clientNumbers)
        : 0;
      
      const newClient = await base44.entities.Client.create({
        ...clientData,
        client_number: maxClientNumber + 1
      });
      
      if (patients && patients.length > 0) {
        const validPatients = patients.filter(p => p.name && p.species);
        for (const patient of validPatients) {
          const { tempId, ...patientData } = patient;
          await base44.entities.Patient.create({
            ...patientData,
            client_number: newClient.client_number,
            client_name: newClient.full_name
          });
        }
      }
      
      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['patients']);
      setIsFormOpen(false);
      setEditingClient(null);
      toast.success('הלקוח והמטופלים נוספו בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setIsFormOpen(false);
      setEditingClient(null);
    }
  });

  const createPatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['patients']);
      setIsPatientFormOpen(false);
      setSelectedClientForPatient(null);
      toast.success('המטופל נוסף בהצלחה');
    }
  });

  const deleteClientsMutation = useMutation({
    mutationFn: async (clientIds) => {
      setShowDeleteDialog(true);
      setDeleteProgress({ current: 0, total: clientIds.length });
      
      for (let i = 0; i < clientIds.length; i++) {
        const clientId = clientIds[i];
        const client = clients.find(c => c.id === clientId);
        if (!client) continue;

        // Delete patients by client_number
        const clientPatients = allPatients.filter(p => p.client_number === client.client_number);
        for (const patient of clientPatients) {
          await base44.entities.Patient.delete(patient.id);
        }

        // Delete the client
        await base44.entities.Client.delete(clientId);
        
        // Update progress
        setDeleteProgress({ current: i + 1, total: clientIds.length });
      }
    },
    onSuccess: async (_, clientIds) => {
      await queryClient.refetchQueries(['clients']);
      await queryClient.refetchQueries(['allPatients']);
      toast.success(`${clientIds.length} לקוחות נמחקו בהצלחה`);
      setSelectedClients([]);
      setTimeout(() => {
        setShowDeleteDialog(false);
        setDeleteProgress({ current: 0, total: 0 });
      }, 2000);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('שגיאה במחיקת לקוחות');
      setShowDeleteDialog(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
  });

  const handleSubmit = (clientData, patients) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: clientData });
    } else {
      createMutation.mutate({ clientData, patients });
    }
  };

  const handleAddPatient = (client) => {
    setSelectedClientForPatient(client);
    setIsPatientFormOpen(true);
  };

  const handlePatientSubmit = (data) => {
    createPatientMutation.mutate(data);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedClients(paginatedClients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectClient = (clientId, checked) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId]);
    } else {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedClients.length === 0) {
      toast.error('לא נבחרו לקוחות למחיקה');
      return;
    }

    const confirmMsg = `האם למחוק ${selectedClients.length} לקוחות? פעולה זו תמחק גם את כל המטופלים הקשורים.`;
    if (!window.confirm(confirmMsg)) return;

    deleteClientsMutation.mutate(selectedClients);
  };

  const filteredClients = clients
    .filter(client => {
      const matchesSearch = searchQuery === "" ||
        client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLetter = selectedLetter === "" ||
        (client.full_name && client.full_name.startsWith(selectedLetter));
      
      return matchesSearch && matchesLetter;
    })
    .sort((a, b) => {
      let comparison = 0;
      // First, sort by viewed history (last 24 hours)
      let viewedHistory = [];
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      
      try {
        const stored = localStorage.getItem('viewedClientsHistory');
        const historyWithTimestamps = stored ? JSON.parse(stored) : [];
        
        // Filter only entries from last 24 hours and extract IDs
        viewedHistory = historyWithTimestamps
          .filter(entry => (now - entry.timestamp) < TWENTY_FOUR_HOURS)
          .map(entry => entry.id);
      } catch (e) {
        viewedHistory = [];
      }
      
      const aIndex = viewedHistory.indexOf(a.id);
      const bIndex = viewedHistory.indexOf(b.id);
      
      if (aIndex !== -1 && bIndex !== -1) {
        comparison = aIndex - bIndex;
      } else if (aIndex !== -1) {
        comparison = -1;
      } else if (bIndex !== -1) {
        comparison = 1;
      }

      // If not sorted by history, or if history doesn't differentiate, apply column sorting
      if (comparison === 0) {
        const aValue = sortField === 'full_name' ? a.full_name : a.client_number;
        const bValue = sortField === 'full_name' ? b.full_name : b.client_number;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue, 'he');
        } else {
          comparison = (aValue || 0) - (bValue || 0);
        }

        if (sortDirection === 'desc') {
          comparison *= -1;
        }
      }
      return comparison;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to first page when search or letter filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLetter]);

  const getClientPatients = (client) => {
    return allPatients.filter(p => p.client_number === client.client_number);
  };

  const getAnimalIcon = (species) => {
    const iconMap = {
      'כלב': Dog,
      'חתול': Cat,
      'ארנב': Rabbit,
      'תוכי': Bird,
      'חמוס': PawPrint,
      'שרקן': PawPrint
    };
    return iconMap[species] || PawPrint;
  };

  const handleDownloadClientsTemplate = () => {
    try {
      const headers = ['מספר לקוח', 'שם לקוח', 'מזהה לקוח', 'טלפון', 'טלפון נוסף', 'אימייל', 'רחוב', 'עיר', 'סטטוס'];

      const csvContent = headers.join(',');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'טמפלט_לקוחות.csv';
      link.click();
      URL.revokeObjectURL(url);

      toast.success('הטמפלט הורד בהצלחה');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('שגיאה בהורדת הטמפלט');
    }
  };

  const handleDownloadPatientsTemplate = () => {
    try {
      const headers = ['מספר לקוח', 'שם הלקוח', 'ת.ז לקוח', 'שם החיה', 'סוג החיה', 'גזע החיה', 'תאריך לידה (YYYY-MM-DD)', 'מין (זכר/נקבה)', 'מעוקר (כן/לא)', 'משקל (ק״ג)', 'מספר שבב', 'צבע/סימנים', 'אלרגיות', 'מחלות כרוניות', 'תרופות קבועות', 'מבוטח (כן/לא)', 'חברת ביטוח', 'מספר פוליסה', 'סטטוס (פעיל/לא פעיל)', 'הערות'];

      const csvContent = headers.join(',');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'טמפלט_מטופלים.csv';
      link.click();
      URL.revokeObjectURL(url);

      toast.success('הטמפלט הורד בהצלחה');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('שגיאה בהורדת הטמפלט');
    }
  };

  const handleExportClients = () => {
    try {
      // Prepare CSV content matching table columns
      const headers = ['מספר לקוח', 'שם לקוח', 'מזהה לקוח', 'חיות מחמד', 'טלפון', 'טלפון נוסף', 'אימייל', 'עיר', 'רחוב', 'סטטוס'];
      
      const rows = clients.map(client => {
        const clientPatients = getClientPatients(client);
        const patientsInfo = clientPatients.map(p => `${p.name} (#${p.patient_number || 'N/A'})`).join(', ');
        
        return [
          client.client_number || '',
          client.full_name || '',
          client.id_number || '',
          patientsInfo || '',
          client.phone || '',
          client.phone_secondary || '',
          client.email || '',
          client.city || '',
          client.address || '',
          client.status === 'active' ? 'פעיל' : 'לא פעיל'
        ];
      });
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Add BOM for Hebrew support in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `לקוחות_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('הקובץ יוצא בהצלחה');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('שגיאה בייצוא הקובץ');
    }
  };

  const handleImportClients = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setAnalyzingFile(true);
      setImportType('clients'); // Set type early so PreflightReportDialog knows which handler to use
      toast.info('מנתח קובץ...');
      
      const text = await file.text();
      
      // Get all existing clients
      const existingClients = await base44.entities.Client.list('-created_date', 5000);
      
      // Perform preflight analysis
      const preflightResult = await performClientsPreflight(text, existingClients);
      const report = generateImportReport(preflightResult);
      
      setPreflightResult(preflightResult);
      setPreflightReport(report);
      setShowPreflightDialog(true);
      
      toast.success('ניתוח הושלם');
    } catch (error) {
      console.error('Preflight error:', error);
      toast.error(`שגיאה בניתוח הקובץ: ${error.message}`);
      setImportType(''); // Reset on error
    } finally {
      setAnalyzingFile(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleConfirmPreflight = async (selectedOverrides) => {
    if (!preflightResult) return;
    
    try {
      setShowPreflightDialog(false);
      setImporting(true);
      setImportType('clients');
      setShowImportDialog(true);
      cancelImportRef.current = false;
      
      // Separate selected overrides into updates and creations
      const overridesToUpdate = [];
      const overridesToCreate = [];

      // Process selected conflicts
      if (selectedOverrides.conflicts.size > 0) {
        preflightResult.conflicts_with_db.forEach(row => {
          if (selectedOverrides.conflicts.has(row.row_index) && row.existing_client) {
            overridesToUpdate.push(row);
          }
        });
      }

      // Process selected invalid rows
      if (selectedOverrides.invalid.size > 0) {
        preflightResult.invalid_rows.forEach(row => {
          if (selectedOverrides.invalid.has(row.row_index) && row.normalized) {
            overridesToCreate.push(row);
          }
        });
      }
      
      // Process selected skipped rows
      if (selectedOverrides.to_skip.size > 0) {
        preflightResult.to_skip.forEach(row => {
          if (selectedOverrides.to_skip.has(row.row_index)) {
            if (row.existing_client) {
              overridesToUpdate.push(row);
            } else if (row.normalized) {
              overridesToCreate.push(row);
            }
          }
        });
      }
      
      // Prepare all operations
      const allUpdates = [...preflightResult.to_update, ...overridesToUpdate];
      const allCreates = [...preflightResult.to_create, ...overridesToCreate];
      
      const totalOperations = allUpdates.length + allCreates.length;
      setImportProgress({ current: 0, total: totalOperations });
      
      const results = {
        created: 0,
        updated: 0,
        failed: []
      };
      
      let currentOperationCount = 0;
      const updateProgress = () => {
        currentOperationCount++;
        setImportProgress({ current: currentOperationCount, total: totalOperations });
      };
      
      // Configuration
      const BATCH_SIZE = 30;
      const CONCURRENCY = 4;
      const MAX_RETRY_ROUNDS = 3;
      
      // Phase 1: Process Updates with retry
      let failedUpdates = allUpdates;
      let retryRound = 0;
      
      while (failedUpdates.length > 0 && retryRound < MAX_RETRY_ROUNDS && !cancelImportRef.current) {
        const updateResults = await processBatches(
          failedUpdates,
          BATCH_SIZE,
          CONCURRENCY,
          async (row) => {
            const result = await retryWithBackoff(async () => {
              // Only update if there are actual changes
              if (row.changes && row.changes.length > 0) {
                await base44.entities.Client.update(row.existing_client.id, {
                  full_name: row.normalized.full_name,
                  address: row.normalized.address,
                  city: row.normalized.city,
                  phone: row.normalized.phone,
                  phone_secondary: row.normalized.phone_secondary,
                  email: row.normalized.email,
                  status: row.normalized.status
                });
              }
              updateProgress();
              return { row_index: row.row_index };
            }, 5, 500);
            return result;
          }
        );
        
        results.updated += updateResults.successful.length;
        
        // Prepare failed items for next round
        failedUpdates = updateResults.failed.map(f => f.item);
        
        if (failedUpdates.length > 0) {
          retryRound++;
          console.log(`Retry round ${retryRound} for ${failedUpdates.length} failed updates`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
        }
      }
      
      // Add remaining failures to results
      failedUpdates.forEach(row => {
        results.failed.push({
          row_index: row.row_index,
          action: 'update',
          error: 'כשל לאחר מספר ניסיונות'
        });
      });
      
      // Phase 2: Process Creates with retry
      let failedCreates = allCreates;
      retryRound = 0;
      
      while (failedCreates.length > 0 && retryRound < MAX_RETRY_ROUNDS && !cancelImportRef.current) {
        const createResults = await processBatches(
          failedCreates,
          BATCH_SIZE,
          CONCURRENCY,
          async (row) => {
            const result = await retryWithBackoff(async () => {
              await base44.entities.Client.create({
                full_name: row.normalized.full_name,
                id_number: row.normalized.id_number,
                phone: row.normalized.phone,
                phone_secondary: row.normalized.phone_secondary,
                email: row.normalized.email,
                address: row.normalized.address,
                city: row.normalized.city,
                client_number: row.assigned_client_number,
                status: row.normalized.status
              });
              updateProgress();
              return { row_index: row.row_index };
            }, 5, 500);
            return result;
          }
        );
        
        results.created += createResults.successful.length;
        
        // Prepare failed items for next round
        failedCreates = createResults.failed.map(f => f.item);
        
        if (failedCreates.length > 0) {
          retryRound++;
          console.log(`Retry round ${retryRound} for ${failedCreates.length} failed creates`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
        }
      }
      
      // Add remaining failures to results
      failedCreates.forEach(row => {
        results.failed.push({
          row_index: row.row_index,
          action: 'create',
          error: 'כשל לאחר מספר ניסיונות'
        });
      });
      
      // Refresh the lists
      await queryClient.invalidateQueries(['clients']);
      await queryClient.refetchQueries(['clients']);

      // Show final report
      const resultMessage = [
        `✓ הושלם!`,
        `זוהו: ${totalOperations}`,
        `נוצרו: ${results.created}`,
        `עודכנו: ${results.updated}`,
        results.failed.length > 0 ? `נכשלו: ${results.failed.length}` : ''
      ].filter(Boolean).join(' | ');

      if (results.failed.length === 0) {
        toast.success(resultMessage);
      } else {
        toast.warning(resultMessage);
        console.error('Failed records:', results.failed);
        toast.error(`${results.failed.length} רשומות נכשלו - ראה Console לפרטים`);
      }

    } catch (error) {
      console.error('Commit error:', error);
      toast.error(`שגיאה בביצוע הייבוא: ${error.message}`);
    } finally {
      setImporting(false);
      setImportType('');
      // Refresh the lists to show updated data
      try {
        await queryClient.invalidateQueries(['clients']);
        await queryClient.refetchQueries(['clients']);
      } catch (refreshError) {
        console.error('Error refreshing clients:', refreshError);
      }
      // Always close dialog and cleanup after import (success or failure)
      setTimeout(() => {
        setShowImportDialog(false);
        setImportProgress({ current: 0, total: 0 });
        setPreflightResult(null);
        setPreflightReport(null);
      }, 1500);
    }
  };

  const handleImportPatients = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setAnalyzingFile(true);
      setImportType('patients'); // Set type early so PreflightReportDialog knows which handler to use
      toast.info('מנתח קובץ מטופלים...');
      
      const text = await file.text();
      
      // Get all existing clients and patients
      const existingClients = await base44.entities.Client.list('-created_date', 5000);
      const existingPatients = await base44.entities.Patient.list('-created_date', 5000);
      
      // Perform preflight analysis
      const preflightResult = await performPatientsPreflight(text, existingClients, existingPatients);
      const report = generateImportReport(preflightResult);
      
      setPreflightResult(preflightResult);
      setPreflightReport(report);
      setShowPreflightDialog(true);
      
      toast.success('ניתוח הושלם');
    } catch (error) {
      console.error('Preflight error:', error);
      toast.error(`שגיאה בניתוח הקובץ: ${error.message}`);
      setImportType(''); // Reset on error
    } finally {
      setAnalyzingFile(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Calculate missing client numbers
  const missingClientNumbers = React.useMemo(() => {
    if (clients.length === 0) return [];
    
    const clientNumbers = clients
      .map(c => c.client_number)
      .filter(num => num != null && num > 0)
      .sort((a, b) => a - b);
    
    if (clientNumbers.length === 0) return [];
    
    const min = clientNumbers[0];
    const max = clientNumbers[clientNumbers.length - 1];
    const missing = [];
    
    for (let i = min; i <= max; i++) {
      if (!clientNumbers.includes(i)) {
        missing.push(i);
      }
    }
    
    return missing;
  }, [clients]);

  const handleConfirmPatientsPreflight = async (selectedOverrides) => {
    if (!preflightResult) return;
    
    try {
      setShowPreflightDialog(false);
      setImporting(true);
      setImportType('patients');
      setShowImportDialog(true);
      cancelImportRef.current = false;
      
      // Separate selected overrides into updates and creations
      const overridesToUpdate = [];
      const overridesToCreate = [];

      // Process selected conflicts
      if (selectedOverrides.conflicts.size > 0) {
        preflightResult.conflicts_with_db.forEach(row => {
          if (selectedOverrides.conflicts.has(row.row_index) && row.existing_patient) {
            overridesToUpdate.push(row);
          }
        });
      }

      // Process selected invalid rows
      if (selectedOverrides.invalid.size > 0) {
        preflightResult.invalid_rows.forEach(row => {
          if (selectedOverrides.invalid.has(row.row_index) && row.normalized) {
            overridesToCreate.push(row);
          }
        });
      }
      
      // Process selected skipped rows
      if (selectedOverrides.to_skip.size > 0) {
        preflightResult.to_skip.forEach(row => {
          if (selectedOverrides.to_skip.has(row.row_index)) {
            if (row.existing_patient) {
              overridesToUpdate.push(row);
            } else if (row.normalized) {
              overridesToCreate.push(row);
            }
          }
        });
      }
      
      // Prepare all operations
      const allUpdates = [...preflightResult.to_update, ...overridesToUpdate];
      const allCreates = [...preflightResult.to_create, ...overridesToCreate];
      
      const totalOperations = allUpdates.length + allCreates.length;
      setImportProgress({ current: 0, total: totalOperations });
      
      const results = {
        created: 0,
        updated: 0,
        failed: []
      };
      
      let currentOperationCount = 0;
      const updateProgress = () => {
        currentOperationCount++;
        setImportProgress({ current: currentOperationCount, total: totalOperations });
      };
      
      // Configuration
      const BATCH_SIZE = 30;
      const CONCURRENCY = 4;
      const MAX_RETRY_ROUNDS = 3;
      
      // Phase 1: Process Updates with retry
      let failedUpdates = allUpdates;
      let retryRound = 0;
      
      while (failedUpdates.length > 0 && retryRound < MAX_RETRY_ROUNDS && !cancelImportRef.current) {
        const updateResults = await processBatches(
          failedUpdates,
          BATCH_SIZE,
          CONCURRENCY,
          async (row) => {
            const result = await retryWithBackoff(async () => {
              // Only update if there are actual changes
              if (row.changes && row.changes.length > 0) {
                await base44.entities.Patient.update(row.existing_patient.id, {
                  name: row.normalized.patient_name,
                  species: row.normalized.species,
                  breed: row.normalized.breed,
                  date_of_birth: row.normalized.date_of_birth,
                  sex: row.normalized.sex,
                  neutered: row.normalized.neutered,
                  weight: row.normalized.weight,
                  microchip: row.normalized.microchip,
                  color: row.normalized.color,
                  allergies: row.normalized.allergies,
                  chronic_conditions: row.normalized.chronic_conditions,
                  current_medications: row.normalized.current_medications,
                  is_insured: row.normalized.is_insured,
                  insurance_company: row.normalized.insurance_company,
                  insurance_policy: row.normalized.insurance_policy,
                  status: row.normalized.status,
                  notes: row.normalized.notes
                });
              }
              updateProgress();
              return { row_index: row.row_index };
            }, 5, 500);
            return result;
          }
        );
        
        results.updated += updateResults.successful.length;
        
        // Prepare failed items for next round
        failedUpdates = updateResults.failed.map(f => f.item);
        
        if (failedUpdates.length > 0) {
          retryRound++;
          console.log(`Retry round ${retryRound} for ${failedUpdates.length} failed updates`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Add remaining failures to results
      failedUpdates.forEach(row => {
        results.failed.push({
          row_index: row.row_index,
          action: 'update',
          error: 'כשל לאחר מספר ניסיונות'
        });
      });
      
      // Phase 2: Process Creates with retry
      let failedCreates = allCreates;
      retryRound = 0;
      
      while (failedCreates.length > 0 && retryRound < MAX_RETRY_ROUNDS && !cancelImportRef.current) {
        const createResults = await processBatches(
          failedCreates,
          BATCH_SIZE,
          CONCURRENCY,
          async (row) => {
            const result = await retryWithBackoff(async () => {
              await base44.entities.Patient.create({
                name: row.normalized.patient_name,
                species: row.normalized.species,
                breed: row.normalized.breed,
                date_of_birth: row.normalized.date_of_birth,
                sex: row.normalized.sex,
                neutered: row.normalized.neutered,
                weight: row.normalized.weight,
                microchip: row.normalized.microchip,
                color: row.normalized.color,
                allergies: row.normalized.allergies,
                chronic_conditions: row.normalized.chronic_conditions,
                current_medications: row.normalized.current_medications,
                is_insured: row.normalized.is_insured,
                insurance_company: row.normalized.insurance_company,
                insurance_policy: row.normalized.insurance_policy,
                patient_number: row.assigned_patient_number,
                client_number: row.client.client_number,
                client_name: row.client.full_name,
                client_id: row.client.id,
                status: row.normalized.status,
                notes: row.normalized.notes
              });
              updateProgress();
              return { row_index: row.row_index };
            }, 5, 500);
            return result;
          }
        );
        
        results.created += createResults.successful.length;
        
        // Prepare failed items for next round
        failedCreates = createResults.failed.map(f => f.item);
        
        if (failedCreates.length > 0) {
          retryRound++;
          console.log(`Retry round ${retryRound} for ${failedCreates.length} failed creates`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Add remaining failures to results
      failedCreates.forEach(row => {
        results.failed.push({
          row_index: row.row_index,
          action: 'create',
          error: 'כשל לאחר מספר ניסיונות'
        });
      });
      
      // Refresh the lists
      await queryClient.invalidateQueries(['allPatients']);
      await queryClient.refetchQueries(['allPatients']);

      // Show final report
      const resultMessage = [
        `✓ הושלם!`,
        `זוהו: ${totalOperations}`,
        `נוצרו: ${results.created}`,
        `עודכנו: ${results.updated}`,
        results.failed.length > 0 ? `נכשלו: ${results.failed.length}` : ''
      ].filter(Boolean).join(' | ');

      if (results.failed.length === 0) {
        toast.success(resultMessage);
      } else {
        toast.warning(resultMessage);
        console.error('Failed records:', results.failed);
        toast.error(`${results.failed.length} רשומות נכשלו - ראה Console לפרטים`);
      }

    } catch (error) {
      console.error('Commit error:', error);
      toast.error(`שגיאה בייבוא המטופלים: ${error.message}`);
    } finally {
      setImporting(false);
      setImportType('');
      try {
        await queryClient.invalidateQueries(['allPatients']);
        await queryClient.refetchQueries(['allPatients']);
      } catch (refreshError) {
        console.error('Error refreshing patients:', refreshError);
      }
      setTimeout(() => {
        setShowImportDialog(false);
        setImportProgress({ current: 0, total: 0 });
        setPreflightResult(null);
        setPreflightReport(null);
      }, 1500);
    }
  };



  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול לקוחות</h1>
          <p className="text-gray-500">רשימת לקוחות ובעלי חיות המחמד</p>
        </div>
        <div className="flex gap-2">
          {currentUser?.role === 'admin' && selectedClients.length > 0 && (
            <Button 
              variant="destructive"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק {selectedClients.length} נבחרים
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleExportClients}
            disabled={clients.length === 0}
          >
            <Download className="w-4 h-4 ml-2" />
            ייצוא לאקסל
          </Button>
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('import-clients-file').click()}
            disabled={importing || analyzingFile}
          >
            <Upload className="w-4 h-4 ml-2" />
            {analyzingFile ? 'מנתח קובץ...' : importing && importType === 'clients' ? 'מייבא לקוחות...' : 'ייבוא לקוחות'}
          </Button>
          <input
            id="import-clients-file"
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={handleImportClients}
          />
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('import-patients-file').click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4 ml-2" />
            {importing && importType === 'patients' ? 'מייבא מטופלים...' : 'ייבוא מטופלים'}
          </Button>
          <input
            id="import-patients-file"
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={handleImportPatients}
          />
          <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            לקוח חדש
          </Button>
        </div>
      </div>

      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">איך לייבא לקוחות ומטופלים?</h3>
              <ol className="text-sm text-gray-700 space-y-1 mr-4">
                <li>1. הורידו את התבניות: <Button variant="link" className="h-auto p-0 text-blue-600 underline" onClick={handleDownloadClientsTemplate}>טמפלט לקוחות</Button> | <Button variant="link" className="h-auto p-0 text-blue-600 underline" onClick={handleDownloadPatientsTemplate}>טמפלט מטופלים</Button></li>
                <li>2. מלאו את הפרטים בקבצי התבנית ושמרו אותם</li>
                <li>3. ייבאו תחילה את קובץ הלקוחות, ולאחר מכן את קובץ המטופלים</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentUser?.role === 'admin' && missingClientNumbers.length > 0 && (
        <Card className="mb-6 bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">מספרי לקוח חסרים ({missingClientNumbers.length})</h3>
                <p className="text-sm text-gray-700 mb-2">
                  מספרי לקוחות חסרים בטווח {clients.filter(c => c.client_number).sort((a, b) => a.client_number - b.client_number)[0]?.client_number} - {clients.filter(c => c.client_number).sort((a, b) => b.client_number - a.client_number)[0]?.client_number}:
                </p>
                <div className="text-sm text-gray-600 bg-white p-3 rounded border border-orange-200 max-h-32 overflow-y-auto">
                  {missingClientNumbers.join(', ')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם, טלפון או אימייל..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-4 justify-center">
            {'אבגדהוזחטיכלמנסעפצקרשת'.split('').map(letter => (
              <Button
                key={letter}
                variant={selectedLetter === letter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLetter(selectedLetter === letter ? '' : letter)}
                className="w-8 h-8 p-0"
              >
                {letter}
              </Button>
            ))}
            <Button
              variant={selectedLetter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLetter('')}
              className="px-3 h-8"
            >
              הכל
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle>{editingClient ? 'עריכת לקוח' : 'לקוח חדש'}</DialogTitle>
              {editingClient?.client_number && (
                <Badge className="bg-purple-600 text-white text-lg px-4 py-1">
                  #{editingClient.client_number}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <ClientForm
            client={editingClient}
            onSubmit={handleSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingClient(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת מטופל חדש ללקוח: {selectedClientForPatient?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedClientForPatient && (
            <PatientForm
              clientId={selectedClientForPatient.id}
              clientName={selectedClientForPatient.full_name}
              clientNumber={selectedClientForPatient.client_number}
              onSubmit={handlePatientSubmit}
              onCancel={() => { setIsPatientFormOpen(false); setSelectedClientForPatient(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={(open) => {
        if (!importing) {
          setShowImportDialog(open);
        }
      }}>
        <DialogContent className="max-w-md" dir="rtl" hideCloseButton={importing}>
          <DialogHeader>
            <DialogTitle>
              {importType === 'clients' ? 'ייבוא לקוחות' : 
               importType === 'patients' ? 'ייבוא מטופלים' : 
               'פעולת ייבוא'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="text-4xl font-bold text-purple-600">
                  {importProgress.current}/{importProgress.total}
                </div>
                <p className="text-gray-600 mt-2">
                  {importType === 'clients' ? 'לקוחות מיובאים' : 
                   importType === 'patients' ? 'מטופלים מיובאים' : 
                   'פריטים מיובאים'}
                </p>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-purple-600 h-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` 
                  }}
                />
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                {importing ? 'מייבא נתונים...' : 'הושלם!'}
              </p>
              
              {importing ? (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    cancelImportRef.current = true;
                  }}
                >
                  ביטול
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  className="mt-4"
                  onClick={() => setShowImportDialog(false)}
                >
                  סגור
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת לקוחות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="text-4xl font-bold text-red-600">
                  {deleteProgress.current}/{deleteProgress.total}
                </div>
                <p className="text-gray-600 mt-2">לקוחות נמחקים</p>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-red-600 h-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0}%` 
                  }}
                />
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                {deleteProgress.current < deleteProgress.total ? 'מוחק נתונים...' : 'הושלם!'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PreflightReportDialog
        open={showPreflightDialog}
        onClose={() => {
          setShowPreflightDialog(false);
          setPreflightResult(null);
          setPreflightReport(null);
          setImportType(''); // Reset import type when closing
        }}
        report={preflightReport}
        onConfirm={importType === 'patients' ? handleConfirmPatientsPreflight : handleConfirmPreflight}
        loading={importing}
      />

      {isLoading ? (
        <p>טוען לקוחות...</p>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">לא נמצאו לקוחות</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {currentUser?.role === 'admin' && (
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('client_number')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      תיק לקוח
                      {sortField === 'client_number' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('full_name')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      שם לקוח
                      {sortField === 'full_name' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">חיות מחמד</TableHead>
                  <TableHead className="text-center">טלפון</TableHead>
                  <TableHead className="text-center">רחוב</TableHead>
                  <TableHead className="text-center">עיר</TableHead>
                  <TableHead className="text-center">סטטוס</TableHead>
                  <TableHead className="text-center">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client, index) => {
                  const globalIndex = startIndex + index;
                  const clientPatients = getClientPatients(client);
                  return (
                    <TableRow key={client.id} className="hover:bg-gray-50">
                      {currentUser?.role === 'admin' && (
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={(checked) => handleSelectClient(client.id, checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-gray-500 font-medium text-center">{client.client_number || '-'}</TableCell>
                      <TableCell className="font-medium text-center p-0">
                        <Link 
                          to={createPageUrl(`ClientFile?id=${client.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer block w-full h-full py-4 px-4"
                        >
                          <span className="inline-flex items-center gap-1">
                            {client.full_name}
                            {clientPatients.some(p => p.is_insured) && (
                              <Shield className="w-4 h-4 text-blue-600" title="יש מטופל מבוטח" />
                            )}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {clientPatients.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center max-w-xs mx-auto">
                            {clientPatients.map(patient => {
                              const AnimalIcon = getAnimalIcon(patient.species);
                              return (
                                <Badge key={patient.id} variant="outline" className="text-xs">
                                  <AnimalIcon className="w-3 h-3 ml-1" />
                                  {patient.name}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">אין חיות</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {client.phone ? (
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span dir="ltr">{client.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {client.address ? (
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span>{client.address}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {client.city ? (
                          <span className="text-sm">{client.city}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status === 'active' ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => alert('פונקציונליות שליחת הודעות תתווסף בקרוב')}
                            title="שלח הודעה"
                          >
                            <Send className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAddPatient(client)}
                            title="הוסף מטופל"
                          >
                            <PawPrint className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingClient(client); setIsFormOpen(true); }}
                            title="ערוך לקוח"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={createPageUrl(`ClientFile?id=${client.id}`)} title="תיק לקוח">
                              <Eye className="w-4 h-4 text-gray-600" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          
          {filteredClients.length > itemsPerPage && (
            <div className="border-t p-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                מציג {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} מתוך {filteredClients.length} לקוחות
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="w-4 h-4" />
                  הקודם
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  הבא
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}