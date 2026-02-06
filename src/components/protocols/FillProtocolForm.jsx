import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, AlertTriangle, FileSignature, Trash2, CheckCircle, Plus, Lock, Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Helper function to check if a date is today
const isToday = (dateString) => {
  if (!dateString) return true; // New protocols created without a date are considered editable
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

const ProtocolSection = ({ title, children, onSave, canSave, isReadOnly }) => (
    <div className="p-4 border rounded-lg bg-gray-50/70 space-y-4">
        <h3 className="text-xl font-bold text-center text-gray-800">{title}</h3>
        <div className="space-y-6 pt-2">
            {children}
        </div>
        {!isReadOnly && onSave && (
            <div className="flex justify-end pt-4 border-t">
                <Button 
                    type="button" 
                    onClick={onSave}
                    disabled={!canSave}
                    variant="outline"
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                >
                    <Save className="w-4 h-4 ml-2" />
                    שמור
                </Button>
            </div>
        )}
    </div>
);

const WarningMessage = ({ message }) => (
    <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-md flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <p className="text-sm font-medium text-yellow-800">{message}</p>
    </div>
);

const SignaturePad = ({ value, onChange, disabled }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (value && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = value;
        } else if (!value && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [value]);

    const startDrawing = (e) => {
        if (disabled) return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing || disabled) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing || disabled) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        onChange(canvas.toDataURL());
    };

    const handleTouchStart = (e) => {
        if (disabled) return;
        e.preventDefault();
        const touch = e.touches[0];
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleTouchMove = (e) => {
        if (!isDrawing || disabled) return;
        e.preventDefault();
        const touch = e.touches[0];
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    };

    const handleTouchEnd = (e) => {
        if (disabled) return;
        stopDrawing();
    };

    const clearSignature = () => {
        if (disabled) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onChange('');
    };

    return (
        <div className="space-y-2">
            <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className={`border-2 rounded-md bg-white touch-none ${disabled ? 'border-gray-300' : 'border-purple-300 cursor-crosshair'}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ width: '100%', maxWidth: '400px', height: '150px' }}
            />
            {!disabled && (
                <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                    <Trash2 className="w-4 h-4 ml-2" />
                    נקה חתימה
                </Button>
            )}
        </div>
    );
};

const ConsentSection = ({ formData, handleChange, isReadOnly, onSave, onConsentConfirm, isConsentLocked }) => {
    const [consentAgreed, setConsentAgreed] = useState(formData.consent_agreed || false);
    const [isExpanded, setIsExpanded] = useState(!isConsentLocked);
    
    const hasSignature = formData.client_signature && formData.client_signature.length > 0;
    const canConfirm = hasSignature && consentAgreed && formData.client_consent_name && formData.client_consent_name.length > 0;

    const handleConsentConfirm = () => {
        handleChange('consent_agreed', consentAgreed);
        if (onConsentConfirm) {
            onConsentConfirm();
        }
        setIsExpanded(false);
    };
    
    const effectiveReadOnly = isReadOnly || isConsentLocked;

    // תצוגה מצומצמת כשההסכמה נעולה
    if (isConsentLocked && !isExpanded) {
        return (
            <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50/50 mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-700 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-green-800">טופס הסכמה לפרוצדורה בהרדמה נחתם</p>
                            <p className="text-xs text-green-700">נחתם על ידי: {formData.client_consent_name}</p>
                        </div>
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        הצג טופס מלא
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 border-2 border-blue-300 rounded-lg bg-blue-50/50 space-y-4 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-blue-900">טופס הסכמה לפרוצדורה בהרדמה</h3>
                {isConsentLocked && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsExpanded(false)}
                        className="text-gray-600 hover:text-gray-700"
                    >
                        צמצם תצוגה
                    </Button>
                )}
            </div>
            
            {isConsentLocked && (
                <div className="p-3 bg-green-100 border-2 border-green-400 rounded-md flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-700 flex-shrink-0" />
                    <p className="text-sm font-bold text-green-800">ההסכמה אושרה ונעולה - לא ניתן לערוך</p>
                </div>
            )}
            
            <div className="space-y-3 text-sm text-gray-800 leading-relaxed">
                <p>
                    הרדמה מתבצעת ע"י הזרקת/הזרמת חומרי הרדמה למערכת הדם/הנשימה באמצעות צינור קנה (טובוס) ו/או מסכה. 
                    חומרי ההרדמה גורמים לירידה ברמת ההכרה, להרפיית השרירים ולהורדת תחושת הכאב. 
                    קצב ההתעוררות מההרדמה תלוי בגורמים שונים הקשורים בסוג הניתוח, בעומק ההרדמה ובמצבו הכללי של החולה.
                </p>
                <p className="font-semibold mt-4">תופעות לוואי וסיבוכים הקשורים בהרדמה:</p>
                <p>
                    בחילות, הקאות, אי נוחות כללית. כאב גרון ואי נוחות בבליעה (בהרדמה שמערבת טובוס). 
                    במקרים נדירים ייתכנו סיבוכים קשים לרבות: תגובה אלרגית חריפה, ליקויים נוירולוגים, 
                    הפרעות בתפקודי הכבד והכליות ו/או בתפקוד מערכות חיוניות אחרות. 
                    במקרים נדירים ביותר אפשרי מוות מסיבוכים אלה.
                </p>
                <p className="font-semibold">
                    סיכוני ההרדמה על כל סוגיה, אינם קשורים בהכרח בסוג הניתוח ובמורכבותו.
                </p>
                
                <div className="mt-4 p-3 bg-white/70 border border-blue-200 rounded-md">
                    <Label htmlFor="client_consent_name" className="font-semibold text-gray-800 mb-2 block">
                        שם הלקוח החתום/ה על ההסכמה:
                    </Label>
                    <Input
                        id="client_consent_name"
                        value={formData.client_consent_name || ''}
                        onChange={(e) => handleChange('client_consent_name', e.target.value)}
                        disabled={effectiveReadOnly}
                        placeholder="הזן/י שם מלא"
                        className="max-w-md"
                    />
                </div>
                
                <p className="mt-3">
                    אני החתומ/ה מטה, מסכימ/ה בזאת להרדים את בע"ח שלי במרפאת לאב וט.
                </p>
                <p className="mt-4">
                    אני מצהיר/ה ומאשר/ת בזאת כי הוסבר לי ואני מבינ/ה שקיימת אפשרות שבמהלך הניתוח יתברר שיש צורך 
                    להרחיב את היקפו, לשנותו או לנקוט הליכים אחרים נוספים לצורך הצלת חיים או מניעת נזק גופני, 
                    שלא ניתן היה לצפות מראש. לפיכך אני מסכים/ה גם לאותה הרחבה, שינוי או ביצוע הליכים אחרים או נוספים. 
                    כמו כן אני מודע/ת גם לתופעות העשויות להתרחש לאחר ההתעוררות כגון פציעה עצמית בעקבות בילבול או סטרס.
                </p>
                <p className="mt-4">
                    כמו כן, מובן לי שההמלצה הרפואית לאחר ניתוח המלווה בתפרים היא להשתמש בקולר אליזבתני על מנת למנוע 
                    מבעל החיים לפתוח את התפרים. במקרה של פתיחת תפרים כתוצאה מהתעסקות, עלות תפירה חוזרת באחריות הלקוח בלבד.
                </p>
            </div>
            
            {!effectiveReadOnly && (
                <div className="mt-6 p-4 bg-white/70 border-2 border-purple-300 rounded-lg space-y-4">
                    <h4 className="text-lg font-bold text-purple-900">אישורי צום</h4>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                                id="fasting_8h" 
                                checked={formData.fasting_8h || false}
                                onCheckedChange={(checked) => handleChange('fasting_8h', checked)}
                                disabled={effectiveReadOnly}
                            />
                            <label htmlFor="fasting_8h" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                החיה הייתה בצום של 8 שעות (בחיה שמשקלה 5 ק"ג או פחות)
                            </label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                                id="fasting_12h" 
                                checked={formData.fasting_12h || false}
                                onCheckedChange={(checked) => handleChange('fasting_12h', checked)}
                                disabled={effectiveReadOnly}
                            />
                            <label htmlFor="fasting_12h" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                החיה הייתה בצום של 12 שעות (בחיה מעל 5 ק"ג)
                            </label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                                id="no_fasting_needed" 
                                checked={formData.no_fasting_needed || false}
                                onCheckedChange={(checked) => handleChange('no_fasting_needed', checked)}
                                disabled={effectiveReadOnly}
                            />
                            <label htmlFor="no_fasting_needed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                אין צורך בצום
                            </label>
                        </div>
                    </div>
                    
                    <div className="mt-6 space-y-2">
                        <Label htmlFor="client_signature" className="flex items-center gap-2 font-bold text-purple-900">
                            <FileSignature className="w-5 h-5" />
                            חתימת הלקוח
                        </Label>
                        <p className="text-xs text-gray-600">יש לחתום במסגרת המסומנת</p>
                        <SignaturePad
                            value={formData.client_signature || ''}
                            onChange={(signature) => handleChange('client_signature', signature)}
                            disabled={effectiveReadOnly}
                        />
                    </div>

                    <div className="mt-6 pt-4 border-t space-y-4">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                                id="consent_agreed" 
                                checked={consentAgreed}
                                onCheckedChange={setConsentAgreed}
                                disabled={effectiveReadOnly}
                            />
                            <label htmlFor="consent_agreed" className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                אני מאשר/ת שקראתי והבנתי את תנאי ההסכמה ומסכים/ה לפרוצדורה
                            </label>
                        </div>
                        
                        {(!hasSignature || !formData.client_consent_name) && (
                            <p className="text-xs text-red-600">* נדרשים שם וחתימה על מנת לאשר את ההסכמה</p>
                        )}
                        
                        <div className="flex justify-end">
                            <Button 
                                type="button"
                                onClick={handleConsentConfirm}
                                disabled={!canConfirm || effectiveReadOnly}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4 ml-2" />
                                אישור הסכמה
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            {effectiveReadOnly && (
                <div className="mt-6 p-4 bg-white/70 border-2 border-purple-300 rounded-lg space-y-4">
                    {formData.client_consent_name && (
                        <div>
                            <p className="font-bold text-purple-900">שם הלקוח:</p>
                            <p className="text-gray-800">{formData.client_consent_name}</p>
                        </div>
                    )}
                    <h4 className="text-lg font-bold text-purple-900">אישורי צום</h4>
                    <div className="space-y-2 text-sm">
                        {formData.fasting_8h && <p>✓ החיה הייתה בצום של 8 שעות (בחיה שמשקלה 5 ק"ג או פחות)</p>}
                        {formData.fasting_12h && <p>✓ החיה הייתה בצום של 12 שעות (בחיה מעל 5 ק"ג)</p>}
                        {formData.no_fasting_needed && <p>✓ אין צורך בצום</p>}
                        {!formData.fasting_8h && !formData.fasting_12h && !formData.no_fasting_needed && <p className="text-gray-500">לא סומנו אישורי צום</p>}
                    </div>
                    {formData.client_signature && (
                        <div className="mt-4">
                            <p className="font-bold text-purple-900 mb-2">חתימת הלקוח:</p>
                            <img 
                                src={formData.client_signature} 
                                alt="חתימת לקוח" 
                                className="border-2 border-purple-300 rounded-md bg-white max-w-full h-auto"
                                style={{ maxWidth: '400px', height: 'auto' }}
                            />
                        </div>
                    )}
                    {formData.consent_agreed && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                ההסכמה אושרה על ידי הלקוח
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AnesthesiaMonitoringSection = ({ formData, handleChange, isReadOnly, onSave, currentUser, fieldMetadata }) => {
    const [monitoringRecords, setMonitoringRecords] = useState(formData.anesthesia_monitoring || []);

    useEffect(() => {
        setMonitoringRecords(formData.anesthesia_monitoring || []);
    }, [formData.anesthesia_monitoring]);

    const addNewRecord = () => {
        const now = new Date();
        const newRecord = {
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().slice(0, 5),
            pulse: '',
            respirations: '',
            blood_pressure: '',
            iso: '',
            procedure_notes: '',
            _created_by: currentUser?.email,
            _created_by_name: currentUser?.display_name || currentUser?.full_name
        };
        const updatedRecords = [...monitoringRecords, newRecord];
        setMonitoringRecords(updatedRecords);
        handleChange('anesthesia_monitoring', updatedRecords);
    };

    const updateRecord = (index, field, value) => {
        const updatedRecords = [...monitoringRecords];
        updatedRecords[index][field] = value;
        setMonitoringRecords(updatedRecords);
        handleChange('anesthesia_monitoring', updatedRecords);
    };

    const deleteRecord = (index) => {
        const record = monitoringRecords[index];
        const canDelete = !record._created_by || record._created_by === currentUser?.email;
        
        if (!canDelete) {
            alert(`רק ${record._created_by_name} יכול/ה למחוק רשומה זו`);
            return;
        }
        
        const updatedRecords = monitoringRecords.filter((_, i) => i !== index);
        setMonitoringRecords(updatedRecords);
        handleChange('anesthesia_monitoring', updatedRecords);
    };

    const canEditRecord = (record) => {
        return !record._created_by || record._created_by === currentUser?.email;
    };

    return (
        <div className="p-6 border-2 border-green-300 rounded-lg bg-green-50/50 space-y-4 mb-8">
            <h3 className="text-2xl font-bold text-center text-green-900 mb-4">ניטור הרדמה</h3>
            
            {!isReadOnly && (
                <div className="flex justify-between items-center mb-4">
                    <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                        💡 ניתן לערוך רק רשומות שיצרת בעצמך
                    </div>
                    <Button 
                        type="button" 
                        onClick={addNewRecord}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף רשומת ניטור
                    </Button>
                </div>
            )}

            {monitoringRecords.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                    {isReadOnly ? 'לא נוספו רשומות ניטור' : 'לחץ על "הוסף רשומת ניטור" כדי להתחיל'}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">תאריך</TableHead>
                                <TableHead className="text-right">שעה</TableHead>
                                <TableHead className="text-right">דופק</TableHead>
                                <TableHead className="text-right">נשימות</TableHead>
                                <TableHead className="text-right">לחץ דם</TableHead>
                                <TableHead className="text-right">ISO</TableHead>
                                <TableHead className="text-right">הערות פרוצדורה</TableHead>
                                {!isReadOnly && <TableHead className="text-center">נוצר ע"י</TableHead>}
                                {!isReadOnly && <TableHead className="text-center">פעולות</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {monitoringRecords.map((record, index) => {
                                const recordEditable = canEditRecord(record);
                                return (
                                    <TableRow key={index} className={!recordEditable ? 'bg-gray-50' : ''}>
                                        <TableCell className="text-right">
                                            {record.date ? new Date(record.date).toLocaleDateString('he-IL') : ''}
                                        </TableCell>
                                        <TableCell className="text-right">{record.time}</TableCell>
                                        <TableCell>
                                            {isReadOnly || !recordEditable ? (
                                                <div className="flex items-center gap-1">
                                                    <span>{record.pulse}</span>
                                                    {!recordEditable && <Lock className="w-3 h-3 text-gray-400" />}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="text"
                                                    value={record.pulse}
                                                    onChange={(e) => updateRecord(index, 'pulse', e.target.value)}
                                                    placeholder="דופק"
                                                    className="w-20"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isReadOnly || !recordEditable ? (
                                                <div className="flex items-center gap-1">
                                                    <span>{record.respirations}</span>
                                                    {!recordEditable && <Lock className="w-3 h-3 text-gray-400" />}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="text"
                                                    value={record.respirations}
                                                    onChange={(e) => updateRecord(index, 'respirations', e.target.value)}
                                                    placeholder="נשימות"
                                                    className="w-20"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isReadOnly || !recordEditable ? (
                                                <div className="flex items-center gap-1">
                                                    <span>{record.blood_pressure}</span>
                                                    {!recordEditable && <Lock className="w-3 h-3 text-gray-400" />}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="text"
                                                    value={record.blood_pressure}
                                                    onChange={(e) => updateRecord(index, 'blood_pressure', e.target.value)}
                                                    placeholder="לחץ דם"
                                                    className="w-24"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isReadOnly || !recordEditable ? (
                                                <div className="flex items-center gap-1">
                                                    <span>{record.iso}</span>
                                                    {!recordEditable && <Lock className="w-3 h-3 text-gray-400" />}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="text"
                                                    value={record.iso}
                                                    onChange={(e) => updateRecord(index, 'iso', e.target.value)}
                                                    placeholder="ISO"
                                                    className="w-20"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isReadOnly || !recordEditable ? (
                                                <div className="flex items-center gap-1">
                                                    <span>{record.procedure_notes}</span>
                                                    {!recordEditable && <Lock className="w-3 h-3 text-gray-400" />}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="text"
                                                    value={record.procedure_notes}
                                                    onChange={(e) => updateRecord(index, 'procedure_notes', e.target.value)}
                                                    placeholder="הערות"
                                                    className="w-32"
                                                />
                                            )}
                                        </TableCell>
                                        {!isReadOnly && (
                                            <TableCell className="text-center text-xs text-gray-600">
                                                {record._created_by_name || 'לא ידוע'}
                                            </TableCell>
                                        )}
                                        {!isReadOnly && (
                                            <TableCell className="text-center">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => deleteRecord(index)}
                                                                    disabled={!recordEditable}
                                                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-30"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </span>
                                                        </TooltipTrigger>
                                                        {!recordEditable && (
                                                            <TooltipContent>
                                                                <p>רק {record._created_by_name} יכול/ה למחוק</p>
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!isReadOnly && onSave && monitoringRecords.length > 0 && (
                <div className="flex justify-end pt-4 border-t">
                    <Button 
                        type="button" 
                        onClick={onSave}
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                    >
                        <Save className="w-4 h-4 ml-2" />
                        שמור ניטור
                    </Button>
                </div>
            )}
        </div>
    );
};

export default function FillProtocolForm({ 
  template, 
  onSubmit, 
  onPartialSave, 
  onCancel, 
  initialData = {}, 
  isReadOnly = false, 
  currentUser,
  protocolCreatedDate 
}) {
  const [formData, setFormData] = useState(initialData);
  const [fieldMetadata, setFieldMetadata] = useState(initialData.field_metadata || {});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConsentLocked, setIsConsentLocked] = useState(initialData?.consent_agreed || false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState(initialData.owner_name || '');
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // טעינת לקוחות להשלמה אוטומטית - שימוש באותה לוגיקה כמו דף ניהול לקוחות
  const { data: allClients = [] } = useQuery({
    queryKey: ['allClientsForAutocomplete'],
    queryFn: () => base44.entities.Client.list('-created_date', 5000),
    staleTime: 60000, // Cache for 1 minute
  });

  // סינון לקוחות לפי חיפוש (זהה לדף ניהול לקוחות)
  const clients = React.useMemo(() => {
    if (!ownerSearchQuery || ownerSearchQuery.length < 2) return [];
    
    const query = ownerSearchQuery.toLowerCase();
    return allClients.filter(client => 
      client.full_name?.toLowerCase().includes(query) ||
      client.phone?.includes(ownerSearchQuery) ||
      client.email?.toLowerCase().includes(query)
    );
  }, [allClients, ownerSearchQuery]);

  // טעינת מטופלים של הלקוח שנבחר
  const { data: clientPatients = [] } = useQuery({
    queryKey: ['clientPatients', selectedClient?.client_number],
    queryFn: async () => {
      if (!selectedClient?.client_number) return [];
      return base44.entities.Patient.filter({ client_number: selectedClient.client_number });
    },
    enabled: !!selectedClient?.client_number,
  });

  // Check if protocol is editable based on date
  const protocolIsToday = isToday(protocolCreatedDate);
  const isAdmin = currentUser?.role === 'admin';
  const effectiveReadOnly = isReadOnly || (!protocolIsToday && !isAdmin);

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Track who filled this field
    if (currentUser && value !== undefined && value !== null && value !== '') {
      setFieldMetadata(prev => ({
        ...prev,
        [fieldName]: {
          filled_by: currentUser.email,
          filled_by_name: currentUser.display_name || currentUser.full_name,
          filled_date: new Date().toISOString()
        }
      }));
    }
  };

  const handleOwnerSelect = (client) => {
    setSelectedClient(client);
    setFormData(prev => ({ 
      ...prev, 
      owner_name: client.full_name,
      client_number: client.client_number,
      client_consent_name: client.full_name
    }));
    setOwnerSearchQuery(client.full_name);
    setShowOwnerSuggestions(false);
    
    // Track field metadata
    if (currentUser) {
      setFieldMetadata(prev => ({
        ...prev,
        owner_name: {
          filled_by: currentUser.email,
          filled_by_name: currentUser.display_name || currentUser.full_name,
          filled_date: new Date().toISOString()
        },
        client_number: {
          filled_by: currentUser.email,
          filled_by_name: currentUser.display_name || currentUser.full_name,
          filled_date: new Date().toISOString()
        },
        client_consent_name: {
          filled_by: currentUser.email,
          filled_by_name: currentUser.display_name || currentUser.full_name,
          filled_date: new Date().toISOString()
        }
      }));
    }
  };

  // מציג עד 20 תוצאות מה-API (לא צריך סינון מקומי יותר)
  const filteredClients = clients.slice(0, 20);

  // סגירת תפריט ההשלמה בלחיצה מחוץ לו
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#owner_name') && !e.target.closest('.owner-suggestions')) {
        setShowOwnerSuggestions(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSectionSave = () => {
    if (onPartialSave) {
      onPartialSave({ ...formData, field_metadata: fieldMetadata });
    }
  };

  const handleConsentConfirm = () => {
    if (onPartialSave) {
      onPartialSave({ ...formData, consent_agreed: true, field_metadata: fieldMetadata });
    }
    setIsConsentLocked(true);
  };

  const isFieldLocked = (fieldName) => {
    const metadata = fieldMetadata[fieldName];
    if (!metadata || !metadata.filled_by) return false;
    return metadata.filled_by !== currentUser?.email;
  };

  const getFieldLockedBy = (fieldName) => {
    const metadata = fieldMetadata[fieldName];
    return metadata?.filled_by_name || 'משתמש אחר';
  };

  const renderField = (field) => {
    const locked = !effectiveReadOnly && isFieldLocked(field.name);
    const fieldDisabled = effectiveReadOnly || locked;
    
    // שדה מיוחד: מספר תיק - תמיד מוצג מהלקוח שנבחר
    if (field.name === 'client_number' || field.label === 'מספר תיק') {
      return (
        <Input 
          id={field.name} 
          value={formData.client_number || ''} 
          disabled={true}
          className="bg-gray-100"
        />
      );
    }

    // שדה מיוחד: שם החיה - תפריט נפתח אם נבחר לקוח
    if ((field.name === 'animal_name' || field.label === 'שם החיה') && selectedClient && clientPatients.length > 0) {
      return (
        <Select 
          onValueChange={value => {
            const patient = clientPatients.find(p => p.name === value);
            setSelectedPatient(patient);
            handleChange(field.name, value);
            if (patient) {
              handleChange('animal_type', patient.species);
              handleChange('animal_species', patient.species);
            }
          }} 
          value={formData[field.name]} 
          disabled={fieldDisabled}
        >
          <SelectTrigger><SelectValue placeholder="בחר/י חיה" /></SelectTrigger>
          <SelectContent>
            {clientPatients.map(patient => (
              <SelectItem key={patient.id} value={patient.name}>
                {patient.name} ({patient.species})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // שדה מיוחד: סוג החיה - אם נבחר מטופל, הצג את הסוג שלו
    if ((field.name === 'animal_type' || field.name === 'animal_species' || field.label === 'סוג החיה') && selectedPatient) {
      return (
        <Input 
          id={field.name} 
          value={selectedPatient.species || formData[field.name] || ''} 
          disabled={true}
          className="bg-gray-100"
        />
      );
    }
    
    const fieldElement = (() => {
      switch (field.type) {
        case 'title':
          if (field.name && field.name.endsWith('_warning')) {
               return <WarningMessage message={field.label} />;
          }
          return null; 
        case 'textarea':
          return <Textarea id={field.name} value={formData[field.name] || ''} onChange={e => handleChange(field.name, e.target.value)} disabled={fieldDisabled} />;
        case 'number':
          return <Input id={field.name} type="number" value={formData[field.name] || ''} onChange={e => handleChange(field.name, e.target.value)} disabled={fieldDisabled} />;
        case 'time':
          return <Input id={field.name} type="time" value={formData[field.name] || ''} onChange={e => handleChange(field.name, e.target.value)} disabled={fieldDisabled} />;
        case 'select':
          const isYesNoField = field.options && 
            field.options.length === 2 && 
            ((field.options.includes('כן') || field.options.includes('yes') || field.options.includes('Yes')) && 
             (field.options.includes('לא') || field.options.includes('no') || field.options.includes('No')));
          
          if (isYesNoField) {
            const yesOption = field.options.find(opt => opt === 'כן' || opt.toLowerCase() === 'yes') || field.options[0];
            const noOption = field.options.find(opt => opt === 'לא' || opt.toLowerCase() === 'no') || field.options[1];
            const currentValue = formData[field.name];
            
            return (
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => handleChange(field.name, yesOption)}
                  disabled={fieldDisabled}
                  className={`flex-1 ${
                    currentValue === yesOption 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  כן
                </Button>
                <Button
                  type="button"
                  onClick={() => handleChange(field.name, noOption)}
                  disabled={fieldDisabled}
                  className={`flex-1 ${
                    currentValue === noOption 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  לא
                </Button>
              </div>
            );
          }
          
          return (
            <Select onValueChange={value => handleChange(field.name, value)} value={formData[field.name]} disabled={fieldDisabled}>
              <SelectTrigger><SelectValue placeholder="בחר/י" /></SelectTrigger>
              <SelectContent>
                {(field.options || []).map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          );
        case 'text':
        default:
          return <Input id={field.name} value={formData[field.name] || ''} onChange={e => handleChange(field.name, e.target.value)} disabled={fieldDisabled} />;
      }
    })();

    if (locked) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                {fieldElement}
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>שדה זה מולא על ידי: {getFieldLockedBy(field.name)}</p>
              <p className="text-xs">רק הם יכולים לערוך אותו</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return fieldElement;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed) {
      alert("יש לאשר שהנתונים שהוזנו נכונים ומדויקים.");
      return;
    }
    onSubmit({ ...formData, field_metadata: fieldMetadata });
  };
  
  const sections = [];
  let currentSection = { title: "פרטים כלליים", fields: [] };

  template.fields.forEach(field => {
      if (field.type === 'title' && !(field.name && field.name.endsWith('_warning'))) {
          if (currentSection.fields.length > 0 || currentSection.title !== "פרטים כלליים") {
              sections.push(currentSection);
          }
          currentSection = { title: field.label, fields: [] };
      } else {
          currentSection.fields.push(field);
      }
  });
  if (currentSection.fields.length > 0 || currentSection.title !== "פרטים כלליים") {
      sections.push(currentSection);
  }

  const isSurgeryProtocol = template.name && (
    template.name.includes('ניתוח') || 
    template.name.includes('חדר ניתוח') || 
    template.name.toLowerCase().includes('surgery') ||
    template.name.toLowerCase().includes('operation') ||
    template.name.toLowerCase().includes('הרדמה')
  );

  // Find the index of animal/owner details section (usually first section)
  const animalDetailsIndex = 0; // Usually the first section contains animal details

  const preProcedureIndex = sections.findIndex(s => 
    s.title.includes('טרום') || s.title.includes('לפני') || s.title.toLowerCase().includes('pre') || s.title.includes('הכנה')
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-right">
      {/* Date-based access warning */}
      {!protocolIsToday && !isAdmin && (
        <Alert className="border-orange-300 bg-orange-50">
          <Calendar className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 font-bold">פרוטוקול נעול לעריכה</AlertTitle>
          <AlertDescription className="text-orange-800">
            פרוטוקול זה נוצר בתאריך {new Date(protocolCreatedDate).toLocaleDateString('he-IL')} ולכן אינו זמין לעריכה.
            ניתן לערוך פרוטוקולים רק באותו יום בו נוצרו.
          </AlertDescription>
        </Alert>
      )}
      

      
      {/* Render animal details section FIRST if it's a surgery protocol */}
      {isSurgeryProtocol && sections[animalDetailsIndex] && (
        <ProtocolSection 
          key={`animal-details-section`} 
          title={sections[animalDetailsIndex].title}
          onSave={!effectiveReadOnly ? handleSectionSave : null}
          canSave={true}
          isReadOnly={effectiveReadOnly}
        >
            {/* שדה שם הבעלים עם השלמה אוטומטית */}
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
              <Label htmlFor="owner_name" className="font-medium text-gray-700">שם הבעלים</Label>
              <div className="relative">
                <Input
                  id="owner_name"
                  value={ownerSearchQuery}
                  onChange={(e) => {
                    setOwnerSearchQuery(e.target.value);
                    handleChange('owner_name', e.target.value);
                    setShowOwnerSuggestions(true);
                  }}
                  onFocus={() => setShowOwnerSuggestions(true)}
                  disabled={effectiveReadOnly}
                  placeholder="הזן שם בעלים..."
                />
                {showOwnerSuggestions && filteredClients.length > 0 && ownerSearchQuery && !effectiveReadOnly && (
                  <div className="owner-suggestions absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredClients.map((client) => (
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

            {sections[animalDetailsIndex].fields.map((field, idx, arr) => {
                const isWarning = field.type === 'title' && field.name?.endsWith('_warning');
                
                if (isWarning) return null;

                const nextField = arr[idx + 1];
                const warningForThisField = nextField?.type === 'title' && nextField?.name?.endsWith('_warning');
                
                return (
                    <div key={field.name} className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                      <div className="flex flex-col gap-2">
                         <Label htmlFor={field.name} className="font-medium text-gray-700">{field.label}</Label>
                         {warningForThisField && renderField(nextField)}
                      </div>
                      {renderField(field)}
                    </div>
                );
            })}
        </ProtocolSection>
      )}
      
      {/* Then render consent section */}
      {isSurgeryProtocol && (
        <ConsentSection 
          formData={formData} 
          handleChange={handleChange} 
          isReadOnly={effectiveReadOnly} 
          onSave={handleSectionSave}
          onConsentConfirm={handleConsentConfirm}
          isConsentLocked={isConsentLocked}
        />
      )}
      
      {/* Render remaining sections */}
      {sections.map((section, index) => {
        // Skip the first section if surgery protocol (already rendered above)
        if (isSurgeryProtocol && index === animalDetailsIndex) {
          return null;
        }

        const sectionElement = (
          <ProtocolSection 
            key={`section-${index}`} 
            title={section.title}
            onSave={!effectiveReadOnly ? handleSectionSave : null}
            canSave={true}
            isReadOnly={effectiveReadOnly}
          >
              {section.fields.map((field, idx, arr) => {
                  const isWarning = field.type === 'title' && field.name?.endsWith('_warning');
                  
                  if (isWarning) return null;

                  const nextField = arr[idx + 1];
                  const warningForThisField = nextField?.type === 'title' && nextField?.name?.endsWith('_warning');
                  
                  return (
                      <div key={field.name} className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                        <div className="flex flex-col gap-2">
                           <Label htmlFor={field.name} className="font-medium text-gray-700">{field.label}</Label>
                           {warningForThisField && renderField(nextField)}
                      </div>
                      {renderField(field)}
                    </div>
                  );
              })}
          </ProtocolSection>
        );

        if (isSurgeryProtocol && preProcedureIndex >= 0 && index === preProcedureIndex) {
          return (
            <React.Fragment key={`section-with-monitoring-${index}`}>
              {sectionElement}
              <AnesthesiaMonitoringSection 
                formData={formData} 
                handleChange={handleChange} 
                isReadOnly={effectiveReadOnly} 
                onSave={handleSectionSave}
                currentUser={currentUser}
                fieldMetadata={fieldMetadata}
              />
            </React.Fragment>
          );
        }

        return sectionElement;
      })}

      {!effectiveReadOnly ? (
        <div className="pt-6 border-t space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse justify-end">
              <Checkbox id="confirmation" checked={isConfirmed} onCheckedChange={setIsConfirmed} />
              <label htmlFor="confirmation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  אני <span className="text-blue-600 font-semibold">{currentUser?.display_name || currentUser?.full_name || 'משתמש'}</span> מאשר/ת כי ליוויתי את הפרוצדורה במלואה והנתונים שהזנתי, נכונים ומדויקים.
              </label>
          </div>

          <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 ml-2"/>ביטול</Button>
              <Button type="submit" disabled={!isConfirmed}><Save className="w-4 h-4 ml-2"/>שמור</Button>
          </div>
        </div>
      ) : (
         <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 ml-2"/>סגור</Button>
         </div>
      )}
    </form>
  );
}