import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X, Plus, Trash2, Camera, Loader2, Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import TreatmentInstructionsSection from './TreatmentInstructionsSection';

const defaultState = {
    owner_name: "", animal_name: "", animal_type: "", admission_weight: "", animal_sex: "", age: "", breed: "",
    animal_image_url: "",
    is_neutered: false, has_catheter: false, catheter_insertion_date: "",
    admission_date: new Date().toISOString().split('T')[0],
    admission_time: new Date().toTimeString().slice(0, 5),
    diagnoses: "", 
    treatment_instructions: [],
    status: "active", discharge_instructions: "",
    date_of_death: "",
    monitoring_log: [], fluids_log: [], observations_log: []
};

const FLUID_TYPES = [
    "הרטמן (HARTMAN) / LRS",
    "מניטול",
    "גלוקוז"
];

const LogEntry = ({ children, onRemove, showRemove, createdByName }) => {
    return (
        <div className="p-2 border rounded-lg bg-gray-50/50">
            <div className="flex items-start gap-2">
                <div className="grid grid-cols-12 gap-2 flex-grow">{children}</div>
                {showRemove && (
                    <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="flex-shrink-0">
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                )}
            </div>
            {createdByName && (
                <p className="text-xs text-gray-500 mt-1.5 pr-1">נוסף על ידי: {createdByName}</p>
            )}
        </div>
    );
};

