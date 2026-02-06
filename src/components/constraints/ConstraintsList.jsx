import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CalendarOff, UserX, Trash2, CalendarX } from "lucide-react";
import { format, addDays } from "date-fns";
import { getHolidayForDate } from '@/components/utils/holidays';

const DAYS_HE_SHORT = { sunday: "א'", monday: "ב'", tuesday: "ג'", wednesday: "ד'", thursday: "ה'", friday: "ו'", saturday: "שבת" };
const SHIFTS_HE = { morning: "בוקר", evening: "ערב" };
const DAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function ConstraintsList({ constraints, currentWeek, onDelete, onCancelShift, isLoading }) {
  const weeklyHolidays = useMemo(() => {
    return DAYS_EN.map((day, index) => {
      const date = addDays(currentWeek, index);
      const holiday = getHolidayForDate(date);
      return holiday ? { day, dayKey: day, name: holiday.name, type: holiday.type, date: format(date, 'dd/MM') } : null;
    }).filter(Boolean);
  }, [currentWeek]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="w-6 h-6 text-purple-600" />
          אילוצי השבוע
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p>טוען אילוצים...</p>}
        {!isLoading && constraints.length === 0 && weeklyHolidays.length === 0 && (
          <p className="text-sm text-center text-gray-500 py-8">אין אילוצים או חגים בשבוע זה.</p>
        )}
        
        <div className="space-y-4">
          {weeklyHolidays.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-md text-gray-800 flex items-center gap-2"><CalendarX className="w-5 h-5 text-red-500"/> חגים וימי חופש</h4>
              {weeklyHolidays.map(holiday => (
                <div key={holiday.day} className="p-3 bg-red-50 border-r-4 border-red-300 rounded">
                  <p className="font-semibold text-red-800">{holiday.name} - {DAYS_HE_SHORT[holiday.dayKey]} ({holiday.date})</p>
                  <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center pl-2">
                        <span className="text-sm text-gray-700">משמרת בוקר</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancelShift(holiday.dayKey, 'morning')}
                          className="text-red-600 hover:bg-red-100 hover:text-red-700 h-8"
                          title="בטל את כל השיבוצים במשמרת הבוקר"
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          בטל
                        </Button>
                      </div>
                      <div className="flex justify-between items-center pl-2">
                        <span className="text-sm text-gray-700">משמרת ערב</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancelShift(holiday.dayKey, 'evening')}
                          className="text-red-600 hover:bg-red-100 hover:text-red-700 h-8"
                          title="בטל את כל השיבוצים במשמרת הערב"
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          בטל
                        </Button>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          )}

          {constraints.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-md text-gray-800 flex items-center gap-2"><UserX className="w-5 h-5 text-blue-500"/>אילוצי עובדים</h4>
              {constraints.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{c.employee_name}</span>
                    <span className="text-sm text-gray-600">
                      {DAYS_HE_SHORT[c.unavailable_day]} - {SHIFTS_HE[c.unavailable_shift]}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => onDelete(c.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}