import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { FileText, Download, Calendar, Loader2, ShieldAlert, FileDown, Pill, BedDouble, PackagePlus, FileSignature, Clock, CalendarDays, CalendarRange, ChevronDown, ChevronUp, Sun, Moon, PhoneCall, Plane, CheckCircle2, Syringe, ShoppingCart, Package, Save, X } from 'lucide-react';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, addDays, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import ReportPDFLayout from '../components/reports/ReportPDFLayout';
import ProtocolPDFLayout from '../components/protocols/ProtocolPDFLayout';
import HospitalizationPDFLayout from '../components/hospitalization/HospitalizationPDFLayout';
import OrderPDFLayout from '../components/orders/OrderPDFLayout';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient, useMutation } from '@tanstack/react-query';

const REPORT_TYPES = [
  { value: 'employees', label: 'דוח עובדים' },
  { value: 'protocols', label: 'דוח פרוטוקולי חדר ניתוח' },
  { value: 'hospitalization', label: 'דוח אשפוזים' },
  { value: 'inventory', label: 'דוח מלאי' },
  { value: 'orders', label: 'דוח הזמנות' }
];

const QUICK_DATE_RANGES = [
  {
    value: 'today',
    label: 'היום',
    icon: Clock,
    getRange: () => ({
      start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
      end: format(endOfDay(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    value: 'yesterday',
    label: 'אתמול',
    icon: Clock,
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return {
        start: format(startOfDay(yesterday), 'yyyy-MM-dd'),
        end: format(endOfDay(yesterday), 'yyyy-MM-dd')
      };
    }
  },
  {
    value: 'currentWeek',
    label: 'שבוע נוכחי',
    icon: CalendarDays,
    getRange: () => ({
      start: format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    })
  },
  {
    value: 'currentMonth',
    label: 'חודש נוכחי',
    icon: CalendarRange,
    getRange: () => ({
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    value: 'previousMonth',
    label: 'חודש קודם',
    icon: CalendarRange,
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      };
    }
  },
  {
    value: 'currentYear',
    label: 'שנה נוכחית',
    icon: Calendar,
    getRange: () => ({
      start: format(startOfYear(new Date()), 'yyyy-MM-dd'),
      end: format(endOfYear(new Date()), 'yyyy-MM-dd')
    })
  }
];

const STATUS_HE = {
  pending: "ממתינה",
  processing: "בעיבוד",
  shipped: "נשלחה",
  delivered: "הושלמה",
  cancelled: "בוטלה",
  active: "פעיל",
  discharged: "שוחרר",
  deceased: "נפטר",
  needed: "נדרש",
  ordered: "הוזמן",
  stocked: "במלאי"
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  active: "bg-green-100 text-green-800",
  discharged: "bg-blue-100 text-blue-800",
  deceased: "bg-gray-100 text-gray-800",
  needed: "bg-orange-100 text-orange-800",
  ordered: "bg-blue-100 text-blue-800",
  stocked: "bg-green-100 text-green-800"
};

const DAYS_HE = {
  sunday: "יום א'", monday: "יום ב'", tuesday: "יום ג'",
  wednesday: "יום ד'", thursday: "יום ה'", friday: "יום ו'", saturday: "שבת"
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState('employees');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportToPrint, setReportToPrint] = useState(null);
  const [selectedQuickRange, setSelectedQuickRange] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());
  const [expandedHospitalizations, setExpandedHospitalizations] = useState(new Set());
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [protocolToPrint, setProtocolToPrint] = useState(null);
  const [hospitalizationToPrint, setHospitalizationToPrint] = useState(null);
  const [orderToPrint, setOrderToPrint] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingTimeClockEntry, setEditingTimeClockEntry] = useState(null);

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('view_reports');
  
  const queryClient = useQueryClient();

  const updateTimeClockMutation = useMutation({
    mutationFn: async ({ entryId, data }) => {
      if (entryId) {
        return await base44.entities.TimeClockEntry.update(entryId, data);
      } else {
        return await base44.entities.TimeClockEntry.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allTimeClockEntries']);
      setEditingTimeClockEntry(null);
    }
  });

  const handleSaveTimeClock = () => {
    if (!editingTimeClockEntry) return;

    const clockIn = editingTimeClockEntry.clockIn;
    const clockOut = editingTimeClockEntry.clockOut;

    if (!clockIn) {
      alert('יש להזין שעת כניסה');
      return;
    }

    // Calculate total hours if both times exist
    let totalHours = null;
    if (clockIn && clockOut) {
      const [inHours, inMinutes] = clockIn.split(':').map(Number);
      const [outHours, outMinutes] = clockOut.split(':').map(Number);
      const inTotalMinutes = inHours * 60 + inMinutes;
      const outTotalMinutes = outHours * 60 + outMinutes;
      let diffMinutes = outTotalMinutes - inTotalMinutes;
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      totalHours = (diffMinutes / 60).toFixed(2);
    }

    const data = {
      employee_email: editingTimeClockEntry.employeeEmail,
      employee_name: editingTimeClockEntry.employeeName,
      date: editingTimeClockEntry.date,
      clock_in_time: clockIn,
      clock_out_time: clockOut || '',
      shift_type: editingTimeClockEntry.shiftType,
      total_hours: totalHours,
      status: clockOut ? 'clocked_out' : 'clocked_in'
    };

    updateTimeClockMutation.mutate({
      entryId: editingTimeClockEntry.entryId,
      data
    });
  };

  // Fetch employees data
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['publicProfiles'],
    queryFn: () => base44.entities.PublicProfile.list(),
    enabled: hasAccess && reportType === 'employees',
  });

  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['allSchedules'],
    queryFn: () => base44.entities.WeeklySchedule.list(),
    enabled: hasAccess && reportType === 'employees',
  });

  const { data: vacations = [], isLoading: isLoadingVacations } = useQuery({
    queryKey: ['allVacations'],
    queryFn: () => base44.entities.VacationRequest.list(),
    enabled: hasAccess && reportType === 'employees',
  });

  const { data: timeClockEntries = [], isLoading: isLoadingTimeClock } = useQuery({
    queryKey: ['allTimeClockEntries'],
    queryFn: () => base44.entities.TimeClockEntry.list('-date', 5000),
    enabled: hasAccess && reportType === 'employees',
  });

  // Fetch protocols data
  const { data: protocols = [], isLoading: isLoadingProtocols } = useQuery({
    queryKey: ['filledProtocols'],
    queryFn: () => base44.entities.FilledProtocol.list('-created_date'),
    enabled: hasAccess && reportType === 'protocols',
  });

  // Fetch protocol templates for rendering PDFs
  const { data: protocolTemplates = [] } = useQuery({
    queryKey: ['protocolTemplates'],
    queryFn: () => base44.entities.ProtocolTemplate.list(),
    enabled: hasAccess && reportType === 'protocols',
  });

  // Fetch hospitalization data
  const { data: hospitalizations = [], isLoading: isLoadingHospitalizations } = useQuery({
    queryKey: ['hospitalizedAnimals'],
    queryFn: () => base44.entities.HospitalizedAnimal.list('-created_date'),
    enabled: hasAccess && reportType === 'hospitalization',
  });

  // Fetch treatment executions for hospitalization report
  const { data: treatmentExecutions = [], isLoading: isLoadingTreatmentExecutions } = useQuery({
    queryKey: ['treatmentExecutions'],
    queryFn: () => base44.entities.TreatmentExecution.list('-execution_time'),
    enabled: hasAccess && reportType === 'hospitalization',
  });

  // Fetch inventory shortages
  const { data: inventoryShortages = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventoryShortages'],
    queryFn: () => base44.entities.InventoryShortage.list('-created_date'),
    enabled: hasAccess && reportType === 'inventory',
  });

  // Fetch orders data
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-order_date'),
    enabled: hasAccess && reportType === 'orders',
  });

  const handleQuickDateRange = (rangeValue) => {
    const range = QUICK_DATE_RANGES.find(r => r.value === rangeValue);
    if (range) {
      const { start, end } = range.getRange();
      setStartDate(start);
      setEndDate(end);
      setSelectedQuickRange(rangeValue);
      setReportGenerated(false);
    }
  };

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      alert('יש לבחור טווח תאריכים');
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
    }, 500);
  };

  const handleDownloadReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";

    if (reportType === 'employees') {
      csvContent += "שם עובד,תפקיד,סך משמרות,כוננות סופ\"ש,ימי חופשה\n";
      employeeReportData.forEach(emp => {
        csvContent += `"${emp.name}","${emp.job}",${emp.totalShifts},${emp.weekendShifts},${emp.vacationDays}\n`;
      });
    } else if (reportType === 'protocols') {
      csvContent += "תאריך,שם תבנית,שם מטופל,נרשם על ידי,הסכמה אושרה\n";
      protocolReportData.forEach(protocol => {
        csvContent += `"${protocol.date}","${protocol.templateName}","${protocol.patientName}","${protocol.consentAgreed ? 'כן' : 'לא'}"\n`;
      });
    } else if (reportType === 'hospitalization') {
      csvContent += "תאריך אשפוז,שם החיה,בעלים,סוג,סטטוס,משקל בהגעה,אבחנות,סך טיפולים מבוצעים\n";
      hospitalizationReportData.forEach(hosp => {
        csvContent += `"${hosp.admissionDate}","${hosp.animalName}","${hosp.ownerName}","${hosp.animalType}","${hosp.status}",${hosp.admissionWeight},"${hosp.diagnoses}",${hosp.totalExecutions}\n`;
      });
    } else if (reportType === 'inventory') {
      csvContent += "תאריך דיווח,שם פריט,קטגוריה,כמות נדרשת,סטטוס,דווח על ידי\n";
      inventoryReportData.forEach(item => {
        csvContent += `"${item.reportDate}","${item.itemName}","${item.category}",${item.quantityNeeded},"${item.status}","${item.requestedBy}"\n`;
      });
    } else if (reportType === 'orders') {
      csvContent += "מספר הזמנה,תאריך,סכום,סטטוס,מספר פריטים\n";
      orderReportData.forEach(order => {
        csvContent += `${order.orderNumber},"${order.date}",${order.amount},"${order.status}",${order.itemCount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const reportNames = {
      employees: 'עובדים',
      protocols: 'פרוטוקולים',
      hospitalization: 'אשפוזים',
      inventory: 'מלאי',
      orders: 'הזמנות'
    };
    link.setAttribute("download", `דוח_${reportNames[reportType]}_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const dataMap = {
      employees: employeeReportData,
      protocols: protocolReportData,
      hospitalization: hospitalizationReportData,
      inventory: inventoryReportData,
      orders: orderReportData
    };

    setReportToPrint({
      type: reportType,
      data: dataMap[reportType],
      startDate: startDate,
      endDate: endDate,
    });
  };

  const handlePrintProtocol = (protocolId) => {
    const protocol = protocols.find(p => p.id === protocolId);
    const template = protocolTemplates.find(t => t.id === protocol?.template_id);

    if (protocol && template) {
      setProtocolToPrint({ protocol, template });
    } else {
      console.error('Protocol or template not found for printing:', { protocolId, protocol, template });
      alert('לא ניתן להדפיס פרוטוקול זה. ייתכן שהתבנית המקורית אינה קיימת.');
    }
  };

  const handlePrintHospitalization = (hospId) => {
    const hosp = hospitalizations.find(h => h.id === hospId);
    const hospExecutions = treatmentExecutions.filter(exec => exec.animal_id === hospId);

    if (hosp) {
      setHospitalizationToPrint({ hospitalization: hosp, executions: hospExecutions });
    } else {
      console.error('Hospitalization not found for printing:', { hospId, hosp });
      alert('לא ניתן להדפיס דו"ח אשפוז זה. ייתכן שהנתונים אינם קיימים.');
    }
  };

  const toggleEmployeeExpand = (employeeName) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeName)) {
        newSet.delete(employeeName);
      } else {
        newSet.add(employeeName);
      }
      return newSet;
    });
  };

  const toggleHospitalizationExpand = (hospId) => {
    setExpandedHospitalizations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hospId)) {
        newSet.delete(hospId);
      } else {
        newSet.add(hospId);
      }
      return newSet;
    });
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handlePrintOrder = (orderId) => {
    const orderFromRawData = orders.find(o => o.id === orderId); // Get the original order
    const processedOrder = orderReportData.find(o => o.id === orderId); // Get the processed order for orderNumber and calculated amount

    if (orderFromRawData && processedOrder) {
      setOrderToPrint({
        ...orderFromRawData, // Use raw data for full details like items array
        orderNumber: processedOrder.orderNumber, // Use the calculated order number
        date: processedOrder.date, // Use the formatted date
        amount: processedOrder.amount, // Use the calculated amount
        status: orderFromRawData.status, // Use raw status for PDF layout to translate
        receivedBy: processedOrder.receivedBy,
        receivedDate: processedOrder.receivedDate,
        itemDetails: processedOrder.itemDetails, // Pass processed item details
      });
    } else {
      console.error('Order not found for printing:', { orderId, orderFromRawData, processedOrder });
      alert('לא ניתן להדפיס דו"ח הזמנה זה. ייתכן שהנתונים אינם קיימים.');
    }
  };

  // Filter function for search and filters
  const filterData = (data, type) => {
    if (!searchTerm && statusFilter === 'all' && categoryFilter === 'all') return data;
    
    return data.filter(item => {
      // Search term filter
      const searchLower = searchTerm.toLowerCase();
      let matchesSearch = true;
      
      if (searchTerm) {
        if (type === 'employees') {
          matchesSearch = item.name?.toLowerCase().includes(searchLower) ||
                         item.job?.toLowerCase().includes(searchLower);
        } else if (type === 'protocols') {
          matchesSearch = item.templateName?.toLowerCase().includes(searchLower) ||
                         item.patientName?.toLowerCase().includes(searchLower) ||
                         item.filledBy?.toLowerCase().includes(searchLower);
        } else if (type === 'hospitalization') {
          matchesSearch = item.animalName?.toLowerCase().includes(searchLower) ||
                         item.ownerName?.toLowerCase().includes(searchLower) ||
                         item.animalType?.toLowerCase().includes(searchLower);
        } else if (type === 'inventory') {
          matchesSearch = item.itemName?.toLowerCase().includes(searchLower) ||
                         item.category?.toLowerCase().includes(searchLower) ||
                         item.requestedBy?.toLowerCase().includes(searchLower);
        } else if (type === 'orders') {
          matchesSearch = item.orderNumber?.toString().includes(searchLower);
        }
      }
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all' && item.status) {
        // Handle Hebrew status matching
        const itemStatusHe = STATUS_HE[Object.keys(STATUS_HE).find(key => STATUS_HE[key] === item.status)] || item.status;
        matchesStatus = itemStatusHe === statusFilter;
      }
      
      // Category filter
      let matchesCategory = true;
      if (categoryFilter !== 'all' && item.category) {
        matchesCategory = item.category === categoryFilter;
      }
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  };

  // Calculate employee report data with NEW deduplication logic
  const employeeReportData = useMemo(() => {
    if (!reportGenerated || reportType !== 'employees' || !startDate || !endDate) return [];

    const interval = { start: parseISO(startDate), end: parseISO(endDate) };
    const activeEmployees = employees.filter(emp => emp.is_active !== false);

    return activeEmployees.map(emp => {
      let totalShifts = 0;
      let weekendOncallCount = 0;
      const oncallWeeks = [];
      const shiftDetailsMap = new Map(); // Key: `${dateRaw}-${shiftType}`, Value: shift detail object

      // STEP 1: Process scheduled shifts FIRST (schedule_data is the source of truth)
      schedules.forEach(schedule => {
        if (!schedule.schedule_data || !schedule.is_published) return;

        const weekStart = parseISO(schedule.week_start_date);
        if (!isWithinInterval(weekStart, interval)) return;

        // Weekend on-call
        if (schedule.schedule_data.weekend_oncall && Array.isArray(schedule.schedule_data.weekend_oncall)) {
          if (schedule.schedule_data.weekend_oncall.includes(emp.display_name)) {
            weekendOncallCount++;
            oncallWeeks.push({
              weekStart: format(weekStart, 'dd/MM/yyyy', { locale: he }),
              weekEnd: format(addDays(weekStart, 6), 'dd/MM/yyyy', { locale: he })
            });
          }
        }

        Object.entries(schedule.schedule_data).forEach(([day, dayData]) => {
          if (day === 'weekend_oncall') return;

          ['morning', 'evening'].forEach(shift => {
            const shiftEmployees = dayData?.[shift] || [];
            if (shiftEmployees.includes(emp.display_name)) {
              totalShifts++;

              const dayIndex = Object.keys(DAYS_HE).indexOf(day);
              const shiftDate = addDays(weekStart, dayIndex);
              const shiftDateRaw = format(shiftDate, 'yyyy-MM-dd');
              const detailKey = `${shiftDateRaw}-${shift}`;

              // Find matching time clock entry for this employee and date (regardless of shift_type)
              const matchingTimeClockEntry = timeClockEntries.find(entry =>
                entry.employee_name === emp.display_name &&
                entry.date === shiftDateRaw &&
                entry.clock_in_time // Must have actual clock-in time
              );

              shiftDetailsMap.set(detailKey, {
                date: format(shiftDate, 'dd/MM/yyyy', { locale: he }),
                dateRaw: shiftDateRaw,
                day: DAYS_HE[day],
                shift: shift === 'morning' ? 'בוקר' : 'ערב',
                shiftType: shift,
                clockIn: matchingTimeClockEntry?.clock_in_time || null,
                clockOut: matchingTimeClockEntry?.clock_out_time || null,
                timeClockEntryId: matchingTimeClockEntry?.id || null,
                totalHours: matchingTimeClockEntry?.total_hours || null,
                notScheduled: false
              });
            }
          });
        });
      });

      // Convert map to sorted array
      const finalShiftDetails = Array.from(shiftDetailsMap.values()).sort((a, b) => {
        const dateA = parseISO(a.dateRaw);
        const dateB = parseISO(b.dateRaw);
        if (dateA - dateB !== 0) {
          return dateA - dateB;
        }
        // Same date: morning before evening
        const shiftOrder = { morning: 0, evening: 1 };
        return (shiftOrder[a.shiftType] || 99) - (shiftOrder[b.shiftType] || 99);
      });

      const empVacations = vacations.filter(v => v.employee_email === emp.email);
      let vacationDays = 0;
      const vacationDetails = [];

      empVacations.forEach(vacation => {
        const vacStart = parseISO(vacation.start_date);
        const vacEnd = parseISO(vacation.end_date);
        const reportStart = interval.start;
        const reportEnd = interval.end;
        const overlaps = (vacStart <= reportEnd && vacEnd >= reportStart);

        if (overlaps && vacation.status === 'approved') {
          vacationDays += vacation.total_days || 0;
          vacationDetails.push({
            startDate: format(vacStart, 'dd/MM/yyyy', { locale: he }),
            endDate: format(vacEnd, 'dd/MM/yyyy', { locale: he }),
            days: vacation.total_days,
            type: vacation.vacation_type === 'sick_leave' ? 'מחלה' : 'חופשה'
          });
        }
      });

      return {
        name: emp.display_name,
        job: emp.job === 'doctor' ? 'וטרינר' : emp.job === 'assistant' ? 'אסיסטנט/ית' : emp.job === 'receptionist' ? 'פקיד/ת קבלה' : emp.job,
        totalShifts, // This still reflects scheduled shifts, not actual clocked-in occurrences
        weekendShifts: weekendOncallCount,
        vacationDays,
        shiftDetails: finalShiftDetails,
        oncallWeeks,
        vacationDetails
      };
    }).sort((a, b) => b.totalShifts - a.totalShifts);
  }, [employees, schedules, vacations, timeClockEntries, reportGenerated, reportType, startDate, endDate]);

  // Calculate protocol report data
  const protocolReportData = useMemo(() => {
    if (!reportGenerated || reportType !== 'protocols' || !startDate || !endDate) return [];

    const interval = { start: parseISO(startDate), end: parseISO(endDate) };

    return protocols
      .filter(protocol => {
        const protocolDate = parseISO(protocol.created_date);
        return isWithinInterval(protocolDate, interval);
      })
      .map(protocol => ({
        id: protocol.id,
        date: format(parseISO(protocol.created_date), 'dd/MM/yyyy HH:mm', { locale: he }),
        templateName: protocol.template_name,
        patientName: protocol.patient_name,
        filledBy: protocol.filled_by_name,
        consentAgreed: protocol.data?.consent_agreed || false,
        clientSignature: protocol.data?.client_signature || null,
        clientConsentName: protocol.data?.client_consent_name || '',
      }));
  }, [protocols, reportGenerated, reportType, startDate, endDate]);

  // Calculate hospitalization report data WITH DETAILS
  const hospitalizationReportData = useMemo(() => {
    if (!reportGenerated || reportType !== 'hospitalization' || !startDate || !endDate) return [];

    const interval = { start: parseISO(startDate), end: parseISO(endDate) };

    return hospitalizations
      .filter(hosp => {
        const admissionDate = parseISO(hosp.admission_date);
        return isWithinInterval(admissionDate, interval);
      })
      .map(hosp => {
        // Get executions for this animal
        const animalExecutions = treatmentExecutions.filter(exec => exec.animal_id === hosp.id);

        // Process treatment instructions with execution data
        const treatmentDetails = (hosp.treatment_instructions || []).map(instruction => {
          const executions = animalExecutions.filter(exec => exec.instruction_id === instruction.id);

          return {
            medication: instruction.medication_name,
            dosage: instruction.dosage,
            frequency: instruction.frequency,
            route: instruction.route,
            notes: instruction.notes || '-',
            prescribedBy: instruction.prescribed_by,
            executionCount: executions.length,
            executions: executions.map(exec => ({
              executedBy: exec.executed_by_name,
              executionTime: format(new Date(exec.execution_time), 'dd/MM/yyyy HH:mm', { locale: he })
            })).sort((a, b) => b.executionTime.localeCompare(a.executionTime))
          };
        });

        return {
          id: hosp.id,
          admissionDate: format(parseISO(hosp.admission_date), 'dd/MM/yyyy', { locale: he }),
          animalName: hosp.animal_name,
          ownerName: hosp.owner_name,
          animalType: hosp.animal_type,
          admissionWeight: hosp.admission_weight ? `${hosp.admission_weight} ק"ג` : '-',
          status: STATUS_HE[hosp.status] || hosp.status,
          statusColor: STATUS_COLORS[hosp.status],
          diagnoses: hosp.diagnoses || '-',
          treatmentCount: hosp.treatment_instructions?.length || 0,
          treatmentDetails,
          totalExecutions: animalExecutions.length
        };
      });
  }, [hospitalizations, treatmentExecutions, reportGenerated, reportType, startDate, endDate]);

  // Calculate inventory report data
  const inventoryReportData = useMemo(() => {
    if (!reportGenerated || reportType !== 'inventory' || !startDate || !endDate) return [];

    const interval = { start: parseISO(startDate), end: parseISO(endDate) };

    return inventoryShortages
      .filter(shortage => {
        const reportDate = parseISO(shortage.created_date);
        return isWithinInterval(reportDate, interval);
      })
      .map(shortage => ({
        id: shortage.id,
        reportDate: format(parseISO(shortage.created_date), 'dd/MM/yyyy HH:mm', { locale: he }),
        itemName: shortage.item_name,
        category: shortage.category,
        quantityNeeded: shortage.quantity_needed || '-',
        status: STATUS_HE[shortage.status] || shortage.status,
        statusColor: STATUS_COLORS[shortage.status],
        requestedBy: shortage.requested_by_name,
        notes: shortage.notes || '-',
      }));
  }, [inventoryShortages, reportGenerated, reportType, startDate, endDate]);

  // Calculate order report data with FULL ORDER DETAILS
  const orderReportData = useMemo(() => {
    if (!reportGenerated || reportType !== 'orders' || !startDate || !endDate) return [];

    const interval = { start: parseISO(startDate), end: parseISO(endDate) };

    return orders
      .filter(order => {
        const orderDate = parseISO(order.order_date);
        return isWithinInterval(orderDate, interval);
      })
      .map((order, index) => {
        const itemDetails = (order.items || []).map(item => ({
          productName: item.product_name,
          quantity: item.quantity,
          supplier: item.chosen_supplier || '-',
          pricePerUnit: item.price_per_unit || 0,
          totalPrice: (item.price_per_unit || 0) * (item.quantity || 0),
          received: order.received_items?.[item.product_name] || false
        }));

        const totalAmount = itemDetails.reduce((sum, item) => sum + item.totalPrice, 0);

        return {
          id: order.id,
          orderNumber: 1001 + index,
          date: format(parseISO(order.order_date), 'dd/MM/yyyy', { locale: he }),
          amount: totalAmount.toFixed(2),
          status: STATUS_HE[order.status] || order.status,
          statusColor: STATUS_COLORS[order.status],
          itemCount: order.items?.length || 0,
          itemDetails,
          receivedBy: order.received_by,
          receivedDate: order.received_date
        };
      });
  }, [orders, reportGenerated, reportType, startDate, endDate]);

  if (isUserLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!hasAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 border-red-500">
        <CardHeader className="text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
          <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            עמוד זה מיועד למנהלי מערכת או למשתמשים בעלי הרשאה מתאימה בלבד.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLoading =
    (reportType === 'employees' && (isLoadingEmployees || isLoadingSchedules || isLoadingVacations || isLoadingTimeClock)) ||
    (reportType === 'protocols' && isLoadingProtocols) ||
    (reportType === 'hospitalization' && (isLoadingHospitalizations || isLoadingTreatmentExecutions)) ||
    (reportType === 'inventory' && isLoadingInventory) ||
    (reportType === 'orders' && isLoadingOrders);

  return (
    <div className="max-w-7xl mx-auto space-y-8" dir="rtl">
      {editingTimeClockEntry && (
        <Dialog open={!!editingTimeClockEntry} onOpenChange={() => setEditingTimeClockEntry(null)}>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>עריכת שעון נוכחות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">עובד</Label>
                <Input value={editingTimeClockEntry.employeeName} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">תאריך</Label>
                <Input value={editingTimeClockEntry.dateDisplay} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">משמרת</Label>
                <Input value={editingTimeClockEntry.shiftType === 'morning' ? 'בוקר' : editingTimeClockEntry.shiftType === 'evening' ? 'ערב' : editingTimeClockEntry.shiftType === 'full_day' ? 'יום מלא' : editingTimeClockEntry.shiftType || 'לא מוגדר'} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">שעת כניסה *</Label>
                  <Input
                    type="time"
                    value={editingTimeClockEntry.clockIn}
                    onChange={(e) => setEditingTimeClockEntry({
                      ...editingTimeClockEntry,
                      clockIn: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">שעת יציאה</Label>
                  <Input
                    type="time"
                    value={editingTimeClockEntry.clockOut}
                    onChange={(e) => setEditingTimeClockEntry({
                      ...editingTimeClockEntry,
                      clockOut: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingTimeClockEntry(null)}
                >
                  <X className="w-4 h-4 ml-2" />
                  ביטול
                </Button>
                <Button
                  onClick={handleSaveTimeClock}
                  disabled={updateTimeClockMutation.isLoading}
                >
                  <Save className="w-4 h-4 ml-2" />
                  {updateTimeClockMutation.isLoading ? 'שומר...' : 'שמור'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {reportToPrint && (
        <ReportPDFLayout
          reportType={reportToPrint.type}
          reportData={reportToPrint.data}
          startDate={reportToPrint.startDate}
          endDate={reportToPrint.endDate}
          onDone={() => setReportToPrint(null)}
        />
      )}

      {protocolToPrint && (
        <ProtocolPDFLayout
          protocol={protocolToPrint.protocol}
          template={protocolToPrint.template}
          onDone={() => setProtocolToPrint(null)}
        />
      )}

      {hospitalizationToPrint && (
        <HospitalizationPDFLayout
          hospitalization={hospitalizationToPrint.hospitalization}
          treatmentExecutions={hospitalizationToPrint.executions}
          onDone={() => setHospitalizationToPrint(null)}
        />
      )}

      {orderToPrint && (
        <OrderPDFLayout
          order={orderToPrint}
          onDone={() => setOrderToPrint(null)}
        />
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="text-purple-600" />
          דוחות ניהוליים
        </h1>
        <p className="text-gray-500 mt-1">יצירת דוחות נתונים לפי טווח תאריכים</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות דוח</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type" className="text-center block">סוג דוח</Label>
              <Select value={reportType} onValueChange={(value) => {
                setReportType(value);
                setReportGenerated(false);
              }}>
                <SelectTrigger id="report-type" className="text-center">
                  <SelectValue placeholder="בחר סוג דוח" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-center block">מתאריך</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className="w-full justify-start text-right font-normal"
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    {startDate ? format(parseISO(startDate), 'dd/MM/yyyy') : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate ? parseISO(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, 'yyyy-MM-dd'));
                        setReportGenerated(false);
                        setSelectedQuickRange('');
                      }
                    }}
                    locale={he}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-center block">עד תאריך</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className="w-full justify-start text-right font-normal"
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    {endDate ? format(parseISO(endDate), 'dd/MM/yyyy') : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate ? parseISO(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(format(date, 'yyyy-MM-dd'));
                        setReportGenerated(false);
                        setSelectedQuickRange('');
                      }
                    }}
                    locale={he}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">חיפוש מהיר</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {QUICK_DATE_RANGES.map((range) => {
                const Icon = range.icon;
                return (
                  <Button
                    key={range.value}
                    type="button"
                    variant={selectedQuickRange === range.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickDateRange(range.value)}
                    className={`text-xs ${
                      selectedQuickRange === range.value
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'hover:bg-purple-50'
                    }`}
                  >
                    <Icon className="w-3 h-3 ml-1" />
                    {range.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {reportGenerated && (
              <>
                <Button
                  onClick={handlePrintReport}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <FileDown className="w-4 h-4 ml-2" />
                  הורד כ-PDF
                </Button>
                <Button
                  onClick={handleDownloadReport}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 ml-2" />
                  הורד כ-CSV
                </Button>
              </>
            )}
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || isLoading || !startDate || !endDate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייצר...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 ml-2" />
                  הפק דוח
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportGenerated && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                {reportType === 'employees' && 'דוח עובדים'}
                {reportType === 'protocols' && <><FileSignature className="w-6 h-6" />דוח פרוטוקולי חדר ניתוח</>}
                {reportType === 'hospitalization' && <><BedDouble className="w-6 h-6" />דוח אשפוזים</>}
                {reportType === 'inventory' && <><PackagePlus className="w-6 h-6" />דוח מלאי</>}
                {reportType === 'orders' && <><ShoppingCart className="w-6 h-6" />דוח הזמנות</>}
              </CardTitle>
              {startDate && endDate && (
                <div className="text-base font-normal text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    תקופה: {format(parseISO(startDate), 'dd/MM/yyyy', { locale: he })} - {format(parseISO(endDate), 'dd/MM/yyyy', { locale: he })}
                  </span>
                  </div>
                  )}

                  {/* Search and Filter Section */}
                  <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
                  <div className="flex-1">
                  <Input
                    placeholder="חיפוש בתוצאות..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                  </div>

                  {/* Status Filter - for relevant report types */}
                  {(reportType === 'hospitalization' || reportType === 'inventory' || reportType === 'orders') && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="סינון לפי סטטוס" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הסטטוסים</SelectItem>
                      {reportType === 'hospitalization' && (
                        <>
                          <SelectItem value="פעיל">פעיל</SelectItem>
                          <SelectItem value="שוחרר">שוחרר</SelectItem>
                          <SelectItem value="נפטר">נפטר</SelectItem>
                        </>
                      )}
                      {reportType === 'inventory' && (
                        <>
                          <SelectItem value="נדרש">נדרש</SelectItem>
                          <SelectItem value="הוזמן">הוזמן</SelectItem>
                          <SelectItem value="במלאי">במלאי</SelectItem>
                        </>
                      )}
                      {reportType === 'orders' && (
                        <>
                          <SelectItem value="ממתינה">ממתינה</SelectItem>
                          <SelectItem value="בעיבוד">בעיבוד</SelectItem>
                          <SelectItem value="נשלחה">נשלחה</SelectItem>
                          <SelectItem value="הושלמה">הושלמה</SelectItem>
                          <SelectItem value="בוטלה">בוטלה</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  )}

                  {/* Category Filter - for inventory */}
                  {reportType === 'inventory' && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="סינון לפי קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הקטגוריות</SelectItem>
                      <SelectItem value="תרופה">תרופה</SelectItem>
                      <SelectItem value="ציוד מתכלה">ציוד מתכלה</SelectItem>
                      <SelectItem value="מזון רפואי">מזון רפואי</SelectItem>
                      <SelectItem value="ציוד משרדי">ציוד משרדי</SelectItem>
                      <SelectItem value="אחר">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                  )}

                  {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="whitespace-nowrap"
                  >
                    נקה סינון
                  </Button>
                  )}
                  </div>
                  </div>
                  </CardHeader>
                  <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {reportType === 'employees' && (
                  <div className="space-y-2">
                    {/* Column Headers - shown above the first row */}
                    {filterData(employeeReportData, 'employees').length > 0 && (
                      <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-gray-100 font-semibold text-sm text-gray-700 rounded-t-lg mb-2">
                        <div className="text-right">שם העובד</div>
                        <div className="text-right">תפקיד</div>
                        <div className="text-center">סך משמרות</div>
                        <div className="text-center">כוננות סופ"ש</div>
                        <div className="text-center">ימי חופשה</div>
                        <div className="text-center">פעולות</div>
                        </div>
                        )}
                        {filterData(employeeReportData, 'employees').length === 0 ? (
                        <p className="text-center py-8 text-gray-500">
                        {employeeReportData.length === 0 ? 'לא נמצאו נתונים לתקופה שנבחרה' : 'לא נמצאו תוצאות מתאימות לחיפוש'}
                        </p>
                        ) : (
                        filterData(employeeReportData, 'employees').map((emp, index) => (
                        <Collapsible
                          key={index}
                          open={expandedEmployees.has(emp.name)}
                          onOpenChange={() => toggleEmployeeExpand(emp.name)}
                        >
                          <Card className="overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <div className="grid grid-cols-6 gap-2 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                                <div className="col-span-1 font-medium text-right flex items-center gap-2">
                                  {expandedEmployees.has(emp.name) ? (
                                    <ChevronUp className="w-4 h-4 text-purple-600" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                  {emp.name}
                                </div>
                                <div className="col-span-1 text-right flex items-center">
                                  <Badge variant="outline">{emp.job}</Badge>
                                </div>
                                <div className="col-span-1 text-center flex items-center justify-center">
                                  <span className="font-semibold text-purple-700">{emp.totalShifts}</span>
                                </div>
                                <div className="col-span-1 text-center flex items-center justify-center">
                                  <span className="font-semibold text-orange-700">{emp.weekendShifts}</span>
                                </div>
                                <div className="col-span-1 text-center flex items-center justify-center">
                                  <span className="font-semibold text-blue-700">{emp.vacationDays}</span>
                                </div>
                                <div className="col-span-1 text-center flex items-center justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent collapsible from toggling twice
                                      toggleEmployeeExpand(emp.name);
                                    }}
                                    className="text-purple-600"
                                  >
                                    {expandedEmployees.has(emp.name) ? 'הסתר' : 'פרטים'}
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="border-t bg-gray-50/50 p-4 space-y-4">
                                {/* Regular Shifts */}
                                {emp.shiftDetails.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-purple-600" />
                                      משמרות רגילות ({emp.shiftDetails.length})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {emp.shiftDetails.map((shift, idx) => (
                                       <div key={idx} className={`p-3 rounded border text-sm space-y-1 ${shift.notScheduled ? 'bg-yellow-50 border-yellow-300' : 'bg-white'}`}>
                                         <div className="flex items-center gap-2">
                                           {shift.shiftType === 'morning' ? (
                                             <Sun className="w-4 h-4 text-yellow-500" />
                                           ) : shift.shiftType === 'evening' ? (
                                             <Moon className="w-4 h-4 text-indigo-500" />
                                           ) : ( // Default for full_day or unknown
                                             <Clock className="w-4 h-4 text-purple-500" />
                                           )}
                                           <div>
                                             <div className="font-medium">{shift.date}</div>
                                             <div className="text-xs text-gray-500">
                                               {shift.day} - {shift.shift}
                                               {shift.notScheduled && <span className="text-orange-600 mr-1">(לא בסידור)</span>}
                                             </div>
                                           </div>
                                         </div>
                                          {shift.clockIn || shift.clockOut ? (
                                            <div className="pr-6 space-y-1">
                                              <div className="flex items-center gap-2 text-xs">
                                                <Clock className="w-3 h-3 text-green-600" />
                                                <span className="text-gray-600">כניסה:</span>
                                                <span className="font-semibold">{shift.clockIn || '-'}</span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs">
                                                <Clock className="w-3 h-3 text-red-600" />
                                                <span className="text-gray-600">יציאה:</span>
                                                <span className="font-semibold">{shift.clockOut || '-'}</span>
                                              </div>
                                              {shift.totalHours && (
                                                <div className="text-xs text-purple-600 font-medium">
                                                  סה"כ: {shift.totalHours} שעות
                                                </div>
                                              )}
                                              {currentUser?.role === 'admin' && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 text-xs text-blue-600 hover:text-blue-800 p-0"
                                                  onClick={() => setEditingTimeClockEntry({
                                                    employeeEmail: emp.email || employees.find(e => e.display_name === emp.name)?.email,
                                                    employeeName: emp.name,
                                                    date: shift.dateRaw,
                                                    dateDisplay: shift.date,
                                                    shiftType: shift.shiftType,
                                                    clockIn: shift.clockIn || '',
                                                    clockOut: shift.clockOut || '',
                                                    entryId: shift.timeClockEntryId
                                                  })}
                                                >
                                                  ערוך שעות
                                                </Button>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="pr-6">
                                              <div className="text-xs text-orange-600 flex items-center gap-1">
                                                <span>⚠️</span>
                                                <span>לא נרשם בשעון נוכחות</span>
                                              </div>
                                              {currentUser?.role === 'admin' && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 text-xs text-blue-600 hover:text-blue-800 p-0 mt-1"
                                                  onClick={() => setEditingTimeClockEntry({
                                                    employeeEmail: emp.email || employees.find(e => e.display_name === emp.name)?.email,
                                                    employeeName: emp.name,
                                                    date: shift.dateRaw,
                                                    dateDisplay: shift.date,
                                                    shiftType: shift.shiftType,
                                                    clockIn: '',
                                                    clockOut: '',
                                                    entryId: null
                                                  })}
                                                >
                                                  הוסף שעות
                                                </Button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Weekend On-Call */}
                                {emp.oncallWeeks.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                      <PhoneCall className="w-4 h-4 text-orange-600" />
                                      כוננויות סופ"ש ({emp.weekendShifts})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {emp.oncallWeeks.map((oncall, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200 text-sm">
                                          <PhoneCall className="w-4 h-4 text-orange-600" />
                                          <div>
                                            <div className="font-medium text-orange-900">
                                              {oncall.weekStart} - {oncall.weekEnd}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Vacations */}
                                {emp.vacationDetails.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                      <Plane className="w-4 h-4 text-blue-600" />
                                      חופשות ({emp.vacationDays} ימים)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {emp.vacationDetails.map((vacation, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                                          <Plane className="w-4 h-4 text-blue-600" />
                                          <div>
                                            <div className="font-medium text-blue-900">
                                              {vacation.startDate} - {vacation.endDate}
                                            </div>
                                            <div className="text-xs text-blue-700">
                                              {vacation.type} • {vacation.days} ימים
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {emp.shiftDetails.length === 0 && emp.oncallWeeks.length === 0 && emp.vacationDetails.length === 0 && (
                                  <p className="text-center text-gray-500 text-sm py-2">אין נתונים מפורטים לעובד זה</p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      ))
                    )}
                  </div>
                )}

                {reportType === 'protocols' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">תאריך ושעה</TableHead>
                          <TableHead className="text-right">תבנית</TableHead>
                          <TableHead className="text-right">שם מטופל</TableHead>
                          <TableHead className="text-right">נרשם על ידי</TableHead>
                          <TableHead className="text-center">הסכמה אושרה</TableHead>
                          <TableHead className="text-center">חתימה</TableHead>
                          <TableHead className="text-center">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterData(protocolReportData, 'protocols').length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              {protocolReportData.length === 0 ? 'לא נמצאו פרוטוקולים לתקופה שנבחרה' : 'לא נמצאו תוצאות מתאימות לחיפוש'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterData(protocolReportData, 'protocols').map((protocol) => (
                            <TableRow key={protocol.id}>
                              <TableCell className="text-right">{protocol.date}</TableCell>
                              <TableCell className="font-medium text-right">{protocol.templateName}</TableCell>
                              <TableCell className="text-right">{protocol.patientName}</TableCell>
                              <TableCell className="text-right">{protocol.filledBy}</TableCell>
                              <TableCell className="text-center">
                                {protocol.consentAgreed ? (
                                  <Badge className="bg-green-100 text-green-800">✓ אושרה</Badge>
                                ) : (
                                  <Badge variant="outline">לא אושרה</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {protocol.clientSignature ? (
                                  <Badge className="bg-blue-100 text-blue-800">✓ נחתם</Badge>
                                ) : (
                                  <Badge variant="outline">אין חתימה</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePrintProtocol(protocol.id)}
                                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                >
                                  <FileDown className="w-4 h-4 ml-1" />
                                  PDF
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      </Table>

                      {filterData(protocolReportData, 'protocols').length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">סך פרוטוקולים{searchTerm && ' (מסוננים)'}</p>
                            <p className="text-2xl font-bold text-purple-700">{filterData(protocolReportData, 'protocols').length}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">הסכמות אושרו</p>
                            <p className="text-2xl font-bold text-green-700">
                              {filterData(protocolReportData, 'protocols').filter(p => p.consentAgreed).length}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">עם חתימה</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {filterData(protocolReportData, 'protocols').filter(p => p.clientSignature).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {reportType === 'hospitalization' && (
                  <div className="space-y-2">
                    {filterData(hospitalizationReportData, 'hospitalization').length === 0 ? (
                      <p className="text-center py-8 text-gray-500">
                        {hospitalizationReportData.length === 0 ? 'לא נמצאו אשפוזים לתקופה שנבחרה' : 'לא נמצאו תוצאות מתאימות לחיפוש'}
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-8 gap-2 px-4 py-2 bg-gray-100 font-semibold text-sm text-gray-700 rounded-t-lg mb-2">
                          <div className="text-right">תאריך</div>
                          <div className="text-right">שם החיה</div>
                          <div className="text-right">בעלים</div>
                          <div className="text-right">סוג</div>
                          <div className="text-center">משקל</div>
                          <div className="text-center">סטטוס</div>
                          <div className="text-center">הנחיות</div>
                          <div className="text-center">פעולות</div>
                          </div>
                          {filterData(hospitalizationReportData, 'hospitalization').map((hosp) => (
                          <Collapsible
                            key={hosp.id} // Changed to hosp.id for unique key
                            open={expandedHospitalizations.has(hosp.id)}
                            onOpenChange={() => toggleHospitalizationExpand(hosp.id)}
                          >
                            <Card className="overflow-hidden">
                              <CollapsibleTrigger asChild>
                                <div className="grid grid-cols-8 gap-2 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                                  <div className="col-span-1 text-right flex items-center gap-2">
                                    {expandedHospitalizations.has(hosp.id) ? (
                                      <ChevronUp className="w-4 h-4 text-purple-600" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                    {hosp.admissionDate}
                                  </div>
                                  <div className="col-span-1 font-medium text-right flex items-center">{hosp.animalName}</div>
                                  <div className="col-span-1 text-right flex items-center">{hosp.ownerName}</div>
                                  <div className="col-span-1 text-right flex items-center">
                                    <Badge variant="outline">{hosp.animalType}</Badge>
                                  </div>
                                  <div className="col-span-1 text-center flex items-center justify-center">{hosp.admissionWeight}</div>
                                  <div className="col-span-1 text-center flex items-center justify-center">
                                    <Badge className={hosp.statusColor}>{hosp.status}</Badge>
                                  </div>
                                  <div className="col-span-1 text-center flex items-center justify-center">
                                    <Badge className="bg-purple-100 text-purple-800">
                                      <Pill className="w-3 h-3 ml-1" />
                                      {hosp.treatmentCount}
                                    </Badge>
                                  </div>
                                  <div className="col-span-1 text-center flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrintHospitalization(hosp.id);
                                      }}
                                      className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                      title="הורד PDF"
                                    >
                                      <FileDown className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleHospitalizationExpand(hosp.id);
                                      }}
                                      className="text-purple-600"
                                    >
                                      {expandedHospitalizations.has(hosp.id) ? 'הסתר' : 'פרטים'}
                                    </Button>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="border-t bg-gray-50/50 p-4 space-y-4">
                                  {/* Diagnoses */}
                                  {hosp.diagnoses !== '-' && (
                                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                      <h5 className="font-semibold text-sm text-blue-900 mb-1">אבחנות:</h5>
                                      <p className="text-sm text-blue-800">{hosp.diagnoses}</p>
                                    </div>
                                  )}

                                  {/* Treatment Instructions */}
                                  {hosp.treatmentDetails && hosp.treatmentDetails.length > 0 ? (
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                        <Pill className="w-4 h-4 text-purple-600" />
                                        הנחיות טיפול ({hosp.treatmentCount})
                                      </h4>
                                      <div className="space-y-2">
                                        {hosp.treatmentDetails.map((treatment, idx) => (
                                          <div key={idx} className="p-3 bg-purple-50 rounded border border-purple-200 space-y-2">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-grow">
                                                <div className="font-semibold text-purple-900">{treatment.medication}</div>
                                                <div className="text-sm text-purple-700 mt-1">
                                                  <span className="font-medium">מינון:</span> {treatment.dosage} •
                                                  <span className="font-medium mr-2">תדירות:</span> {treatment.frequency} •
                                                  <span className="font-medium mr-2">דרך מתן:</span> {treatment.route}
                                                </div>
                                                {treatment.notes !== '-' && (
                                                  <div className="text-xs text-purple-600 mt-1">
                                                    <span className="font-medium">הערות:</span> {treatment.notes}
                                                  </div>
                                                )}
                                                <div className="text-xs text-gray-600 mt-1">
                                                  נקבע ע"י: {treatment.prescribedBy}
                                                </div>
                                              </div>
                                              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {treatment.executionCount} ביצועים
                                              </Badge>
                                            </div>

                                            {/* Executions list */}
                                            {treatment.executions.length > 0 && (
                                              <div className="mt-2 pt-2 border-t border-purple-300">
                                                <div className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                                                  <Syringe className="w-3 h-3" />
                                                  ביצועים אחרונים:
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                                  {treatment.executions.slice(0, 5).map((exec, execIdx) => (
                                                    <div key={execIdx} className="text-xs text-purple-700 bg-white/50 p-1.5 rounded flex items-center gap-1">
                                                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                                                      {exec.executionTime} • {exec.executedBy}
                                                    </div>
                                                  ))}
                                                  {treatment.executions.length > 5 && (
                                                    <div className="text-xs text-purple-600 italic">
                                                      +{treatment.executions.length - 5} נוספים...
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-center text-gray-500 text-sm py-2">אין הנחיות טיפול לאשפוז זה</p>
                                  )}

                                  {/* Total Executions Summary */}
                                  <div className="p-3 bg-green-50 rounded border border-green-200 flex items-center justify-between">
                                    <span className="font-semibold text-sm text-green-900">סך כל הטיפולים שבוצעו:</span>
                                    <Badge className="bg-green-600 text-white text-base">
                                      <CheckCircle2 className="w-4 h-4 ml-1" />
                                      {hosp.totalExecutions}
                                    </Badge>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        ))}

                        {hospitalizationReportData.length > 0 && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-600">סך אשפוזים{(searchTerm || statusFilter !== 'all') && ' (מסוננים)'}</p>
                                <p className="text-2xl font-bold text-purple-700">{filterData(hospitalizationReportData, 'hospitalization').length}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">פעילים</p>
                                <p className="text-2xl font-bold text-green-700">
                                  {filterData(hospitalizationReportData, 'hospitalization').filter(h => h.status === 'פעיל').length}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">שוחררו</p>
                                <p className="text-2xl font-bold text-blue-700">
                                  {filterData(hospitalizationReportData, 'hospitalization').filter(h => h.status === 'שוחרר').length}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">סך טיפולים שבוצעו</p>
                                <p className="text-2xl font-bold text-indigo-700">
                                  {filterData(hospitalizationReportData, 'hospitalization').reduce((sum, h) => sum + h.totalExecutions, 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {reportType === 'inventory' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">תאריך דיווח</TableHead>
                          <TableHead className="text-right">שם פריט</TableHead>
                          <TableHead className="text-right">קטגוריה</TableHead>
                          <TableHead className="text-center">כמות נדרשת</TableHead>
                          <TableHead className="text-center">סטטוס</TableHead>
                          <TableHead className="text-right">דווח על ידי</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterData(inventoryReportData, 'inventory').length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              {inventoryReportData.length === 0 ? 'לא נמצאו דיווחי מלאי לתקופה שנבחרה' : 'לא נמצאו תוצאות מתאימות לחיפוש'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filterData(inventoryReportData, 'inventory').map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-right">{item.reportDate}</TableCell>
                              <TableCell className="font-medium text-right">{item.itemName}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="text-center">{item.quantityNeeded}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={item.statusColor}>{item.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{item.requestedBy}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      </Table>

                      {filterData(inventoryReportData, 'inventory').length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">סך דיווחים{(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && ' (מסוננים)'}</p>
                            <p className="text-2xl font-bold text-purple-700">{filterData(inventoryReportData, 'inventory').length}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">נדרש</p>
                            <p className="text-2xl font-bold text-orange-700">
                              {filterData(inventoryReportData, 'inventory').filter(i => i.status === 'נדרש').length}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">הוזמן/במלאי</p>
                            <p className="text-2xl font-bold text-green-700">
                              {filterData(inventoryReportData, 'inventory').filter(i => i.status === 'הוזמן' || i.status === 'במלאי').length}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {reportType === 'orders' && (
                  <div className="space-y-2">
                    {filterData(orderReportData, 'orders').length === 0 ? (
                      <p className="text-center py-8 text-gray-500">
                        {orderReportData.length === 0 ? 'לא נמצאו הזמנות לתקופה שנבחרה' : 'לא נמצאו תוצאות מתאימות לחיפוש'}
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-gray-100 font-semibold text-sm text-gray-700 rounded-t-lg mb-2">
                          <div className="text-right">מספר הזמנה</div>
                          <div className="text-right">תאריך</div>
                          <div className="text-right">סכום</div>
                          <div className="text-center">סטטוס</div>
                          <div className="text-center">פריטים</div>
                          <div className="text-center">פעולות</div>
                          </div>
                          {filterData(orderReportData, 'orders').map((order) => (
                          <Collapsible
                            key={order.id}
                            open={expandedOrders.has(order.id)}
                            onOpenChange={() => toggleOrderExpand(order.id)}
                          >
                            <Card className="overflow-hidden">
                              <CollapsibleTrigger asChild>
                                <div className="grid grid-cols-6 gap-2 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                                  <div className="col-span-1 font-medium text-right flex items-center gap-2">
                                    {expandedOrders.has(order.id) ? (
                                      <ChevronUp className="w-4 h-4 text-purple-600" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                    {order.orderNumber}
                                  </div>
                                  <div className="col-span-1 text-right flex items-center">{order.date}</div>
                                  <div className="col-span-1 text-right flex items-center">
                                    <span className="font-semibold">₪{order.amount}</span>
                                  </div>
                                  <div className="col-span-1 text-center flex items-center justify-center">
                                    <Badge className={order.statusColor}>{order.status}</Badge>
                                  </div>
                                  <div className="col-span-1 text-center flex items-center justify-center">
                                    <Badge className="bg-blue-100 text-blue-800">
                                      <Package className="w-3 h-3 ml-1" />
                                      {order.itemCount}
                                    </Badge>
                                  </div>
                                  <div className="col-span-1 text-center flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrintOrder(order.id);
                                      }}
                                      className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                      title="הורד PDF"
                                    >
                                      <FileDown className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOrderExpand(order.id);
                                      }}
                                      className="text-purple-600"
                                    >
                                      {expandedOrders.has(order.id) ? 'הסתר' : 'פרטים'}
                                    </Button>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="border-t bg-gray-50/50 p-4 space-y-4">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                      <ShoppingCart className="w-4 h-4 text-purple-600" />
                                      פריטי ההזמנה ({order.itemCount})
                                    </h4>
                                    <div className="space-y-2">
                                      {order.itemDetails.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-grow">
                                              <div className="font-semibold text-gray-900">{item.productName}</div>
                                              <div className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">ספק:</span> {item.supplier} •
                                                <span className="font-medium mr-2">כמות:</span> {item.quantity}
                                              </div>
                                              <div className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">מחיר ליחידה:</span> ₪{item.pricePerUnit.toFixed(2)}
                                              </div>
                                            </div>
                                            <div className="text-left">
                                              <div className="font-bold text-lg text-purple-700">
                                                ₪{item.totalPrice.toFixed(2)}
                                              </div>
                                              {item.received ? (
                                                <Badge className="bg-green-100 text-green-800 mt-1">
                                                  <CheckCircle2 className="w-3 h-3 ml-1" />
                                                  התקבל
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline" className="mt-1">
                                                  ממתין
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="p-3 bg-green-50 rounded border border-green-200 flex items-center justify-between">
                                    <span className="font-semibold text-sm text-green-900">סה"כ הזמנה:</span>
                                    <span className="font-bold text-xl text-green-700">₪{order.amount}</span>
                                  </div>

                                  {order.receivedBy && order.receivedDate && (
                                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                      <h5 className="font-semibold text-sm text-blue-900 mb-1">אושר קבלת משלוח:</h5>
                                      <p className="text-sm text-blue-800">
                                        {order.receivedBy} • {format(new Date(order.receivedDate), 'dd/MM/yyyy HH:mm', { locale: he })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        ))}

                        {orderReportData.length > 0 && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-600">סך הזמנות{(searchTerm || statusFilter !== 'all') && ' (מסוננים)'}</p>
                                <p className="text-2xl font-bold text-purple-700">{filterData(orderReportData, 'orders').length}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">סכום כולל</p>
                                <p className="text-2xl font-bold text-green-700">
                                  ₪{filterData(orderReportData, 'orders').reduce((sum, order) => sum + parseFloat(order.amount), 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">סך פריטים</p>
                                <p className="text-2xl font-bold text-blue-700">
                                  {filterData(orderReportData, 'orders').reduce((sum, order) => sum + order.itemCount, 0)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">הזמנות שהושלמו</p>
                                <p className="text-2xl font-bold text-indigo-700">
                                  {filterData(orderReportData, 'orders').filter(o => o.status === 'הושלמה').length}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}