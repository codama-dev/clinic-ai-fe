import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, UserCheck, Users, Edit } from 'lucide-react';
import { ShiftTemplate } from '@/entities/ShiftTemplate';

const ROLES_HE = {
  doctor: "רופא/ה",
  assistant: "אסיסטנט/ית",
  receptionist: "קבלה"
};


export default function ShiftTemplateCard({ template, onEdit, onStatusChange }) {
  
  const handleStatusChange = async (checked) => {
    try {
      await ShiftTemplate.update(template.id, { is_active: checked });
      onStatusChange(); // Refresh the list
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const totalMin = Object.values(template.staffing_requirements || {}).reduce((sum, role) => sum + (role.min || 0), 0);
  const totalMax = Object.values(template.staffing_requirements || {}).reduce((sum, role) => sum + (role.max || 0), 0);

  return (
    <Card className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow bg-white">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{template.name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{template.start_time} - {template.end_time}</span>
                </div>
            </div>
            <Badge variant={template.is_active ? 'default' : 'secondary'} className={template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {template.is_active ? 'פעיל' : 'לא פעיל'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">דרישות איוש:</h4>
            <div className="pl-2 space-y-2">
            {Object.entries(template.staffing_requirements || {}).map(([role, req]) => {
                if (req.min > 0 || req.max > 0) {
                    return (
                        <div key={role} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-gray-600">
                                <UserCheck className="w-4 h-4 text-purple-500" />
                                {ROLES_HE[role] || role}
                            </span>
                            <Badge variant="outline">מינימום: {req.min}, מקסימום: {req.max}</Badge>
                        </div>
                    )
                }
                return null;
            })}
            </div>
             <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="flex items-center gap-2 font-bold text-gray-800">
                    <Users className="w-4 h-4 text-purple-600" />
                    סה"כ עובדים במשמרת
                </span>
                <Badge>מינימום: {totalMin}, מקסימום: {totalMax}</Badge>
            </div>
          </div>
      </CardContent>
      <CardFooter className="bg-gray-50/50 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Switch
              checked={template.is_active}
              onCheckedChange={handleStatusChange}
              aria-label="Toggle shift status"
            />
             <span className="text-xs text-gray-500">{template.is_active ? 'השבת' : 'הפעל'}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
          <Edit className="w-4 h-4 ml-2" />
          ערוך
        </Button>
      </CardFooter>
    </Card>
  );
}