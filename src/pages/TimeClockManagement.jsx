import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Edit, Trash2, Search, Calendar, User, Filter, Download, Save, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const SHIFT_TYPES_HE = {
  morning: 'בוקר',
  evening: 'ערב',
  full_day: 'יום מלא',
  split: 'משמרת מפוצלת'
};

export default function TimeClockManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedShiftType, setSelectedShiftType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedMonths, setExpandedMonths] = useState({});

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: timeClockEntries = [], isLoading } = useQuery({
    queryKey: ['allTimeClockEntries'],
    queryFn: () => base44.entities.TimeClockEntry.list('-date', 5000),
    enabled: currentUser?.role === 'admin'
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['publicProfiles'],
    queryFn: () => base44.entities.PublicProfile.list(),
    enabled: currentUser?.role === 'admin'
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeClockEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allTimeClockEntries']);
      setEditingEntry(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeClockEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allTimeClockEntries']);
      setShowDeleteConfirm(null);
    }
  });

  const filteredEntries = useMemo(() => {
    return timeClockEntries.filter(entry => {
      const matchesSearch = !searchTerm || 
        entry.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.employee_email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEmployee = selectedEmployee === 'all' || entry.employee_email === selectedEmployee;
      
      const matchesShiftType = selectedShiftType === 'all' || entry.shift_type === selectedShiftType;

      const matchesDateRange = (!startDate || entry.date >= startDate) && 
                               (!endDate || entry.date <= endDate);

      return matchesSearch && matchesEmployee && matchesShiftType && matchesDateRange;
    });
  }, [timeClockEntries, searchTerm, selectedEmployee, selectedShiftType, startDate, endDate]);

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const clockIn = editingEntry.clock_in_time;
    const clockOut = editingEntry.clock_out_time;

    if (!clockIn) {
      alert('יש להזין שעת כניסה');
      return;
    }

    // Calculate total hours
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

    updateMutation.mutate({
      id: editingEntry.id,
      data: {
        clock_in_time: clockIn,
        clock_out_time: clockOut || '',
        total_hours: totalHours,
        status: clockOut ? 'clocked_out' : 'clocked_in',
        notes: editingEntry.notes || ''
      }
    });
  };

  const handleDelete = (entry) => {
    setShowDeleteConfirm(entry);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate(showDeleteConfirm.id);
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "תאריך,עובד,אימייל,משמרת,כניסה,יציאה,סה\"כ שעות,הערות\n";
    
    filteredEntries.forEach(entry => {
      csvContent += `"${entry.date}","${entry.employee_name}","${entry.employee_email}","${SHIFT_TYPES_HE[entry.shift_type]}","${entry.clock_in_time || '-'}","${entry.clock_out_time || '-'}",${entry.total_hours || '-'},"${entry.notes || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `שעון_נוכחות_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalHours = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.total_hours) || 0);
    }, 0);
  }, [filteredEntries]);

  const employeeStats = useMemo(() => {
    const stats = {};
    filteredEntries.forEach(entry => {
      if (!stats[entry.employee_email]) {
        stats[entry.employee_email] = {
          name: entry.employee_name,
          totalHours: 0,
          shifts: 0
        };
      }
      stats[entry.employee_email].totalHours += parseFloat(entry.total_hours) || 0;
      stats[entry.employee_email].shifts += 1;
    });
    return stats;
  }, [filteredEntries]);

  const entriesByMonth = useMemo(() => {
    const grouped = {};
    filteredEntries.forEach(entry => {
      const monthKey = entry.date.substring(0, 7); // YYYY-MM format
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(entry);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  if (currentUser?.role !== 'admin') {
    return (
      <Card className="max-w-2xl mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-6 h-6" />
            אין הרשאת גישה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">עמוד זה מיועד למנהלי מערכת בלבד.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="text-purple-600" />
            ניהול שעון נוכחות
          </h1>
          <p className="text-gray-500 mt-1">צפייה ועריכת דיווחי נוכחות של כל העובדים</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="w-4 h-4 ml-2" />
          ייצוא לאקסל
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            סינון
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>חיפוש</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="שם או אימייל..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>עובד</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל העובדים</SelectItem>
                  {employees
                    .filter(emp => emp.is_active !== false)
                    .map(emp => (
                      <SelectItem key={emp.email} value={emp.email}>
                        {emp.display_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>סוג משמרת</Label>
              <Select value={selectedShiftType} onValueChange={setSelectedShiftType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המשמרות</SelectItem>
                  <SelectItem value="morning">בוקר</SelectItem>
                  <SelectItem value="evening">ערב</SelectItem>
                  <SelectItem value="full_day">יום מלא</SelectItem>
                  <SelectItem value="split">מפוצלת</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>מתאריך</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>עד תאריך</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {(searchTerm || selectedEmployee !== 'all' || selectedShiftType !== 'all' || startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedEmployee('all');
                setSelectedShiftType('all');
                setStartDate('');
                setEndDate('');
              }}
              className="mt-4"
            >
              נקה סינון
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">סך רשומות</p>
              <p className="text-3xl font-bold text-purple-700">{filteredEntries.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">סך שעות</p>
              <p className="text-3xl font-bold text-blue-700">{totalHours.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">עובדים פעילים</p>
              <p className="text-3xl font-bold text-green-700">{Object.keys(employeeStats).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">ממוצע שעות ליום</p>
              <p className="text-3xl font-bold text-orange-700">
                {filteredEntries.length > 0 ? (totalHours / filteredEntries.length).toFixed(2) : '0'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables by Month */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            טוען נתונים...
          </CardContent>
        </Card>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            לא נמצאו רשומות
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {entriesByMonth.map(([monthKey, monthEntries]) => {
            const monthTotalHours = monthEntries.reduce((sum, entry) => 
              sum + (parseFloat(entry.total_hours) || 0), 0
            );
            const monthDate = parseISO(monthKey + '-01');
            const monthName = format(monthDate, 'MMMM yyyy', { locale: he });
            const isCurrentMonth = monthKey === currentMonthKey;
            const isExpanded = expandedMonths[monthKey] !== undefined ? expandedMonths[monthKey] : isCurrentMonth;

            return (
              <Card key={monthKey}>
                <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedMonths(prev => ({ ...prev, [monthKey]: open }))}>
                  <CardHeader className="bg-gradient-to-l from-purple-50 to-blue-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 flex-1">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          {monthName}
                          {isCurrentMonth && (
                            <Badge className="bg-green-100 text-green-800 mr-2">חודש נוכחי</Badge>
                          )}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className="bg-purple-100 text-purple-800 text-base px-3 py-1">
                          {monthEntries.length} רשומות
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 text-base px-3 py-1">
                          {monthTotalHours.toFixed(2)} שעות
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">תאריך</TableHead>
                          <TableHead className="text-right">עובד</TableHead>
                          <TableHead className="text-center">משמרת</TableHead>
                          <TableHead className="text-center">כניסה</TableHead>
                          <TableHead className="text-center">יציאה</TableHead>
                          <TableHead className="text-center">סה"כ שעות</TableHead>
                          <TableHead className="text-center">סטטוס</TableHead>
                          <TableHead className="text-right">הערות</TableHead>
                          <TableHead className="text-center">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthEntries.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-gray-50">
                            <TableCell className="text-right">
                              {format(parseISO(entry.date), 'dd/MM/yyyy', { locale: he })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div>
                                <div className="font-medium">{entry.employee_name}</div>
                                <div className="text-xs text-gray-500">{entry.employee_email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{SHIFT_TYPES_HE[entry.shift_type]}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {entry.clock_in_time || '-'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {entry.clock_out_time || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-purple-100 text-purple-800">
                                {entry.total_hours ? `${entry.total_hours} ש'` : '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={entry.status === 'clocked_out' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {entry.status === 'clocked_out' ? 'הסתיים' : 'פעיל'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-gray-600">
                              {entry.notes || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingEntry(entry)}
                                  title="ערוך"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(entry)}
                                  title="מחק"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>עריכת רשומת נוכחות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>עובד</Label>
                <Input value={editingEntry.employee_name} disabled />
              </div>
              <div className="space-y-2">
                <Label>תאריך</Label>
                <Input value={format(parseISO(editingEntry.date), 'dd/MM/yyyy', { locale: he })} disabled />
              </div>
              <div className="space-y-2">
                <Label>משמרת</Label>
                <Input value={SHIFT_TYPES_HE[editingEntry.shift_type]} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שעת כניסה *</Label>
                  <Input
                    type="time"
                    value={editingEntry.clock_in_time}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      clock_in_time: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שעת יציאה</Label>
                  <Input
                    type="time"
                    value={editingEntry.clock_out_time}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      clock_out_time: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>הערות</Label>
                <Input
                  value={editingEntry.notes || ''}
                  onChange={(e) => setEditingEntry({
                    ...editingEntry,
                    notes: e.target.value
                  })}
                  placeholder="הערות אופציונליות..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingEntry(null)}
                >
                  <X className="w-4 h-4 ml-2" />
                  ביטול
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isLoading}
                >
                  <Save className="w-4 h-4 ml-2" />
                  {updateMutation.isLoading ? 'שומר...' : 'שמור'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>אישור מחיקה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                האם אתה בטוח שברצונך למחוק את רשומת הנוכחות של <span className="font-semibold">{showDeleteConfirm.employee_name}</span> מתאריך {format(parseISO(showDeleteConfirm.date), 'dd/MM/yyyy', { locale: he })}?
              </p>
              <p className="text-sm text-red-600">פעולה זו אינה ניתנת לביטול.</p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  ביטול
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isLoading}
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  {deleteMutation.isLoading ? 'מוחק...' : 'מחק'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}