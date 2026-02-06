import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Calendar, Edit, FileText, AlertCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const STATUS_CONFIG = {
  pending: { label: "ממתין לאישור", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  approved: { label: "אושר", color: "bg-green-100 text-green-800 border-green-300" },
  rejected: { label: "נדחה", color: "bg-red-100 text-red-800 border-red-300" },
};

const VACATION_TYPE_CONFIG = {
  regular: { label: "חופשה רגילה", color: "bg-blue-100 text-blue-800", icon: Calendar },
  sick_leave: { label: "חופשת מחלה", color: "bg-red-100 text-red-800", icon: AlertCircle },
  unpaid_leave: { label: "חופשה ללא תשלום", color: "bg-gray-100 text-gray-800", icon: FileText },
};

export default function VacationRequestCard({ request, isManager, onStatusUpdate, onEdit, currentUserId }) {
  const [showResponse, setShowResponse] = useState(false);
  const [response, setResponse] = useState(request.manager_response || "");
  const [editMode, setEditMode] = useState(false);
  const { label, color } = STATUS_CONFIG[request.status];
  const vacationType = VACATION_TYPE_CONFIG[request.vacation_type] || VACATION_TYPE_CONFIG.regular;
  const VacationIcon = vacationType.icon;
  
  const handleUpdate = (newStatus) => {
      onStatusUpdate(request, newStatus, response);
      setShowResponse(false);
      setEditMode(false);
  };

  const handleEditResponse = () => {
      setEditMode(true);
      setShowResponse(true);
      setResponse(request.manager_response || "");
  };

  const handleCancelEdit = () => {
      setEditMode(false);
      setShowResponse(false);
      setResponse(request.manager_response || "");
  };

  const isOwner = request.employee_id === currentUserId;
  const isSickLeave = request.vacation_type === 'sick_leave';

  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${isSickLeave ? 'border-red-200 bg-red-50/30' : 'bg-white'}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-semibold">{isManager && !isOwner ? request.employee_name : 'בקשת חופשה'}</CardTitle>
                  <Badge className={`${vacationType.color} text-xs flex items-center gap-1`}>
                    <VacationIcon className="w-3 h-3" />
                    {vacationType.label}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4"/>
                    <span>{format(new Date(request.start_date), 'd/M/yy')} - {format(new Date(request.end_date), 'd/M/yy')}</span>
                    <span className="text-gray-400">|</span>
                    <span>{request.total_days} ימים</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isOwner && (
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(request)}>
                        <Edit className="w-4 h-4 text-gray-500" />
                    </Button>
                )}
                <Badge className={`${color} text-xs`}>{label}</Badge>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {request.reason && <p className="text-sm text-gray-600"><strong>סיבה:</strong> {request.reason}</p>}
        
        {isSickLeave && request.medical_document_url && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <a 
              href={request.medical_document_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-orange-700 hover:text-orange-900 font-medium inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              צפה באישור רפואי מצורף
            </a>
          </div>
        )}
        
        {request.status !== 'pending' && !editMode && (
            <div className="mt-2 pt-2 border-t">
                <div className="flex items-start justify-between gap-2">
                    {request.manager_response ? (
                        <p className="text-sm text-gray-600 flex-1">
                            <strong>תגובת מנהל:</strong> {request.manager_response}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400 italic flex-1">
                            אין תגובת מנהל
                        </p>
                    )}
                    {isManager && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 flex-shrink-0" 
                            onClick={handleEditResponse}
                            title="ערוך תשובה"
                        >
                            <Edit className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                    )}
                </div>
            </div>
        )}

        {request.response_date && (
            <p className="text-xs text-gray-400 mt-2">
                נענה בתאריך: {format(new Date(request.response_date), 'dd/MM/yyyy HH:mm', { locale: he })}
            </p>
        )}
      </CardContent>
      {isManager && (request.status === 'pending' || editMode) && (
        <CardFooter className="flex flex-col items-start gap-2">
           {!showResponse && !editMode ? (
                <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setShowResponse(true)}>הוסף תגובה ועדכן סטטוס</Button>
           ) : (
             <div className="w-full space-y-2">
                <Textarea 
                    placeholder="תגובת מנהל (אופציונלי)" 
                    value={response} 
                    onChange={e => setResponse(e.target.value)}
                    className="min-h-[80px]"
                />
                <div className="flex gap-2 flex-wrap">
                    {editMode ? (
                        <>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleCancelEdit}
                            >
                                <X className="w-4 h-4 ml-1"/>
                                ביטול
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 border-red-300 hover:bg-red-50" 
                                onClick={() => handleUpdate('rejected')}
                            >
                                <X className="w-4 h-4 ml-1"/>
                                שנה לדחייה
                            </Button>
                            <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700" 
                                onClick={() => handleUpdate('approved')}
                            >
                                <Check className="w-4 h-4 ml-1"/>
                                שנה לאישור
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline"
                                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50" 
                                onClick={() => handleUpdate('pending')}
                            >
                                <RotateCcw className="w-4 h-4 ml-1"/>
                                החזר לממתין
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 border-red-300 hover:bg-red-50" 
                                onClick={() => handleUpdate('rejected')}
                            >
                                <X className="w-4 h-4 ml-1"/>
                                דחייה
                            </Button>
                            <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700" 
                                onClick={() => handleUpdate('approved')}
                            >
                                <Check className="w-4 h-4 ml-1"/>
                                אישור
                            </Button>
                        </>
                    )}
                </div>
             </div>
           )}
        </CardFooter>
      )}
    </Card>
  );
}