export default function HospitalizationForm({ animal, onSubmit, onCancel, accessLevel, currentUser, allUsers = [], onDataRefresh }) {
  const [formData, setFormData] = useState(() => {
    if (animal) {
      return JSON.parse(JSON.stringify(animal));
    }
    // For new animals, set current date/time and mark as locked
    return {
      ...defaultState,
      admission_date: new Date().toISOString().split('T')[0],
      admission_time: new Date().toTimeString().slice(0, 5),
      _dateTimeLocked: true,
    };
  });
  
  const [confirmCorrectness, setConfirmCorrectness] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
    enabled: showClientSearch
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['allClientsForOwnerAutocomplete'],
    queryFn: () => base44.entities.Client.list('-created_date', 5000),
    staleTime: 60000,
  });

  const { data: clientPatients = [] } = useQuery({
    queryKey: ['clientPatients', selectedClient?.client_number],
    queryFn: async () => {
      if (!selectedClient?.client_number) return [];
      return base44.entities.Patient.filter({ client_number: selectedClient.client_number });
    },
    enabled: !!selectedClient?.client_number,
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
    enabled: showClientSearch
  });

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return [];
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(c => 
      c.full_name?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    ).slice(0, 10);
  }, [clients, clientSearchQuery]);

  const ownerSuggestions = useMemo(() => {
    if (!ownerSearchQuery || ownerSearchQuery.length < 2) return [];
    
    const query = ownerSearchQuery.toLowerCase();
    return allClients.filter(client => 
      client.full_name?.toLowerCase().includes(query) ||
      client.phone?.includes(ownerSearchQuery) ||
      client.email?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [allClients, ownerSearchQuery]);

  const handleSelectPatient = (client, patient) => {
    console.log('🐾 Selected patient from dialog:', patient.name, 'photo_url:', patient.photo_url);
    handleChange('owner_name', client.full_name);
    handleChange('animal_name', patient.name);
    handleChange('animal_type', patient.species || '');
    handleChange('animal_sex', patient.sex || '');
    handleChange('breed', patient.breed || '');
    handleChange('is_neutered', patient.neutered || false);
    if (patient.photo_url) {
      console.log('✅ Setting photo URL:', patient.photo_url);
      handleChange('animal_image_url', patient.photo_url);
    } else {
      console.log('⚠️ No photo_url found for patient');
    }
    if (patient.weight) handleChange('admission_weight', patient.weight);
    if (patient.date_of_birth) {
      const age = Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
      handleChange('age', `${age} שנים`);
    }
    setShowClientSearch(false);
    setClientSearchQuery('');
  };

  const handleSelectClient = (client) => {
    const clientPatients = allPatients.filter(p => p.client_number === client.client_number);

    if (clientPatients.length === 0) {
      handleChange('owner_name', client.full_name);
      setShowClientSearch(false);
      setClientSearchQuery('');
    } else if (clientPatients.length === 1) {
      handleSelectPatient(client, clientPatients[0]);
    }
    // If multiple patients, let user click on a specific badge
  };

  // Sync formData with animal prop when it changes
  useEffect(() => {
    if (animal) {
      setFormData(JSON.parse(JSON.stringify(animal)));
    }
  }, [animal]);

  const userMap = useMemo(() =>
    new Map(allUsers.map(user => [user.email, user.display_name || user.full_name]))
  , [allUsers]);

  const canEditAll = accessLevel === 'full';
  const canAddLogs = accessLevel === 'full' || accessLevel === 'add_only';
  const isReadOnly = accessLevel === 'read_only';
  
  const isDateTimeDisabled = !!animal;

  const handleChange = (field, value) => {
    console.log(`📝 Updating field: ${field}`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOwnerSelect = (client) => {
    setSelectedClient(client);
    handleChange('owner_name', client.full_name);
    handleChange('client_number', client.client_number);
    setOwnerSearchQuery(client.full_name);
    setShowOwnerSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#owner_name_input') && !e.target.closest('.owner-suggestions')) {
        setShowOwnerSuggestions(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('animal_image_url', file_url);
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setIsUploadingImage(false);
  };

  const handleLogChange = (logName, index, field, value) => {
    const newLog = [...formData[logName]];
    newLog[index][field] = value;
    handleChange(logName, newLog);
  };

  const addLog = (logName, newEntry) => {
    if (!canAddLogs) {
        console.warn("Permission denied: Cannot add log entry.");
        return;
    }
    const userDisplayName = currentUser?.display_name || currentUser?.full_name || 'משתמש לא ידוע';
    const now = new Date();
    const entryWithAuthor = {
      ...newEntry,
      created_by: currentUser?.email,
      created_by_name: userDisplayName,
      _isNew: true,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    };
    handleChange(logName, [...(formData[logName] || []), entryWithAuthor]);
  };

  const removeLog = (logName, index) => {
    const logEntry = formData[logName][index];
    
    const isAdmin = currentUser?.role === 'admin';
    const isOwnEntry = logEntry._isNew || logEntry.created_by === currentUser?.email;
    
    if (!isAdmin && !isOwnEntry) {
        alert("אין לך הרשאה למחוק רשומה זו. ניתן למחוק רק רשומות שהוספת בעצמך.");
        return;
    }
    
    handleChange(logName, formData[logName].filter((_, i) => i !== index));
  };
  
  const canEditLogEntry = (logEntry) => {
    const isAdmin = currentUser?.role === 'admin';
    const isOwnEntry = logEntry._isNew || logEntry.created_by === currentUser?.email;
    return isAdmin || isOwnEntry;
  };

  // Auto-save function for treatment instructions
  const handleAutoSaveTreatmentInstructions = async (updatedInstructions) => {
    if (!animal?.id) {
      return;
    }

    try {
      await base44.entities.HospitalizedAnimal.update(animal.id, {
        treatment_instructions: updatedInstructions
      });
    } catch (error) {
      console.error('Error auto-saving treatment instructions:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canAddLogs && !canEditAll) {
        console.warn("Permission denied: Cannot submit form.");
        return;
    }
    
    const formDataToSubmit = JSON.parse(JSON.stringify(formData));
    delete formDataToSubmit._dateTimeLocked;
    
    // Convert numeric string fields to actual numbers or null
    if (formDataToSubmit.admission_weight === '' || formDataToSubmit.admission_weight === null) {
      formDataToSubmit.admission_weight = null;
    } else if (typeof formDataToSubmit.admission_weight === 'string') {
      formDataToSubmit.admission_weight = parseFloat(formDataToSubmit.admission_weight);
    }
    
    for (const logKey of ['monitoring_log', 'fluids_log', 'observations_log']) { // treatments_log removed from this list
      if (formDataToSubmit[logKey]) {
        formDataToSubmit[logKey] = formDataToSubmit[logKey].map(entry => {
          const { _isNew, ...rest } = entry;
          return rest;
        });
      }
    }
    
    onSubmit(formDataToSubmit);
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Admission Details */}
      <fieldset disabled={!canEditAll} className="space-y-4 p-4 border rounded-md">
        <legend className="text-lg font-semibold px-2">פרטי אשפוז</legend>
        <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label>תאריך אשפוז *</Label>
                <Input
                    type="date"
                    value={formData.admission_date}
                    onChange={e => handleChange('admission_date', e.target.value)}
                    required
                    disabled={isDateTimeDisabled}
                    className={isDateTimeDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
                {isDateTimeDisabled && (
                    <p className="text-xs text-gray-500">נקבע אוטומטית בפתיחת התיק</p>
                )}
            </div>
            <div className="space-y-2">
                <Label>שעת קבלה *</Label>
                <Input
                    type="time"
                    value={formData.admission_time || ''}
                    onChange={e => handleChange('admission_time', e.target.value)}
                    required
                    disabled={isDateTimeDisabled}
                    className={isDateTimeDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
                {isDateTimeDisabled && (
                    <p className="text-xs text-gray-500">נקבעה אוטומטית בפתיחת התיק</p>
                )}
            </div>
            <div className="flex items-end space-x-2 space-x-reverse pb-2">
                <Checkbox
                    id="has_catheter"
                    checked={formData.has_catheter}
                    onCheckedChange={c => handleChange('has_catheter', c)}
                />
                <Label htmlFor="has_catheter">הוחדר קטטר</Label>
            </div>
        </div>
        {formData.has_catheter && (
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>תאריך החדרת קטטר</Label>
                    <Input
                        type="date"
                        value={formData.catheter_insertion_date}
                        onChange={e => handleChange('catheter_insertion_date', e.target.value)}
                    />
                </div>
            </div>
        )}
        <div className="space-y-2">
            <Label>אבחנות / בעיות</Label>
            <Textarea
                value={formData.diagnoses}
                onChange={e => handleChange('diagnoses', e.target.value)}
            />
        </div>
      </fieldset>

      {/* Animal and Owner Details */}
      <fieldset disabled={!canEditAll} className="space-y-4 p-4 border rounded-md">
        <legend className="text-lg font-semibold px-2">פרטי בעלים וחיה</legend>

        <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <Avatar className="w-28 h-28 border-2">
                    <AvatarImage src={formData.animal_image_url} alt={formData.animal_name} />
                    <AvatarFallback className="text-4xl bg-gray-100">
                        {formData.animal_name ? formData.animal_name.charAt(0).toUpperCase() : '?'}
                    </AvatarFallback>
                </Avatar>
                <label htmlFor="animal-picture-upload" className={`cursor-pointer ${isUploadingImage || !canEditAll ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground">
                        {isUploadingImage ? (
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                            <Camera className="w-4 h-4 ml-2" />
                        )}
                        {formData.animal_image_url ? 'החלף תמונה' : 'הוסף תמונה'}
                    </div>
                    <input
                        id="animal-picture-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage || !canEditAll}
                    />
                </label>
                <p className="text-xs text-gray-500 text-center">צילום או בחירה מהגלריה</p>
            </div>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="space-y-2">
                  <Label>שם הבעלים *</Label>
                  <div className="relative">
                    <Input 
                      id="owner_name_input"
                      value={ownerSearchQuery || formData.owner_name} 
                      onChange={e => {
                        const value = e.target.value;
                        setOwnerSearchQuery(value);
                        handleChange('owner_name', value);
                        setShowOwnerSuggestions(true);
                        if (value !== selectedClient?.full_name) {
                          setSelectedClient(null);
                          handleChange('client_number', null);
                        }
                      }}
                      onFocus={() => setShowOwnerSuggestions(true)}
                      placeholder="הזן שם בעלים..."
                      required 
                    />
                    {showOwnerSuggestions && ownerSuggestions.length > 0 && ownerSearchQuery && (
                      <div className="owner-suggestions absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {ownerSuggestions.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleOwnerSelect(client)}
                            className="w-full text-right px-4 py-2 hover:bg-gray-100 flex flex-col border-b last:border-b-0"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium text-gray-900">{client.full_name}</span>
                              {client.client_number && (
                                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                  תיק #{client.client_number}
                                </span>
                              )}
                            </div>
                            {client.phone && <span className="text-sm text-gray-500">📞 {client.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {selectedClient && selectedClient.client_number && (
                  <div className="space-y-2">
                    <Label>מספר תיק</Label>
                    <Input 
                      value={selectedClient.client_number || ''} 
                      disabled
                      className="bg-gray-100 font-semibold text-purple-700"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>שם החיה *</Label>
                  {selectedClient && clientPatients.length > 0 ? (
                    <Select 
                      value={formData.animal_name} 
                      onValueChange={value => {
                        const patient = clientPatients.find(p => p.name === value);
                        handleChange('animal_name', value);
                        if (patient) {
                          console.log('🐾 Selected patient photo_url:', patient.photo_url);
                          handleChange('animal_type', patient.species || '');
                          handleChange('animal_sex', patient.sex || '');
                          handleChange('breed', patient.breed || '');
                          handleChange('is_neutered', patient.neutered || false);
                          if (patient.photo_url) {
                            handleChange('animal_image_url', patient.photo_url);
                          }
                          if (patient.weight) handleChange('admission_weight', patient.weight);
                          if (patient.date_of_birth) {
                            const age = Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
                            handleChange('age', `${age} שנים`);
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר/י חיה" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientPatients.map(patient => (
                          <SelectItem key={patient.id} value={patient.name}>
                            {patient.name} ({patient.species})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      value={formData.animal_name} 
                      onChange={e => handleChange('animal_name', e.target.value)} 
                      required 
                    />
                  )}
                </div>
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>סוג החיה</Label><Select value={formData.animal_type} onValueChange={v => handleChange('animal_type', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="כלב">כלב</SelectItem><SelectItem value="חתול">חתול</SelectItem><SelectItem value="ארנב">ארנב</SelectItem><SelectItem value="תוכי">תוכי</SelectItem><SelectItem value="חמוס">חמוס</SelectItem><SelectItem value="שרקן">שרקן</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>משקל בקבלה (ק"ג)</Label><Input type="number" step="0.01" value={formData.admission_weight} onChange={e => handleChange('admission_weight', e.target.value)} /></div>
          <div className="space-y-2"><Label>מין</Label><Select value={formData.animal_sex} onValueChange={v => handleChange('animal_sex', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="זכר">זכר</SelectItem><SelectItem value="נקבה">נקבה</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>גיל</Label><Input value={formData.age} onChange={e => handleChange('age', e.target.value)} /></div>
          <div className="space-y-2"><Label>גזע</Label><Input value={formData.breed} onChange={e => handleChange('breed', e.target.value)} /></div>
          <div className="flex items-center space-x-2 space-x-reverse pt-6"><Checkbox id="is_neutered" checked={formData.is_neutered} onCheckedChange={c => handleChange('is_neutered', c)} /><Label htmlFor="is_neutered">מעוקר / מסורס</Label></div>
        </div>
      </fieldset>

      {/* Treatment Instructions - Prominent Section with Execution Tracking */}
      <fieldset className="space-y-4 p-4 border-2 border-purple-300 rounded-md bg-purple-50/20">
        <legend className="text-lg font-semibold px-2 text-purple-900">הנחיות טיפול מאושפזים ומעקב ביצוע</legend>
        <TreatmentInstructionsSection
          instructions={formData.treatment_instructions || []}
          onChange={(newInstructions) => handleChange('treatment_instructions', newInstructions)}
          currentUser={currentUser}
          readOnly={isReadOnly}
          animalId={animal?.id}
          animalName={formData.animal_name}
          onAutoSave={handleAutoSaveTreatmentInstructions}
        />
      </fieldset>

      {/* Monitoring Log */}
      <fieldset className="space-y-2 p-4 border rounded-md"><legend className="text-lg font-semibold px-2">טבלת ניטור</legend>
        {(formData.monitoring_log || []).map((log, i) => {
          const canEditEntry = canEditLogEntry(log);
          const creatorDisplayName = log.created_by_name || (log.created_by ? (userMap.get(log.created_by) || log.created_by) : null);
          return (
            <LogEntry key={i} onRemove={() => removeLog('monitoring_log', i)} showRemove={canEditEntry} createdByName={creatorDisplayName}>
              <div className="col-span-3"><Input type="date" value={log.date || ''} onChange={e => handleLogChange('monitoring_log', i, 'date', e.target.value)} disabled={!canEditEntry} /></div>
              <div className="col-span-2"><Input type="time" placeholder="שעה" value={log.time || ''} onChange={e => handleLogChange('monitoring_log', i, 'time', e.target.value)} disabled={!canEditEntry} /></div>
              <div className="col-span-2"><Input placeholder="משקל" value={log.weight} onChange={e => handleLogChange('monitoring_log', i, 'weight', e.target.value)} disabled={!canEditEntry} /></div>
              <div className="col-span-2"><Input placeholder="טמפ'" value={log.temperature} onChange={e => handleLogChange('monitoring_log', i, 'temperature', e.target.value)} disabled={!canEditEntry} /></div>
              <div className="col-span-3"><Input placeholder="נשימות" value={log.respirations} onChange={e => handleLogChange('monitoring_log', i, 'respirations', e.target.value)} disabled={!canEditEntry} /></div>
            </LogEntry>
          );
        })}
        {canAddLogs && <Button type="button" variant="outline" size="sm" onClick={() => addLog('monitoring_log', { date: '', time: '', weight: '', temperature: '', respirations: '' })}><Plus className="w-4 h-4 ml-2"/>הוסף שורת ניטור</Button>}
      </fieldset>

      {/* Fluids Log */}
      <fieldset className="space-y-2 p-4 border rounded-md"><legend className="text-lg font-semibold px-2">מתן נוזלים</legend>
        {(formData.fluids_log || []).map((log, i) => {
            const canEditEntry = canEditLogEntry(log);
            const creatorDisplayName = log.created_by_name || (log.created_by ? (userMap.get(log.created_by) || log.created_by) : null);
            return (
              <LogEntry key={i} onRemove={() => removeLog('fluids_log', i)} showRemove={canEditEntry} createdByName={creatorDisplayName}>
                <div className="col-span-2"><Input type="date" value={log.date || ''} onChange={e => handleLogChange('fluids_log', i, 'date', e.target.value)} disabled={!canEditEntry}/></div>
                <div className="col-span-2"><Input type="time" placeholder="שעה" value={log.time || ''} onChange={e => handleLogChange('fluids_log', i, 'time', e.target.value)} disabled={!canEditEntry}/></div>
                <div className="col-span-3">
                  <Select 
                    value={log.fluid_type || ''} 
                    onValueChange={(value) => handleLogChange('fluids_log', i, 'fluid_type', value)}
                    disabled={!canEditEntry}
                  >
                    <SelectTrigger className={!canEditEntry ? 'bg-gray-100 cursor-not-allowed' : ''}>
                      <SelectValue placeholder="בחר סוג נוזל" />
                    </SelectTrigger>
                    <SelectContent>
                      {FLUID_TYPES.map((fluidType) => (
                        <SelectItem key={fluidType} value={fluidType}>
                          {fluidType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3"><Input placeholder="קצב (מ''ל/שעה)" value={log.rate_ml_hr} onChange={e => handleLogChange('fluids_log', i, 'rate_ml_hr', e.target.value)} disabled={!canEditEntry} /></div>
                <div className="col-span-2"><Input placeholder="תוספת (מ''ל)" value={log.additive_ml} onChange={e => handleLogChange('fluids_log', i, 'additive_ml', e.target.value)} disabled={!canEditEntry} /></div>
              </LogEntry>
            );
        })}
        {canAddLogs && <Button type="button" variant="outline" size="sm" onClick={() => addLog('fluids_log', { date: '', time: '', fluid_type: '', rate_ml_hr: '', additive_ml: '' })}><Plus className="w-4 h-4 ml-2"/>הוסף מתן נוזלים</Button>}
      </fieldset>

      {/* Observations Log */}
      <fieldset className="space-y-2 p-4 border rounded-md"><legend className="text-lg font-semibold px-2">טבלת תצפיות</legend>
        {(formData.observations_log || []).map((log, i) => {
            const canEditEntry = canEditLogEntry(log);
            const creatorDisplayName = log.created_by_name || (log.created_by ? (userMap.get(log.created_by) || log.created_by) : null);
            return (
              <LogEntry key={i} onRemove={() => removeLog('observations_log', i)} showRemove={canEditEntry} createdByName={creatorDisplayName}>
                <div className="col-span-2"><Input type="date" value={log.date || ''} onChange={e => handleLogChange('observations_log', i, 'date', e.target.value)} disabled={!canEditEntry} /></div>
                <div className="col-span-2"><Input type="time" placeholder="שעה" value={log.time || ''} onChange={e => handleLogChange('observations_log', i, 'time', e.target.value)} disabled={!canEditEntry} /></div>
                <div className="col-span-2 flex items-center gap-2"><Checkbox checked={log.has_feces} onCheckedChange={c => handleLogChange('observations_log', i, 'has_feces', c)} disabled={!canEditEntry} /><Label className="text-sm">צואה</Label></div>
                <div className="col-span-2 flex items-center gap-2"><Checkbox checked={log.has_urine} onCheckedChange={c => handleLogChange('observations_log', i, 'has_urine', c)} disabled={!canEditEntry} /><Label className="text-sm">שתן</Label></div>
                <div className="col-span-2 flex items-center gap-2"><Checkbox checked={log.has_appetite} onCheckedChange={c => handleLogChange('observations_log', i, 'has_appetite', c)} disabled={!canEditEntry} /><Label className="text-sm">תיאבון</Label></div>
                <div className="col-span-12 mt-2"><Textarea placeholder="הערות" value={log.notes} onChange={e => handleLogChange('observations_log', i, 'notes', e.target.value)} disabled={!canEditEntry} className="min-h-[60px] text-sm" /></div>
              </LogEntry>
            );
        })}
        {canAddLogs && <Button type="button" variant="outline" size="sm" onClick={() => addLog('observations_log', { date: '', time: '', has_feces: false, has_urine: false, has_appetite: false, notes: '' })}><Plus className="w-4 h-4 ml-2"/>הוסף תצפית</Button>}
      </fieldset>

      {/* Status & Submission */}
      <fieldset disabled={!canEditAll} className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
            <Label>סטטוס אשפוז</Label>
            <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="active">באשפוז פעיל</SelectItem>
                    <SelectItem value="discharged">שוחרר</SelectItem>
                    <SelectItem value="deceased">נפטר</SelectItem>
                </SelectContent>
            </Select>
        </div>
        
        {formData.status === 'discharged' && (
            <div className="space-y-2">
                <Label htmlFor="discharge_instructions">הנחיות לשחרור</Label>
                <Textarea
                  id="discharge_instructions"
                  value={formData.discharge_instructions || ''}
                  onChange={(e) => handleChange('discharge_instructions', e.target.value)}
                  placeholder="רשום כאן הנחיות להמשך טיפול בבית, תרופות, ביקורת וכו'..."
                  className="min-h-[120px]"
                />
            </div>
        )}
        
        {formData.status === 'deceased' && (
            <div className="space-y-2">
                <Label htmlFor="date_of_death">תאריך פטירה</Label>
                <Input
                  id="date_of_death"
                  type="date"
                  value={formData.date_of_death || ''}
                  onChange={(e) => handleChange('date_of_death', e.target.value)}
                />
            </div>
        )}
      </fieldset>

      {canAddLogs && (
        <>
            <div className="flex items-center space-x-2 space-x-reverse"><Checkbox id="confirmCorrectness" checked={confirmCorrectness} onCheckedChange={setConfirmCorrectness} /><Label htmlFor="confirmCorrectness">אני מאשר/ת שהפרטים שהוזנו נכונים ומדויקים</Label></div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 ml-2" />ביטול</Button>
                <Button type="submit" disabled={!confirmCorrectness}><Save className="w-4 h-4 ml-2" />{animal ? 'שמור שינויים' : 'צור דוח'}</Button>
            </div>
        </>
      )}

       {isReadOnly && (
           <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 ml-2" />סגור</Button>
           </div>
       )}

      <Dialog open={showClientSearch} onOpenChange={setShowClientSearch}>
        <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר לקוח ומטופל</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חפש לפי שם לקוח או טלפון..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="pr-10"
                autoFocus
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filteredClients.length === 0 && clientSearchQuery ? (
                <p className="text-center text-gray-500 py-4">לא נמצאו לקוחות</p>
              ) : (
                filteredClients.map(client => {
                  const clientPatients = allPatients.filter(p => p.client_number === client.client_number);
                  return (
                    <div
                      key={client.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectClient(client)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
                            #{client.client_number || '-'}
                          </Badge>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{client.full_name}</h4>
                              {client.id_number && (
                                <span className="text-sm text-gray-500">({client.id_number})</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">טלפון: {client.phone}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {clientPatients.map(p => (
                            <Badge 
                              key={p.id} 
                              variant="outline"
                              className="cursor-pointer hover:bg-purple-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPatient(client, p);
                              }}
                            >
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}