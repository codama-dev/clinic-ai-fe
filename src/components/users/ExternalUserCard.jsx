import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExternalEmployee } from "@/entities/ExternalEmployee";
import { Edit, Trash, MoreVertical, Briefcase } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const JOB_NAMES = { doctor: "רופא/ה", assistant: "אסיסטנט/ית", receptionist: "קבלה" };
const JOB_COLORS = { doctor: "bg-purple-100 text-purple-800", assistant: "bg-blue-100 text-blue-800", receptionist: "bg-orange-100 text-orange-800" };

export default function ExternalUserCard({ employee, onEdit, onDelete, onStatusChange }) {
    
  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  const handleStatusToggle = async (isActive) => {
    await ExternalEmployee.update(employee.id, { is_active: isActive });
    onStatusChange();
  };
  
  return (
    <Card className={`bg-white shadow-md transition-opacity border-l-4 border-gray-400 ${!employee.is_active && 'opacity-60'}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gray-100 text-gray-600 font-semibold">{getInitials(employee.name)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="text-lg">{employee.name}</CardTitle>
                <Badge variant="outline" className="text-xs text-gray-500 mt-1">עובד חיצוני</Badge>
            </div>
        </div>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(employee)}>
                    <Edit className="w-4 h-4 ml-2" />
                    ערוך פרטים
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(employee)} className="text-red-600">
                    <Trash className="w-4 h-4 ml-2" />
                    מחק עובד
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-gray-600">
            {employee.job && 
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400"/>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${JOB_COLORS[employee.job] || 'bg-gray-100 text-gray-800'}`}>
                        {JOB_NAMES[employee.job] || employee.job}
                    </span>
                </div>
            }
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 space-x-reverse">
                <Switch id={`active-ext-${employee.id}`} checked={employee.is_active} onCheckedChange={handleStatusToggle} />
                <Label htmlFor={`active-ext-${employee.id}`} className="text-sm">
                  {employee.is_active ? "פעיל" : "לא פעיל"}
                </Label>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}