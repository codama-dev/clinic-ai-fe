import React from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const DAYS_HE = { sunday: "יום א'", monday: "יום ב'", tuesday: "ג'", wednesday: "ד'", thursday: "ה'", friday: "ו'", saturday: "שבת" };
const SHIFTS_HE = { morning: "בוקר", evening: "ערב" };

export default function SubmitConstraintDialog({ isOpen, onClose, onSubmit, employeeName, shiftInfo }) {
  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>אישור הגשת אילוץ</AlertDialogTitle>
          <AlertDialogDescription>
            האם לאשר הגשת אילוץ אי-זמינות עבור <span className="font-bold text-purple-600">{employeeName}</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4 p-4 bg-gray-50 border rounded-lg space-y-2">
            <div>
                <span className="font-semibold text-gray-600">יום:</span> <Badge variant="outline">{DAYS_HE[shiftInfo.day]}</Badge>
            </div>
            <div>
                <span className="font-semibold text-gray-600">משמרת:</span> <Badge variant="outline">{shiftInfo.templateName} ({SHIFTS_HE[shiftInfo.shift]})</Badge>
            </div>
        </div>

        <p className="text-sm text-gray-500">
            לאחר האישור, לא יהיה ניתן להגיש אילוץ נוסף לשבוע זה, אלא אם תבטל/י את האילוץ הקיים.
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={onSubmit} className="bg-purple-600 hover:bg-purple-700">
            אני מאשר/ת
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}