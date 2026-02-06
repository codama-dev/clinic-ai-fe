import React, { useState, useEffect } from "react";
import { VacationRequest, User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, CheckCircle, Clock, XCircle, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VacationRequestForm from "../components/vacations/VacationRequestForm";
import VacationRequestCard from "../components/vacations/VacationRequestCard";
import VacationSummary from "../components/vacations/VacationSummary";
import { parseISO, eachDayOfInterval, getDay } from "date-fns";

// Helper function to calculate business days (excluding Friday and Saturday)
const calculateBusinessDays = (startDate, endDate) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => {
    const dayOfWeek = getDay(day);
    return dayOfWeek !== 5 && dayOfWeek !== 6; // 5 = Friday, 6 = Saturday
  }).length;
};

export default function VacationRequestsPage() {
  const [vacationRequests, setVacationRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [vacationBalance, setVacationBalance] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const isFullAdmin = user.role === 'admin';
      
      let requestData;
      if (isFullAdmin) {
        requestData = await VacationRequest.list('-start_date');
      } else {
        requestData = await VacationRequest.filter({ employee_id: user.id }, '-start_date');
      }

      setVacationRequests(requestData);
      
      // Calculate vacation balance for current user
      if (!isFullAdmin) {
        const currentYear = new Date().getFullYear();
        const thisYearRequests = requestData.filter(req => {
          const reqStartDate = parseISO(req.start_date);
          const reqYear = reqStartDate.getFullYear();
          return reqYear === currentYear && req.status === 'approved';
        });
        
        const usedDays = thisYearRequests.reduce((sum, req) => sum + (req.total_days || 0), 0);
        const allowedDays = user.annual_vacation_days ?? 14; // Default to 14 if not set
        const remainingDays = allowedDays - usedDays;
        
        setVacationBalance({
          allowed: allowedDays,
          used: usedDays,
          remaining: remainingDays
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (requestData) => {
    try {
      const startDate = parseISO(requestData.start_date);
      const endDate = parseISO(requestData.end_date);
      const totalDays = calculateBusinessDays(startDate, endDate);
      const dataWithTotalDays = { ...requestData, total_days: totalDays };

      if (editingRequest) {
        const dataToUpdate = {
            ...dataWithTotalDays,
            status: 'pending',
            manager_response: null,
            response_date: null
        };
        await VacationRequest.update(editingRequest.id, dataToUpdate);
      } else {
        const displayName = currentUser.display_name || currentUser.full_name;
        const dataToCreate = {
            ...dataWithTotalDays,
            employee_id: currentUser.id,
            employee_name: displayName,
            employee_email: currentUser.email
        };
        await VacationRequest.create(dataToCreate);
      }

      setIsFormOpen(false);
      setEditingRequest(null);
      loadData();
    } catch (error) {
      console.error("Error saving vacation request:", error);
      alert("שגיאה בשמירת הבקשה.");
    }
  };

  const handleStatusUpdate = async (request, newStatus, managerResponse) => {
    try {
      await VacationRequest.update(request.id, {
        status: newStatus,
        manager_response: managerResponse,
        response_date: new Date().toISOString()
      });

      loadData();
    } catch (error) {
      console.error("Error updating request status:", error);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingRequest(null);
    setIsFormOpen(true);
  };

  const isFullAdmin = currentUser?.role === 'admin';
  const hasManagementPermission = currentUser?.permissions?.includes('manage_vacations');

  const requestsToShow = vacationRequests.filter(req => {
      if (filter !== 'all' && req.status !== filter) return false;
      return true;
  });

  if (isLoading) {
      return <p>טוען...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto">
       <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול חופשות</h1>
            <p className="text-gray-500">הגשת בקשות חופשה ומעקב אחר סטטוס.</p>
          </div>
          <Button onClick={handleCreateNew} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 ml-2" />
            בקשת חופשה
          </Button>
        </div>

        {/* Vacation Balance Card for Regular Users */}
        {!isFullAdmin && vacationBalance && (
          <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Calendar className="w-5 h-5" />
                מאזן ימי חופש לשנת {new Date().getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-2">זכאות שנתית</p>
                  <p className="text-4xl font-bold text-blue-700">{vacationBalance.allowed}</p>
                  <p className="text-xs text-gray-500 mt-1">ימי עבודה</p>
                </div>
                <div className="bg-white/70 rounded-lg p-4 border border-orange-100">
                  <p className="text-sm text-gray-600 mb-2">נוצלו השנה</p>
                  <p className="text-4xl font-bold text-orange-600">{vacationBalance.used}</p>
                  <p className="text-xs text-gray-500 mt-1">ימי עבודה</p>
                </div>
                <div className="bg-white/70 rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-gray-600 mb-2">יתרה זמינה</p>
                  <p className="text-4xl font-bold text-green-600">{vacationBalance.remaining}</p>
                  <p className="text-xs text-gray-500 mt-1">ימי עבודה</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) {
                setEditingRequest(null);
            }
        }}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle>{editingRequest ? 'עריכת בקשת חופשה' : 'טופס בקשת חופשה'}</DialogTitle>
                </DialogHeader>
                 <div className="py-4">
                    <VacationRequestForm
                        currentUser={currentUser}
                        request={editingRequest}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsFormOpen(false);
                            setEditingRequest(null);
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>

        <div className="grid lg:grid-cols-4 gap-6 mb-6">
           <VacationSummary
              requests={vacationRequests}
              isManager={isFullAdmin || hasManagementPermission}
            />
        </div>

        <Card className="shadow-md bg-white">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>בקשות חופשה</CardTitle>
                    {isFullAdmin && (
                        <div className="flex gap-2">
                            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>הכל</Button>
                            <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}><Clock className="w-4 h-4 ml-2"/>ממתינות</Button>
                            <Button variant={filter === 'approved' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('approved')}><CheckCircle className="w-4 h-4 ml-2"/>מאושרות</Button>
                            <Button variant={filter === 'rejected' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('rejected')}><XCircle className="w-4 h-4 ml-2"/>נדחו</Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
            {requestsToShow.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    <p>לא נמצאו בקשות חופשה.</p>
                </div>
            )}
            {requestsToShow.map((request) => (
                <VacationRequestCard
                key={request.id}
                request={request}
                isManager={isFullAdmin || hasManagementPermission}
                onStatusUpdate={handleStatusUpdate}
                onEdit={handleEdit}
                currentUserId={currentUser?.id}
                />
            ))}
            </CardContent>
        </Card>
    </div>
  );
}