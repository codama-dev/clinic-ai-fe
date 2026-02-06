import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Clock, DollarSign, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppointmentTypeForm from "../components/appointments/AppointmentTypeForm";
import { toast } from "sonner";

const ROOM_TYPE_NAMES = {
  examination: "חדר בדיקה",
  surgery: "חדר ניתוח",
  laboratory: "מעבדה",
  imaging: "צילום",
  any: "כל חדר"
};

export default function AppointmentTypesManagerPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: appointmentTypes = [], isLoading } = useQuery({
    queryKey: ['appointmentTypes'],
    queryFn: () => base44.entities.AppointmentType.list('-created_date', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppointmentType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointmentTypes']);
      setIsFormOpen(false);
      setEditingType(null);
      toast.success('סוג הביקור נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppointmentType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointmentTypes']);
      setIsFormOpen(false);
      setEditingType(null);
      toast.success('סוג הביקור עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppointmentType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointmentTypes']);
      toast.success('סוג הביקור נמחק בהצלחה');
    }
  });

  const handleSubmit = (data) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (appointmentType) => {
    if (window.confirm(`האם למחוק את סוג הביקור "${appointmentType.name}"?`)) {
      deleteMutation.mutate(appointmentType.id);
    }
  };

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_appointments');

  if (!currentUser) {
    return <div className="text-center py-12">טוען...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">אין הרשאת גישה</h2>
            <p className="text-gray-600">אין לך הרשאה לנהל סוגי ביקור.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול סוגי ביקור</h1>
          <p className="text-gray-500">הגדרת זמני ביקור ומחירים</p>
        </div>
        <Button onClick={() => { setEditingType(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 ml-2" />
          סוג ביקור חדש
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingType ? 'עריכת סוג ביקור' : 'סוג ביקור חדש'}</DialogTitle>
          </DialogHeader>
          <AppointmentTypeForm
            appointmentType={editingType}
            onSubmit={handleSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingType(null); }}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-center py-8">טוען סוגי ביקור...</p>
      ) : appointmentTypes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">אין סוגי ביקור מוגדרים</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>שם הביקור</TableHead>
                  <TableHead>משך</TableHead>
                  <TableHead>מחיר</TableHead>
                  <TableHead>סוג חדר</TableHead>
                  <TableHead>תיאור</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead className="text-center">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointmentTypes.map((type, index) => (
                  <TableRow key={type.id} className="hover:bg-gray-50">
                    <TableCell className="text-gray-500 font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{type.duration_minutes} דק'</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold">
                        <DollarSign className="w-3 h-3 text-gray-400" />
                        <span>₪{type.base_price}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ROOM_TYPE_NAMES[type.requires_room_type]}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {type.description ? (
                        <span className="text-sm text-gray-600 truncate block">{type.description}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? 'default' : 'secondary'}>
                        {type.is_active ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingType(type); setIsFormOpen(true); }}
                          title="ערוך"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(type)}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}