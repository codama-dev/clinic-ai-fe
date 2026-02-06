import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Check, CheckCircle, Clock, Loader2, Eye, CheckCheck, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
    pending: {
        label: 'ממתין לאישור',
        icon: <Clock className="w-3 h-3 mr-1" />,
        badgeClass: 'bg-yellow-100 text-yellow-800'
    },
    approved: {
        label: 'אושר להגשה',
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
        badgeClass: 'bg-green-100 text-green-800'
    },
    submitted: {
        label: 'הוגשה תביעה',
        icon: <CheckCheck className="w-3 h-3 mr-1" />,
        badgeClass: 'bg-blue-100 text-blue-800'
    }
};


export default function ClinicCaseCard({ caseItem, onEditOrView, onApprove, onSubmitClaim, onDelete, currentUser, isApproving = false, isSubmittingClaim = false }) {
    const isDoctor = currentUser?.job === 'doctor';
    const isAdmin = currentUser?.role === 'admin';
    const canEdit = currentUser?.email === caseItem.created_by;
    const canDelete = caseItem.status === 'pending' && (canEdit || isAdmin);
    const currentStatusConfig = STATUS_CONFIG[caseItem.status] || STATUS_CONFIG.pending;
    
    // Check if case hasn't been updated for more than 2 days
    const isOverdue = () => {
        if (caseItem.status === 'submitted') return false;
        const updatedDate = new Date(caseItem.updated_date);
        const now = new Date();
        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
        return (now - updatedDate) > twoDaysInMs;
    };
    
    const overdue = isOverdue();

    const renderFooterButtons = () => {
        const viewOrEditButton = (
            <Button variant="outline" className="w-full md:w-auto" onClick={() => onEditOrView(caseItem)}>
                {canEdit && caseItem.status === 'pending' ? <Edit className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
                {canEdit && caseItem.status === 'pending' ? 'ערוך' : 'צפה'}
            </Button>
        );

        if (caseItem.status === 'pending') {
            return (
                <div className="flex flex-col md:flex-row gap-2 w-full">
                    {viewOrEditButton}
                    {isDoctor && (
                        <Button 
                            className="w-full md:w-auto bg-green-600 hover:bg-green-700" 
                            onClick={() => onApprove(caseItem.id)}
                            disabled={isApproving}
                        >
                            {isApproving ? <Loader2 className="w-4 h-4 ml-2 animate-spin"/> : <Check className="w-4 h-4 ml-2" />}
                            אשר להגשה
                        </Button>
                    )}
                    {canDelete && onDelete && (
                        <Button 
                            variant="destructive"
                            className="w-full md:w-auto" 
                            onClick={() => onDelete(caseItem)}
                        >
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק
                        </Button>
                    )}
                </div>
            );
        }

        if (caseItem.status === 'approved') {
            return (
                <div className="flex flex-col md:flex-row gap-2 w-full">
                     {viewOrEditButton}
                     <Button 
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700" 
                        onClick={() => onSubmitClaim(caseItem.id)}
                        disabled={isSubmittingClaim}
                    >
                        {isSubmittingClaim ? <Loader2 className="w-4 h-4 ml-2 animate-spin"/> : <CheckCheck className="w-4 h-4 ml-2" />}
                        הוגשה תביעה
                    </Button>
                </div>
            );
        }

        // For 'submitted' or any other status
        return viewOrEditButton;
    };


    return (
        <Card className={`w-full ${overdue ? 'bg-red-50 border-2 border-red-300' : caseItem.status === 'pending' ? 'bg-white' : 'bg-gray-50/50'}`}>
            <CardContent className="p-4">
                {overdue && (
                    <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded-md flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-700">תיק לא טופל מעל יומיים!</span>
                    </div>
                )}
                <div className="flex flex-col md:flex-row md:items-start gap-4 w-full">
                    {/* Primary Info */}
                    <div className="flex-shrink-0 w-full md:w-48">
                        <p className="font-bold text-lg">{caseItem.client_name}</p>
                        <p className="text-sm text-gray-500">תיק מס' {caseItem.case_number}</p>
                        <Badge variant='secondary' className={`mt-2 ${currentStatusConfig.badgeClass}`}>
                            {currentStatusConfig.icon}
                            {currentStatusConfig.label}
                        </Badge>
                    </div>

                    {/* Treatments */}
                    <div className="flex-grow w-full md:w-auto border-t md:border-t-0 md:border-r md:pr-4 pt-4 md:pt-0">
                         <h4 className="font-semibold text-sm mb-2">טיפולים:</h4>
                         {caseItem.treatments?.length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                {caseItem.treatments.map((treatment, index) => (
                                    <div key={index} className="text-xs p-2 bg-gray-100 rounded-md">
                                        <p className="font-bold">{new Date(treatment.visit_date).toLocaleDateString('he-IL')}</p>
                                        <p className="text-gray-600">{treatment.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-gray-500">אין רשומות טיפולים.</p>}
                    </div>

                    {/* Meta Info & Actions */}
                    <div className="flex-shrink-0 w-full md:w-72 flex flex-col justify-between gap-4 border-t md:border-t-0 md:border-r md:pr-4 pt-4 md:pt-0">
                        <div>
                             <p className="text-sm mb-2">
                                <span className="font-semibold">נפתח ע"י:</span> {caseItem.created_by_name || caseItem.created_by}
                            </p>
                            <div className="text-xs text-gray-600 space-y-1">
                                {caseItem.status !== 'pending' && caseItem.approved_by && (
                                    <p>
                                        אושר על ידי <span className="font-semibold">{caseItem.approved_by}</span> ב-{new Date(caseItem.approval_date).toLocaleDateString('he-IL')}
                                    </p>
                                )}
                                {caseItem.status === 'submitted' && caseItem.submitted_by && (
                                    <p>
                                        הוגשה על ידי <span className="font-semibold">{caseItem.submitted_by}</span> ב-{new Date(caseItem.submission_date).toLocaleDateString('he-IL')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="mt-auto">
                            {renderFooterButtons()}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}