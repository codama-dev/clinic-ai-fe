import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Stethoscope, Pill, Clock, AlertCircle, Check, ChevronsUpDown, Loader2, CheckCircle, Calendar, Edit, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EditInstructionDialog from './EditInstructionDialog';

const FREQUENCY_OPTIONS = [
  { value: 'פעם ביום', label: 'פעם ביום' },
  { value: 'פעמיים ביום', label: 'פעמיים ביום' },
  { value: 'שלוש פעמים ביום', label: 'שלוש פעמים ביום' },
];

const ROUTE_OPTIONS = [
  { value: 'דרך הפה (OS)', label: 'דרך הפה (OS)' },
  { value: 'תת עורי (SC)', label: 'תת עורי (SC)' },
  { value: 'תוך ורידי (IV)', label: 'תוך ורידי (IV)' },
  { value: 'תוך ורידי איטי (SIV)', label: 'תוך ורידי איטי (SIV)' },
  { value: 'מריחה', label: 'מריחה' },
];

export default function TreatmentInstructionsSection({ 
  instructions = [], 
  onChange, 
  currentUser,
  readOnly = false,
  animalId = null,
  animalName = '',
  onAutoSave = null
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedExecutions, setExpandedExecutions] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [newInstruction, setNewInstruction] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    route: '',
    notes: '',
  });

  const isDoctor = currentUser?.job === 'doctor';
  const isAdmin = currentUser?.role === 'admin';
  const canEdit = (isDoctor || isAdmin) && !readOnly;

  // Fetch medications from client price list - only "תרופות" category
  const { data: medications = [], isLoading: isLoadingMedications } = useQuery({
    queryKey: ['medications'],
    queryFn: async () => {
      const allClientPrices = await base44.entities.ClientPriceList.list();
      return allClientPrices.filter(item => item.category === 'תרופות');
    },
    enabled: canEdit,
  });

  // ✅ Fetch treatment executions from the new separate table
  const { data: allExecutions = [], isLoading: isLoadingExecutions, refetch: refetchExecutions } = useQuery({
    queryKey: ['treatmentExecutions', animalId],
    queryFn: async () => {
      if (!animalId) return [];
      const executions = await base44.entities.TreatmentExecution.filter(
        { animal_id: animalId },
        '-created_date',
        100
      );
      return executions;
    },
    enabled: !!animalId,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // Delete execution mutation
  const deleteExecutionMutation = useMutation({
    mutationFn: (executionId) => base44.entities.TreatmentExecution.delete(executionId),
    onSuccess: () => {
      refetchExecutions();
      toast.success('הרשומה נמחקה בהצלחה');
    },
    onError: (error) => {
      console.error('Error deleting execution:', error);
      toast.error('שגיאה במחיקת הרשומה');
    }
  });

  // Get executions for a specific instruction
  const getInstructionExecutions = (instruction) => {
    return (allExecutions || []).filter(exec => 
      exec.medication_name === instruction.medication_name &&
      exec.dosage === instruction.dosage
    );
  };

  // Check if user can delete this execution (only the latest one they added)
  const canDeleteExecution = (exec, executions) => {
    if (readOnly) return false;
    // Must be the user's own execution
    if (exec.executed_by !== currentUser?.email) return false;
    // Must be the most recent execution by this user
    const userExecutions = executions.filter(e => e.executed_by === currentUser?.email);
    return userExecutions.length > 0 && userExecutions[0].id === exec.id;
  };

  const handleDeleteExecution = async (executionId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הרשומה האחרונה?')) {
      return;
    }
    deleteExecutionMutation.mutate(executionId);
  };

  // Get today's executions for an instruction
  const getTodayExecutions = (instruction) => {
    const today = new Date().toISOString().split('T')[0];
    return getInstructionExecutions(instruction).filter(exec => exec.execution_date === today);
  };

  // Check if button should be locked (within 4 hours of last execution)
  const isButtonLocked = (instruction) => {
    const executions = getInstructionExecutions(instruction);
    if (executions.length === 0) return false;
    
    // Get the most recent execution
    const latestExecution = executions[0]; // Already sorted by -created_date
    const executionDateTime = new Date(`${latestExecution.execution_date}T${latestExecution.execution_time}`);
    const now = new Date();
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    
    return (now - executionDateTime) < fourHoursInMs;
  };

  // Get time remaining until unlock
  const getTimeUntilUnlock = (instruction) => {
    const executions = getInstructionExecutions(instruction);
    if (executions.length === 0) return null;
    
    const latestExecution = executions[0];
    const executionDateTime = new Date(`${latestExecution.execution_date}T${latestExecution.execution_time}`);
    const unlockTime = new Date(executionDateTime.getTime() + (4 * 60 * 60 * 1000));
    const now = new Date();
    
    if (now >= unlockTime) return null;
    
    const diffMs = unlockTime - now;
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleAdd = async () => {
    if (!newInstruction.medication_name || !newInstruction.dosage || !newInstruction.frequency) {
      alert('יש למלא שם תרופה, מינון ותדירות');
      return;
    }

    const instructionWithMeta = {
      ...newInstruction,
      prescribed_by: currentUser?.display_name || currentUser?.full_name || 'רופא',
      prescribed_date: new Date().toISOString(),
    };

    const updatedInstructions = [...instructions, instructionWithMeta];
    
    // Update local state
    onChange(updatedInstructions);

    // If we have an animalId and onAutoSave callback, save immediately to DB
    if (animalId && onAutoSave) {
      setIsSaving(true);
      try {
        await onAutoSave(updatedInstructions);
        toast.success('הנחיית הטיפול נשמרה בהצלחה!');
      } catch (error) {
        console.error('Error auto-saving instruction:', error);
        toast.error('שגיאה בשמירת הנחיית הטיפול');
        // Revert the change on error
        onChange(instructions);
      } finally {
        setIsSaving(false);
      }
    }

    // Clear form
    setNewInstruction({
      medication_name: '',
      dosage: '',
      frequency: '',
      route: '',
      notes: '',
    });
  };

  const handleEdit = (index) => {
    const instruction = instructions[index];
    setEditingIndex(index);
    setEditingInstruction(instruction);
    setEditDialogOpen(true);
  };



  const handleSaveEdit = async (formData) => {
    const updatedInstructions = [...instructions];
    const originalInstruction = updatedInstructions[editingIndex];
    
    // Keep original metadata, update only editable fields
    updatedInstructions[editingIndex] = {
      ...originalInstruction,
      medication_name: formData.medication_name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      route: formData.route,
      notes: formData.notes,
    };
    
    // Update local state
    onChange(updatedInstructions);

    // If we have an animalId and onAutoSave callback, save immediately to DB
    if (animalId && onAutoSave) {
      setIsSaving(true);
      try {
        await onAutoSave(updatedInstructions);
        toast.success('הנחיית הטיפול עודכנה בהצלחה!');
      } catch (error) {
        console.error('Error auto-saving instruction:', error);
        toast.error('שגיאה בעדכון הנחיית הטיפול');
        // Revert the change on error
        onChange(instructions);
      } finally {
        setIsSaving(false);
      }
    }

    // Close dialog and reset
    setEditDialogOpen(false);
    setEditingIndex(null);
    setEditingInstruction(null);
  };

  const handleRemove = async (index) => {
    const updatedInstructions = instructions.filter((_, i) => i !== index);
    
    // Update local state
    onChange(updatedInstructions);

    // If we have an animalId and onAutoSave callback, save immediately to DB
    if (animalId && onAutoSave) {
      setIsSaving(true);
      try {
        await onAutoSave(updatedInstructions);
        toast.success('הנחיית הטיפול הוסרה בהצלחה');
      } catch (error) {
        console.error('Error auto-saving after removal:', error);
        toast.error('שגיאה בהסרת הנחיית הטיפול');
        // Revert the change on error
        onChange(instructions);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // ✅ Handle marking treatment as executed - save to separate table
  const handleMarkExecuted = async (instruction) => {
    if (readOnly || !animalId) return;
    
    const userDisplayName = currentUser?.display_name || currentUser?.full_name || 'משתמש לא ידוע';
    const now = new Date();
    
    try {
      // Save to TreatmentExecution table
      await base44.entities.TreatmentExecution.create({
        animal_id: animalId,
        animal_name: animalName,
        medication_name: instruction.medication_name,
        dosage: instruction.dosage,
        route: instruction.route || '',
        frequency: instruction.frequency || '',
        instruction_notes: instruction.notes || '',
        executed_by: currentUser?.email,
        executed_by_name: userDisplayName,
        execution_date: now.toISOString().split('T')[0],
        execution_time: now.toTimeString().slice(0, 5),
      });
      
      // Refresh executions list
      await refetchExecutions();
      
      toast.success(`הטיפול "${instruction.medication_name}" סומן כבוצע!`, {
        description: `נשמר בהצלחה על ידי ${userDisplayName}`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving treatment execution:', error);
      toast.error('שגיאה בשמירת ביצוע הטיפול');
    }
  };

  return (
    <div className="space-y-4">
      <EditInstructionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        instruction={editingInstruction}
        onSave={handleSaveEdit}
      />

      {isSaving && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-800">שומר הנחיית טיפול...</span>
        </div>
      )}

      {/* Display existing instructions */}
      {instructions.length > 0 && (
        <div className="space-y-3">
          {instructions.map((instruction, index) => {
            const executions = getInstructionExecutions(instruction);
            const todayExecutions = getTodayExecutions(instruction);
            const locked = isButtonLocked(instruction);
            const timeUntilUnlock = getTimeUntilUnlock(instruction);
            
            return (
              <Card key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-grow">
                      <Pill className="w-5 h-5 text-purple-600" />
                      <CardTitle className="text-lg">{instruction.medication_name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleMarkExecuted(instruction)}
                            disabled={locked}
                            className={locked ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            {locked ? "נעול" : "בוצע עכשיו"}
                          </Button>
                          {locked && timeUntilUnlock && (
                            <span className="text-xs text-gray-500">
                              יפתח בעוד: {timeUntilUnlock}
                            </span>
                          )}
                        </div>
                      )}
                      {canEdit && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(index)}
                            className="h-8 w-8"
                            disabled={isSaving}
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(index)}
                            className="h-8 w-8"
                            disabled={isSaving}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        <AlertCircle className="w-3 h-3 ml-1" />
                        מינון: {instruction.dosage}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        <Clock className="w-3 h-3 ml-1" />
                        תדירות: {instruction.frequency}
                      </Badge>
                    </div>
                    {instruction.route && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white">
                          דרך מתן: {instruction.route}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {instruction.notes && (
                    <div className="mt-2 p-2 bg-white/70 rounded-md text-sm text-gray-700">
                      <strong>הערות:</strong> {instruction.notes}
                    </div>
                  )}
                  
                  {/* ✅ ALWAYS show execution statistics */}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Calendar className="w-3 h-3 ml-1" />
                        {executions.length} ביצועים כולל
                      </Badge>
                      {todayExecutions.length > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          {todayExecutions.length} ביצועים היום
                        </Badge>
                      )}
                      {executions.length === 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          <AlertCircle className="w-3 h-3 ml-1" />
                          טרם בוצע
                        </Badge>
                      )}
                    </div>
                    
                    {/* Execution history - always visible */}
                    {isLoadingExecutions ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        <span className="text-xs text-gray-500 mr-2">טוען ביצועים...</span>
                      </div>
                    ) : executions.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          ביצועים אחרונים:
                        </p>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {executions.slice(0, expandedExecutions[index] ? executions.length : 3).map((exec, execIdx) => {
                            const canDelete = canDeleteExecution(exec, executions);
                            return (
                              <div key={exec.id} className="flex items-center justify-between text-xs bg-white/90 p-2.5 rounded border border-gray-200 hover:border-blue-300 transition-colors">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                  <span className="font-medium text-gray-800">{exec.executed_by_name}</span>
                                </div>
                                <div className="text-gray-500 flex items-center gap-2">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(exec.execution_date).toLocaleDateString('he-IL')}</span>
                                  <span className="font-mono font-semibold">{exec.execution_time}</span>
                                  {canDelete && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteExecution(exec.id)}
                                      className="h-5 w-5 ml-1 hover:bg-red-50"
                                    >
                                      <X className="w-3 h-3 text-red-500" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {executions.length > 3 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedExecutions({ ...expandedExecutions, [index]: !expandedExecutions[index] })}
                            className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            {expandedExecutions[index] ? `הסתר (${executions.length - 3} נוספים)` : `הצג הכל (עוד ${executions.length - 3})`}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50/50 border border-yellow-200 rounded-md text-center">
                        <p className="text-xs text-yellow-700 font-medium">
                          🕐 טיפול זה טרם בוצע - לחץ "בוצע עכשיו" כאשר הטיפול מתבצע
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">
                    <Stethoscope className="w-3 h-3" />
                    <span>נקבע על ידי: {instruction.prescribed_by}</span>
                    <span>•</span>
                    <span>{new Date(instruction.prescribed_date).toLocaleDateString('he-IL')}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {instructions.length === 0 && (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
          <Pill className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>לא נקבעו הנחיות טיפול עדיין</p>
          {!isDoctor && !isAdmin && <p className="text-xs mt-1">הנחיות יקבעו על ידי רופא או אדמין</p>}
        </div>
      )}

      {/* Add instruction form - only for doctors and admins */}
      {canEdit && (
        <Card className="border-purple-300 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              הוסף הנחיית טיפול חדשה
              {animalId && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  שמירה אוטומטית
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">שם התרופה / טיפול *</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between bg-white"
                      disabled={isSaving}
                    >
                      {newInstruction.medication_name || "בחר תרופה או הזן ידנית..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="חפש תרופה או הזן שם חדש..." 
                        value={newInstruction.medication_name}
                        onValueChange={(value) => setNewInstruction({ ...newInstruction, medication_name: value })}
                      />
                      <CommandList>
                        {isLoadingMedications ? (
                          <div className="py-6 text-center text-sm text-gray-500">טוען תרופות...</div>
                        ) : (
                          <>
                            {(() => {
                              const searchTerm = newInstruction.medication_name?.toLowerCase() || '';
                              const filteredMeds = medications.filter(med => 
                                med.product_name?.toLowerCase().includes(searchTerm) ||
                                med.sub_category?.toLowerCase().includes(searchTerm)
                              );
                              
                              return (
                                <>
                                  {newInstruction.medication_name && !medications.some(med => med.product_name === newInstruction.medication_name) && (
                                    <CommandGroup heading="הוסף תרופה חדשה">
                                      <CommandItem
                                        value={newInstruction.medication_name}
                                        onSelect={() => {
                                          setOpen(false);
                                        }}
                                      >
                                        <Plus className="ml-2 h-4 w-4" />
                                        <span>הוסף "{newInstruction.medication_name}"</span>
                                      </CommandItem>
                                    </CommandGroup>
                                  )}
                                  <CommandGroup heading="תרופות במחירון">
                                    {filteredMeds.length === 0 ? (
                                      <CommandEmpty>לא נמצאו תרופות תואמות</CommandEmpty>
                                    ) : (
                                      filteredMeds.map((med) => (
                                        <CommandItem
                                          key={med.id}
                                          value={med.product_name}
                                          onSelect={(currentValue) => {
                                            setNewInstruction({ ...newInstruction, medication_name: currentValue });
                                            setOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "ml-2 h-4 w-4",
                                              newInstruction.medication_name === med.product_name ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <Pill className="ml-2 h-4 w-4 text-purple-500" />
                                          <div className="flex flex-col">
                                            <span>{med.product_name}</span>
                                            {med.sub_category && (
                                              <span className="text-xs text-gray-500">{med.sub_category}</span>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))
                                    )}
                                  </CommandGroup>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">בחר מהמחירון או הזן שם תרופה חופשי</p>
              </div>
              <div>
                <Label className="text-sm">מינון *</Label>
                <Input
                  value={newInstruction.dosage}
                  onChange={(e) => setNewInstruction({ ...newInstruction, dosage: e.target.value })}
                  placeholder="לדוגמה: 250mg"
                  className="bg-white"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">תדירות *</Label>
                <Select
                  value={newInstruction.frequency}
                  onValueChange={(value) => setNewInstruction({ ...newInstruction, frequency: value })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="בחר תדירות" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">דרך מתן</Label>
                <Select
                  value={newInstruction.route}
                  onValueChange={(value) => setNewInstruction({ ...newInstruction, route: value })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="בחר דרך מתן" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm">הערות נוספות</Label>
              <Textarea
                value={newInstruction.notes}
                onChange={(e) => setNewInstruction({ ...newInstruction, notes: e.target.value })}
                placeholder="הערות חשובות לגבי הטיפול..."
                className="bg-white min-h-[60px]"
                disabled={isSaving}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAdd}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף הנחיה
                  </>
                )}
              </Button>
            </div>
            {animalId && (
              <p className="text-xs text-center text-purple-700 bg-purple-100 p-2 rounded">
                💡 הנחיות הטיפול נשמרות אוטומטית עם הוספתן
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}