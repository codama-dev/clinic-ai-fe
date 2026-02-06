import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ClipboardList, Loader2, ShieldAlert, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ClinicCaseForm from '../components/clinic/ClinicCaseForm';
import ClinicCaseCard from '../components/clinic/ClinicCaseCard';
import { toast } from 'sonner';
import { isWithinInterval, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MarpetTrackingPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCase, setEditingCase] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [caseToDelete, setCaseToDelete] = useState(null);
    const [showAllPending, setShowAllPending] = useState(false);
    const [showAllApproved, setShowAllApproved] = useState(false);
    const [showAllSubmitted, setShowAllSubmitted] = useState(false);
    const queryClient = useQueryClient();

    const { data: currentUser, isLoading: isUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const { data: cases = [], isLoading: areCasesLoading } = useQuery({
        queryKey: ['clinicCases'],
        queryFn: () => base44.entities.ClinicCase.list('-updated_date'),
        enabled: !!currentUser,
    });

    const createOrUpdateMutation = useMutation({
        mutationFn: (caseData) => {
            if (editingCase) {
                return base44.entities.ClinicCase.update(editingCase.id, caseData);
            }
            const caseDataWithCreator = {
                ...caseData,
                created_by_name: currentUser?.display_name || currentUser?.full_name || currentUser?.email,
                created_by: currentUser?.email,
            };
            return base44.entities.ClinicCase.create(caseDataWithCreator);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinicCases'] });
            setIsFormOpen(false);
            setEditingCase(null);
            setIsReadOnly(false);
            toast.success(editingCase ? "התיק עודכן בהצלחה." : "התיק נוצר בהצלחה.");
        },
        onError: (error) => {
            console.error("Error saving case:", error);
            toast.error("שגיאה בשמירת התיק.");
        },
    });

    const approveMutation = useMutation({
        mutationFn: (caseId) => {
            return base44.entities.ClinicCase.update(caseId, {
                status: 'approved',
                approved_by: currentUser?.display_name || currentUser?.full_name,
                approval_date: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinicCases'] });
            toast.success("התיק אושר להגשה!");
        },
        onError: (error) => {
            console.error("Error approving case:", error);
            toast.error("שגיאה באישור התיק.");
        },
    });

    const submitClaimMutation = useMutation({
        mutationFn: (caseId) => {
            return base44.entities.ClinicCase.update(caseId, {
                status: 'submitted',
                submitted_by: currentUser?.display_name || currentUser?.full_name,
                submission_date: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinicCases'] });
            toast.success("התיק סומן כהוגש בהצלחה!");
        },
        onError: (error) => {
            console.error("Error submitting claim:", error);
            toast.error("שגיאה בסימון התיק.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (caseId) => {
            return base44.entities.ClinicCase.delete(caseId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinicCases'] });
            setCaseToDelete(null);
            toast.success("התיק נמחק בהצלחה!");
        },
        onError: (error) => {
            console.error("Error deleting case:", error);
            toast.error("שגיאה במחיקת התיק.");
        },
    });

    const handleOpenCreate = () => {
        setEditingCase(null);
        setIsReadOnly(false);
        setIsFormOpen(true);
    };

    const handleEditOrView = (caseItem) => {
        const canEdit = currentUser?.email === caseItem.created_by;
        setEditingCase(caseItem);
        setIsReadOnly(!canEdit);
        setIsFormOpen(true);
    };
    
    const handleDeleteRequest = (caseItem) => {
        setCaseToDelete(caseItem);
    };

    const handleDeleteConfirm = () => {
        if (caseToDelete) {
            deleteMutation.mutate(caseToDelete.id);
        }
    };
    
    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearchQuery('');
        setStatusFilter('all');
    };
    
    const handleQuickFilter = (filterType) => {
        const now = new Date();
        let start, end;
        
        switch(filterType) {
            case 'today':
                start = end = now;
                break;
            case 'yesterday':
                const yesterday = subDays(now, 1);
                start = end = yesterday;
                break;
            case 'this_week':
                start = startOfWeek(now, { weekStartsOn: 0 });
                end = endOfWeek(now, { weekStartsOn: 0 });
                break;
            case 'last_week':
                const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), 1);
                start = lastWeekStart;
                end = endOfWeek(lastWeekStart, { weekStartsOn: 0 });
                break;
            case 'this_month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'last_month':
                const lastMonthStart = subMonths(startOfMonth(now), 1);
                start = lastMonthStart;
                end = endOfMonth(lastMonthStart);
                break;
            case 'this_year':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case 'last_year':
                const lastYearStart = subYears(startOfYear(now), 1);
                start = lastYearStart;
                end = endOfYear(lastYearStart);
                break;
            default:
                return;
        }
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };
    
    const filterCases = (casesToFilter) => {
        let filtered = casesToFilter;
        
        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(caseItem => caseItem.status === statusFilter);
        }
        
        // Filter by date range
        if (startDate || endDate) {
            filtered = filtered.filter(caseItem => {
                const caseDate = parseISO(caseItem.updated_date);
                
                if (startDate && endDate) {
                    return isWithinInterval(caseDate, {
                        start: startOfDay(parseISO(startDate)),
                        end: endOfDay(parseISO(endDate))
                    });
                } else if (startDate) {
                    return caseDate >= startOfDay(parseISO(startDate));
                } else if (endDate) {
                    return caseDate <= endOfDay(parseISO(endDate));
                }
                return true;
            });
        }
        
        // Filter by search query (case number or client name)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(caseItem => {
                const caseNumber = (caseItem.case_number || '').toLowerCase();
                const clientName = (caseItem.client_name || '').toLowerCase();
                return caseNumber.includes(query) || clientName.includes(query);
            });
        }
        
        return filtered;
    };

    const isLoading = isUserLoading || areCasesLoading;

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
    }

    if (!currentUser) {
        return (
            <Card className="max-w-2xl mx-auto mt-10 border-red-500">
                <CardHeader className="text-center">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
                    <CardTitle className="text-2xl text-red-700 mt-4">נדרשת התחברות</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-gray-600">עליך להתחבר למערכת כדי לגשת לעמוד זה.</p>
                </CardContent>
            </Card>
        );
    }
    
    // Apply filters to all cases
    const filteredCases = filterCases(cases);
    
    // Separate by status from filtered results
    const pendingCases = filteredCases.filter(c => c.status === 'pending');
    const approvedCases = filteredCases.filter(c => c.status === 'approved');
    const submittedCases = filteredCases.filter(c => c.status === 'submitted');
    const activeCases = cases.filter(c => c.status !== 'submitted');
    
    const hasActiveFilters = startDate || endDate || searchQuery.trim() || statusFilter !== 'all';

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList/> מעקב מרפאט</h1>
                    <p className="text-gray-500">ניהול ומעקב אחר תיקים רפואיים להגשת תביעות. מוצגים כל התיקים הפעילים.</p>
                </div>
                <Button onClick={handleOpenCreate}><Plus className="w-4 h-4 ml-2" />הוסף תיק חדש</Button>
            </div>

            <Card className="mb-6 bg-white border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-purple-600" />
                        חיפוש וסינון תיקים
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search by case number or client name */}
                        <div className="space-y-2">
                            <Label htmlFor="search-query">חיפוש לפי מספר תיק או שם לקוח</Label>
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="search-query"
                                    type="text"
                                    placeholder="הקלד מספר תיק או שם לקוח..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pr-10 pl-10"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {/* Status filter */}
                        <div className="space-y-2">
                            <Label>סינון לפי סטטוס</Label>
                            <div className="flex flex-wrap gap-2">
                                <Badge 
                                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                                    className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-100'}`}
                                    onClick={() => setStatusFilter('all')}
                                >
                                    כל התיקים
                                </Badge>
                                <Badge 
                                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                                    className={`cursor-pointer transition-colors ${statusFilter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : 'hover:bg-yellow-50'}`}
                                    onClick={() => setStatusFilter('pending')}
                                >
                                    ממתינים לאישור
                                </Badge>
                                <Badge 
                                    variant={statusFilter === 'approved' ? 'default' : 'outline'}
                                    className={`cursor-pointer transition-colors ${statusFilter === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'}`}
                                    onClick={() => setStatusFilter('approved')}
                                >
                                    מוכנים להגשה
                                </Badge>
                                <Badge 
                                    variant={statusFilter === 'submitted' ? 'default' : 'outline'}
                                    className={`cursor-pointer transition-colors ${statusFilter === 'submitted' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50'}`}
                                    onClick={() => setStatusFilter('submitted')}
                                >
                                    הוגשו
                                </Badge>
                            </div>
                        </div>
                        
                        {/* Quick filter buttons */}
                        <div className="space-y-2">
                            <Label>סינון מהיר</Label>
                            <div className="flex flex-wrap gap-2">
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('today')}
                                >
                                    היום
                                </Badge>
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('yesterday')}
                                >
                                    אתמול
                                </Badge>
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('this_week')}
                                >
                                    שבוע נוכחי
                                </Badge>
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('last_week')}
                                >
                                    שבוע קודם
                                </Badge>
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('this_month')}
                                >
                                    חודש נוכחי
                                </Badge>
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('last_month')}
                                >
                                    חודש קודם
                                </Badge>
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('this_year')}
                                >
                                    שנה נוכחית
                                </Badge>
                                <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                    onClick={() => handleQuickFilter('last_year')}
                                >
                                    שנה קודמת
                                </Badge>
                            </div>
                        </div>
                        
                        {/* Date range filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">מתאריך</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">עד תאריך</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Button
                                    variant="outline"
                                    onClick={handleClearFilters}
                                    disabled={!hasActiveFilters}
                                    className="w-full"
                                >
                                    <X className="w-4 h-4 ml-2" />
                                    נקה סינון
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    {hasActiveFilters && (
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                            <p className="text-sm text-purple-800">
                                <strong>מציג {filteredCases.length} תיקים</strong> מתוך {cases.length} תיקים
                                {searchQuery && <span> (מחפש: "{searchQuery}")</span>}
                                {statusFilter !== 'all' && (
                                    <span>
                                        {' '}(סטטוס: {statusFilter === 'pending' ? 'ממתינים לאישור' : statusFilter === 'approved' ? 'מוכנים להגשה' : 'הוגשו'})
                                    </span>
                                )}
                                {(startDate || endDate) && (
                                    <span>
                                        {' '}(טווח תאריכים: {startDate || '...'} עד {endDate || '...'})
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-3xl" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editingCase ? (isReadOnly ? `צפייה בתיק: ${editingCase.case_number}` : `עריכת תיק: ${editingCase.case_number}`) : 'יצירת תיק חדש'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 max-h-[75vh] overflow-y-auto pr-4 pl-2">
                        <ClinicCaseForm 
                            caseData={editingCase}
                            onSubmit={createOrUpdateMutation.mutate}
                            onCancel={() => setIsFormOpen(false)}
                            isSubmitting={createOrUpdateMutation.isPending}
                            isReadOnly={isReadOnly}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!caseToDelete} onOpenChange={() => setCaseToDelete(null)}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                        <AlertDialogDescription>
                            פעולה זו תמחק את התיק <span className="font-bold">{caseToDelete?.case_number}</span> של <span className="font-bold">{caseToDelete?.client_name}</span> לצמיתות. לא ניתן לשחזר פעולה זו.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>ביטול</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteConfirm} 
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'מוחק...' : 'כן, מחק'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="space-y-10">
                <section>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                        תיקים ממתינים לאישור
                        {pendingCases.length > 10 && (
                            <span className="text-sm font-normal text-gray-500 mr-2">
                                ({showAllPending ? pendingCases.length : 10} מתוך {pendingCases.length})
                            </span>
                        )}
                    </h2>
                    {pendingCases.length === 0 ? (
                        <p className="text-gray-500">אין תיקים שממתינים לאישור{hasActiveFilters ? ' בחיפוש/סינון הנוכחי' : ''}.</p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-4">
                                {(showAllPending ? pendingCases : pendingCases.slice(0, 10)).map(caseItem => (
                                    <ClinicCaseCard 
                                        key={caseItem.id} 
                                        caseItem={caseItem}
                                        onEditOrView={handleEditOrView}
                                        onApprove={approveMutation.mutate}
                                        onDelete={handleDeleteRequest}
                                        currentUser={currentUser}
                                        isApproving={approveMutation.isPending && approveMutation.variables === caseItem.id}
                                    />
                                ))}
                            </div>
                            {pendingCases.length > 10 && (
                                <div className="mt-4 text-center">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setShowAllPending(!showAllPending)}
                                    >
                                        {showAllPending ? 'הצג פחות' : `הצג עוד (${pendingCases.length - 10})`}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </section>
                
                <section>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                        תיקים שאושרו (מוכנים להגשה)
                        {approvedCases.length > 10 && (
                            <span className="text-sm font-normal text-gray-500 mr-2">
                                ({showAllApproved ? approvedCases.length : 10} מתוך {approvedCases.length})
                            </span>
                        )}
                    </h2>
                     {approvedCases.length === 0 ? (
                        <p className="text-gray-500">אין תיקים שאושרו{hasActiveFilters ? ' בחיפוש/סינון הנוכחי' : ''}.</p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-4">
                                {(showAllApproved ? approvedCases : approvedCases.slice(0, 10)).map(caseItem => (
                                    <ClinicCaseCard 
                                        key={caseItem.id} 
                                        caseItem={caseItem}
                                        onEditOrView={handleEditOrView}
                                        onSubmitClaim={submitClaimMutation.mutate}
                                        currentUser={currentUser}
                                        isSubmittingClaim={submitClaimMutation.isPending && submitClaimMutation.variables === caseItem.id}
                                    />
                                ))}
                            </div>
                            {approvedCases.length > 10 && (
                                <div className="mt-4 text-center">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setShowAllApproved(!showAllApproved)}
                                    >
                                        {showAllApproved ? 'הצג פחות' : `הצג עוד (${approvedCases.length - 10})`}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                        תיקים שהוגשו
                        {submittedCases.length > 10 && (
                            <span className="text-sm font-normal text-gray-500 mr-2">
                                ({showAllSubmitted ? submittedCases.length : 10} מתוך {submittedCases.length})
                            </span>
                        )}
                    </h2>
                     {submittedCases.length === 0 ? (
                        <p className="text-gray-500">אין תיקים שהוגשו{hasActiveFilters ? ' בחיפוש/סינון הנוכחי' : ''}.</p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-4">
                                {(showAllSubmitted ? submittedCases : submittedCases.slice(0, 10)).map(caseItem => (
                                    <ClinicCaseCard 
                                        key={caseItem.id} 
                                        caseItem={caseItem}
                                        onEditOrView={handleEditOrView}
                                        currentUser={currentUser}
                                    />
                                ))}
                            </div>
                            {submittedCases.length > 10 && (
                                <div className="mt-4 text-center">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setShowAllSubmitted(!showAllSubmitted)}
                                    >
                                        {showAllSubmitted ? 'הצג פחות' : `הצג עוד (${submittedCases.length - 10})`}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}