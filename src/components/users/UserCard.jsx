
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { User as UserSDK } from "@/entities/User";
import { Edit, Mail, Phone, Trash, Shield, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const JOB_NAMES = { doctor: "רופא/ה", assistant: "אסיסטנט/ית", receptionist: "קבלה", admin: "מנהל מערכת" };
const JOB_COLORS = { doctor: "bg-purple-100 text-purple-800", assistant: "bg-blue-100 text-blue-800", receptionist: "bg-orange-100 text-orange-800", admin: "bg-red-100 text-red-800" };

export default function UserCard({ user, onEdit, onDelete, onStatusChange }) {
    
  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  const handleStatusToggle = async (isActive) => {
    await UserSDK.update(user.id, { is_active: isActive });
    onStatusChange();
  };

  const handleApprovalToggle = async (isApproved) => {
    await UserSDK.update(user.id, { is_approved: isApproved });
    onStatusChange();
  };
  
  const permissionCount = user.permissions?.length || 0;
  const displayName = user.display_name || user.full_name;

  return (
    <Card className={`bg-white shadow-md transition-all ${!user.is_active ? 'opacity-60' : ''} ${!user.is_approved ? 'border-yellow-400 border-2' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
                <AvatarImage src={user.profile_image} />
                <AvatarFallback className="bg-gray-100 text-gray-600 font-semibold">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="text-lg">{displayName}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {!user.is_approved && <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">ממתין לאישור</Badge>}
                  {user.job && <Badge className={`${JOB_COLORS[user.job] || 'bg-gray-100 text-gray-800'} text-xs`}>{JOB_NAMES[user.job] || user.job}</Badge>}
                  {permissionCount > 0 && (
                    <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                      <Shield className="w-3 h-3 mr-1" />
                      {permissionCount} הרשאות
                    </Badge>
                  )}
                </div>
            </div>
        </div>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(user)}>
                    <Edit className="w-4 h-4 ml-2" />
                    ערוך פרטים
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(user)} className="text-red-600">
                    <Trash className="w-4 h-4 ml-2" />
                    מחק משתמש
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-gray-600">
            {user.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4"/><span>{user.email}</span></div>}
            {user.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4"/><span>{user.phone}</span></div>}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 space-x-reverse">
                <Switch id={`active-${user.id}`} checked={user.is_active} onCheckedChange={handleStatusToggle} />
                <Label htmlFor={`active-${user.id}`} className="text-sm">
                  {user.is_active ? "פעיל" : "לא פעיל"}
                </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
                <Switch id={`approved-${user.id}`} checked={user.is_approved} onCheckedChange={handleApprovalToggle} />
                <Label htmlFor={`approved-${user.id}`} className="text-sm">
                  {user.is_approved ? "מאושר" : "ממתין"}
                </Label>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
