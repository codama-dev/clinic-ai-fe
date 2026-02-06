import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, startOfWeek, endOfWeek } from "date-fns";

export default function WeekSelector({ currentWeek, onWeekChange }) {
  const handleWeekChange = (weeks) => {
    onWeekChange(addWeeks(currentWeek, weeks));
  };
  
  const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const end = endOfWeek(currentWeek, { weekStartsOn: 0 });
  
  // Check if the selected week is the current week
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
  const isCurrentWeek = start.getTime() === currentWeekStart.getTime();

  return (
    <div className="flex items-center gap-2" dir="ltr">
      <Button variant="outline" size="icon" onClick={() => handleWeekChange(1)}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className={`rounded-md px-6 py-3 border-2 shadow-md min-w-[260px] text-center transition-all ${
        isCurrentWeek 
          ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-400' 
          : 'bg-white border-gray-300'
      }`}>
        <div className={`font-bold text-lg ${isCurrentWeek ? 'text-purple-700' : 'text-gray-800'}`}>
          {format(start, 'dd/MM/yyyy')} - {format(end, 'dd/MM/yyyy')}
        </div>
        {isCurrentWeek && (
          <div className="text-xs text-purple-600 font-medium mt-0.5">שבוע נוכחי</div>
        )}
      </div>
      <Button variant="outline" size="icon" onClick={() => handleWeekChange(-1)}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}