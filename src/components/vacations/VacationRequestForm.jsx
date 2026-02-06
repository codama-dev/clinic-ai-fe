import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, AlertTriangle, Upload, FileText, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO, startOfYear, endOfYear, eachDayOfInterval, getDay } from "date-fns";
import { he } from "date-fns/locale";
import { VacationRequest } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Helper function to calculate business days (excluding Friday and Saturday)
const calculateBusinessDays = (startDate, endDate) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => {
    const dayOfWeek = getDay(day);
    return dayOfWeek !== 5 && dayOfWeek !== 6; // 5 = Friday, 6 = Saturday
  }).length;
};

export default function VacationRequestForm({ request, onSubmit, onCancel, currentUser }) {
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    vacation_type: "regular",
    medical_document_url: "",
  });
  const [error, setError] = useState("");
  const [vacationStats, setVacationStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [showUnpaidWarning, setShowUnpaidWarning] = useState(false);
  const [unpaidDaysCount, setUnpaidDaysCount] = useState(0);

  useEffect(() => {
    if (request) {
      setFormData({
        start_date: request.start_date ? format(new Date(request.start_date), 'yyyy-MM-dd') : "",
        end_date: request.end_date ? format(new Date(request.end_date), 'yyyy-MM-dd') : "",
        reason: request.reason || "",
        vacation_type: request.vacation_type || "regular",
        medical_document_url: request.medical_document_url || "",
      });
      if (request.medical_document_url) {
        setUploadedFileName("מסמך רפואי מצורף");
      }
    } else {
      setFormData({ 
        start_date: "", 
        end_date: "", 
        reason: "", 
        vacation_type: "regular",
        medical_document_url: "",
      });
      setUploadedFileName("");
    }
  }, [request]);

  useEffect(() => {
    if (currentUser) {
      loadVacationStats();
    }
  }, [currentUser]);

  const loadVacationStats = async () => {
    if (!currentUser) return;
    
    setIsLoadingStats(true);
    try {
      const hireDate = currentUser.hire_date ? parseISO(currentUser.hire_date) : new Date();
      const now = new Date();
      const yearsEmployed = Math.floor((now - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
      
      // Calculate accumulated vacation days based on accumulation period
      const accumulationYears = currentUser.vacation_accumulation_years ?? 3;
      const annualVacationDays = currentUser.annual_vacation_days ?? 12;
      const totalAccumulatedAllowance = Math.min(yearsEmployed + 1, accumulationYears) * annualVacationDays;
      
      // Fetch all approved vacation requests for this user (regular type only, not sick leave)
      const allRequests = await VacationRequest.filter({ 
        employee_id: currentUser.id,
        status: 'approved',
        vacation_type: 'regular'
      });
      
      // Filter requests within the accumulation period
      const relevantRequests = allRequests.filter(req => {
        const reqDate = parseISO(req.start_date);
        const yearsAgo = new Date(now);
        yearsAgo.setFullYear(yearsAgo.getFullYear() - accumulationYears);
        return reqDate >= yearsAgo;
      });
      
      const usedDays = relevantRequests.reduce((sum, req) => sum + (req.total_days || 0), 0);
      const remainingDays = totalAccumulatedAllowance - usedDays;
      
      // Fetch sick leave stats separately
      const sickLeaveRequests = await VacationRequest.filter({ 
        employee_id: currentUser.id,
        status: 'approved',
        vacation_type: 'sick_leave'
      });
      
      const currentYear = new Date().getFullYear();
      const thisYearSickLeave = sickLeaveRequests.filter(req => {
        const reqYear = parseISO(req.start_date).getFullYear();
        return reqYear === currentYear;
      });
      
      const usedSickDays = thisYearSickLeave.reduce((sum, req) => sum + (req.total_days || 0), 0);
      const allowedSickDays = currentUser.sick_leave_days ?? 18;
      const remainingSickDays = allowedSickDays - usedSickDays;
      
      setVacationStats({
        allowed: totalAccumulatedAllowance,
        used: usedDays,
        remaining: remainingDays,
        sickAllowed: allowedSickDays,
        sickUsed: usedSickDays,
        sickRemaining: remainingSickDays,
        accumulationYears
      });
    } catch (error) {
      console.error("Error loading vacation stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError("יש להעלות קובץ PDF או תמונה (JPG/PNG) בלבד");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("גודל הקובץ חייב להיות עד 5MB");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, medical_document_url: file_url });
      setUploadedFileName(file.name);
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("שגיאה בהעלאת הקובץ. נסה שוב.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    
    if (!formData.start_date || !formData.end_date) {
        setError("יש למלא תאריך התחלה וסיום");
        return;
    }
    
    // Validate medical document for sick leave
    if (formData.vacation_type === "sick_leave" && !formData.medical_document_url) {
        setError("חובה לצרף אישור רפואי לבקשת חופשת מחלה");
        return;
    }
    
    const startDate = parseISO(formData.start_date);
    const endDate = parseISO(formData.end_date);
    
    if (endDate < startDate) {
        setError("תאריך הסיום חייב להיות אחרי תאריך ההתחלה");
        return;
    }
    
    const requestedDays = calculateBusinessDays(startDate, endDate);
    
    // Check vacation eligibility for regular vacation (not sick leave or unpaid leave)
    if (formData.vacation_type === "regular" && vacationStats && !request) {
      if (requestedDays > vacationStats.remaining) {
        const excessDays = requestedDays - vacationStats.remaining;
        setUnpaidDaysCount(excessDays);
        setShowUnpaidWarning(true);
        return;
      }
    }
    
    // Unpaid leave doesn't deduct from vacation balance - just submit as-is
    if (formData.vacation_type === "unpaid_leave") {
      onSubmit(formData);
      return;
    }
    
    // Check sick leave eligibility
    if (formData.vacation_type === "sick_leave" && vacationStats && !request) {
      if (requestedDays > vacationStats.sickRemaining) {
        setError(`חרגת ממספר ימי המחלה הזמינים. ביקשת ${requestedDays} ימים אך נותרו רק ${vacationStats.sickRemaining} ימי מחלה. יש לפנות להנהלה.`);
        return;
      }
    }
    
    onSubmit(formData);
  };
  
  const handleConfirmUnpaid = () => {
    const requestData = {
      ...formData,
      unpaid_days: unpaidDaysCount
    };
    setShowUnpaidWarning(false);
    onSubmit(requestData);
  };

  const isSickLeave = formData.vacation_type === "sick_leave";
  const isUnpaidLeave = formData.vacation_type === "unpaid_leave";

  // Calculate business days for display
  const displayBusinessDays = formData.start_date && formData.end_date 
    ? calculateBusinessDays(parseISO(formData.start_date), parseISO(formData.end_date))
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       {!isLoadingStats && vacationStats && (
         <>
           <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
             <h4 className="font-semibold text-blue-900 text-sm sm:text-base">מאזן ימי חופש (צבירה {vacationStats.accumulationYears} שנים)</h4>
             <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
               <div>
                 <p className="text-xs text-gray-600">זכאות מצטברת</p>
                 <p className="text-xl sm:text-2xl font-bold text-blue-700">{vacationStats.allowed}</p>
               </div>
               <div>
                 <p className="text-xs text-gray-600">נוצלו</p>
                 <p className="text-xl sm:text-2xl font-bold text-orange-600">{vacationStats.used}</p>
               </div>
               <div>
                 <p className="text-xs text-gray-600">יתרה</p>
                 <p className="text-xl sm:text-2xl font-bold text-green-600">{vacationStats.remaining}</p>
               </div>
             </div>
           </div>
           
           <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
             <h4 className="font-semibold text-red-900 text-sm sm:text-base">מאזן ימי מחלה (שנה זו)</h4>
             <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
               <div>
                 <p className="text-xs text-gray-600">זכאות שנתית</p>
                 <p className="text-xl sm:text-2xl font-bold text-red-700">{vacationStats.sickAllowed}</p>
               </div>
               <div>
                 <p className="text-xs text-gray-600">נוצלו</p>
                 <p className="text-xl sm:text-2xl font-bold text-orange-600">{vacationStats.sickUsed}</p>
               </div>
               <div>
                 <p className="text-xs text-gray-600">יתרה</p>
                 <p className="text-xl sm:text-2xl font-bold text-green-600">{vacationStats.sickRemaining}</p>
               </div>
             </div>
             <p className="text-xs text-gray-500 text-center mt-2">* ימי חופש ומחלה נספרים ללא שישי ושבת</p>
           </div>
         </>
       )}
       
       <div>
         <Label htmlFor="vacation_type" className="text-sm sm:text-base">סוג בקשה *</Label>
         <Select 
           value={formData.vacation_type} 
           onValueChange={(value) => {
             setFormData({...formData, vacation_type: value});
             // Clear medical document if switching to regular vacation
             if (value === "regular") {
               setFormData({...formData, vacation_type: value, medical_document_url: ""});
               setUploadedFileName("");
             }
           }}
         >
           <SelectTrigger>
             <SelectValue placeholder="בחר סוג בקשה" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="regular">חופשה רגילה</SelectItem>
             <SelectItem value="sick_leave">חופשת מחלה</SelectItem>
             <SelectItem value="unpaid_leave">חופשה ללא תשלום (חל"ת)</SelectItem>
           </SelectContent>
         </Select>
       </div>
       
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="start_date" className="text-sm sm:text-base">תאריך התחלה *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start_date"
                      variant="outline"
                      className="w-full justify-start text-right font-normal"
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {formData.start_date ? format(parseISO(formData.start_date), 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.start_date ? parseISO(formData.start_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({...formData, start_date: format(date, 'yyyy-MM-dd')});
                        }
                      }}
                      locale={he}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
            </div>
            <div>
                <Label htmlFor="end_date" className="text-sm sm:text-base">תאריך סיום *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end_date"
                      variant="outline"
                      className="w-full justify-start text-right font-normal"
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {formData.end_date ? format(parseISO(formData.end_date), 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.end_date ? parseISO(formData.end_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({...formData, end_date: format(date, 'yyyy-MM-dd')});
                        }
                      }}
                      locale={he}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
            </div>
       </div>
       
       {formData.start_date && formData.end_date && (
         <div className={`p-3 border rounded-md ${isSickLeave ? 'bg-red-50 border-red-200' : isUnpaidLeave ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
           <p className="text-sm text-gray-700">
             <strong>סך ימי העבודה המבוקשים: </strong>
             {displayBusinessDays} ימים
           </p>
           <p className="text-xs text-gray-500 mt-1">
             * לא כולל ימי שישי ושבת
           </p>
           {isSickLeave && (
             <p className="text-xs text-red-600 mt-1">
               * חופשת מחלה אינה מנוכה ממאזן ימי החופש השנתי
             </p>
           )}
           {isUnpaidLeave && (
             <p className="text-xs text-orange-600 mt-1">
               * חופשה ללא תשלום (חל"ת) - אינה מנוכה ממאזן ימי החופש השנתי
             </p>
           )}
         </div>
       )}
       
       {isSickLeave && (
         <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
           <div className="flex items-center gap-2">
             <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
             <Label className="text-orange-900 font-semibold text-sm sm:text-base">אישור רפואי (חובה) *</Label>
           </div>
           <p className="text-xs sm:text-sm text-orange-700">
             יש לצרף אישור רפואי בפורמט PDF, JPG או PNG (עד 5MB)
           </p>
           <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
             <Input
               type="file"
               accept=".pdf,.jpg,.jpeg,.png"
               onChange={handleFileUpload}
               disabled={isUploading}
               className="hidden"
               id="medical-doc-upload"
             />
             <Label
               htmlFor="medical-doc-upload"
               className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-orange-300 rounded-md hover:bg-orange-50 transition-colors text-sm"
             >
               {isUploading ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span>מעלה...</span>
                 </>
               ) : (
                 <>
                   <Upload className="w-4 h-4" />
                   <span>בחר קובץ</span>
                 </>
               )}
             </Label>
             {uploadedFileName && (
               <div className="flex items-center gap-2 text-xs sm:text-sm text-green-700 break-all">
                 <FileText className="w-4 h-4 flex-shrink-0" />
                 <span>{uploadedFileName}</span>
               </div>
             )}
           </div>
           {formData.medical_document_url && (
             <a 
               href={formData.medical_document_url} 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-xs sm:text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
             >
               <FileText className="w-4 h-4" />
               צפה במסמך המצורף
             </a>
           )}
         </div>
       )}
       
       <div>
            <Label htmlFor="reason" className="text-sm sm:text-base">סיבה {isSickLeave ? '(אופציונלי)' : ''}</Label>
            <Textarea 
              id="reason" 
              placeholder={isSickLeave ? "פרטים נוספים (אופציונלי)..." : "לדוגמה: חופשה משפחתית, טיול וכו'..."} 
              value={formData.reason} 
              onChange={e => setFormData({...formData, reason: e.target.value})} 
              className="min-h-[80px] text-sm"
            />
       </div>
       
       {error && (
         <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
           <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
           <p className="text-xs sm:text-sm text-red-700">{error}</p>
         </div>
       )}
       
       <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 sticky bottom-0 bg-white pb-2 sm:pb-0 border-t sm:border-t-0 -mx-6 px-6 sm:mx-0 sm:px-0">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              <X className="w-4 h-4 ml-2"/>ביטול
            </Button>
            <Button type="submit" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700" disabled={isUploading}>
              <Save className="w-4 h-4 ml-2"/>
              {request ? 'עדכן בקשה' : 'הגש בקשה'}
            </Button>
       </div>
       
       {showUnpaidWarning && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
             <div className="flex items-start gap-3">
               <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
               <div className="flex-1">
                 <h3 className="font-bold text-lg text-gray-900 mb-2">אזהרה: חריגה מיתרת ימי חופש</h3>
                 <p className="text-sm text-gray-700 mb-3">
                   ביקשת מספר ימים החורג מיתרת ימי החופש הזמינים לך.
                 </p>
                 <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                   <p className="text-sm font-semibold text-orange-900 mb-2">
                     {unpaidDaysCount} ימים יסומנו כחופשה ללא תשלום (חל"ת)
                   </p>
                   <div className="text-xs text-orange-700 space-y-1">
                     <p>• יתרת ימי חופש זמינים: {vacationStats?.remaining || 0}</p>
                     <p>• ימים מבוקשים: {displayBusinessDays}</p>
                     <p>• ימים ללא תשלום: {unpaidDaysCount}</p>
                   </div>
                 </div>
                 <p className="text-xs text-gray-600 mb-4">
                   הבקשה תישלח לאישור מנהל/אדמין. האם ברצונך להמשיך?
                 </p>
               </div>
             </div>
             <div className="flex gap-2 justify-end">
               <Button 
                 type="button" 
                 variant="outline" 
                 onClick={() => {
                   setShowUnpaidWarning(false);
                   setUnpaidDaysCount(0);
                 }}
               >
                 ביטול
               </Button>
               <Button 
                 type="button"
                 onClick={handleConfirmUnpaid}
                 className="bg-orange-600 hover:bg-orange-700"
               >
                 אישור והגשה
               </Button>
             </div>
           </div>
         </div>
       )}
    </form>
  );
}