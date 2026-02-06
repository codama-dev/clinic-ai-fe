
import React from "react";
import { User, Sun, Moon, Star, Clock, Ban, Plane } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ShiftCard({ shiftTitle, startTime, endTime, employees, isLoading, isLocked, currentUserEmployeeName, isConstrained, receptionCoverage = [], isUserOnVacation }) {
  const isMorning = startTime ? parseInt(startTime.split(':')[0]) < 14 : shiftTitle.toLowerCase().includes('בוקר');
  const isCurrentUserInShift = employees.includes(currentUserEmployeeName);
  
  const showLargeConstraint = isConstrained && !isCurrentUserInShift && employees.length === 0;

  if (isLoading) {
    return (
      <div className="p-3 border rounded-lg bg-gray-50/50">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative p-3 border rounded-lg bg-white/50 h-full flex flex-col justify-between border-t-4 ${isMorning ? 'border-t-amber-400' : 'border-t-indigo-400'}`}>
      <div className={(isLocked || showLargeConstraint || isUserOnVacation) ? 'opacity-30' : ''}>
        <div className="text-center border-b pb-2 mb-3">
            <div className="flex items-center justify-center gap-2">
              {isMorning ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              <span className="font-bold text-md text-gray-800">{shiftTitle}</span>
            </div>
            {startTime && endTime && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{startTime} - {endTime}</span>
              </div>
            )}
        </div>
        <div className="space-y-1.5">
          {employees.length > 0 ? (
            employees.map((employee, index) => {
              const isCurrentUser = employee === currentUserEmployeeName;
              const isCoveringReception = receptionCoverage.includes(employee);
              return (
                <div 
                  key={index} 
                  className={`flex items-center justify-between text-sm rounded-md p-1 -m-1 ${isCurrentUser ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300' : 'text-gray-800'}`}
                >
                  <div className="flex items-center gap-2">
                    {isCurrentUser ? <Star className="w-3.5 h-3.5 text-purple-600" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                    <span className={isCurrentUser ? 'font-bold' : ''}>{employee}</span>
                  </div>
                  {isCoveringReception && (
                    <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                        קבלה
                    </Badge>
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-xs text-center text-gray-400 py-2">אין שיבוץ</p>
          )}
        </div>
      </div>
      
      {/* --- Overlays --- */}
      {isLocked && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center rounded-lg"
          title="אין פעילות במשמרת זו"
        >
          <Ban className="w-8 h-8 text-slate-500 mb-2" />
          <span className="font-semibold text-slate-700">אין פעילות</span>
        </div>
      )}

      {!isLocked && showLargeConstraint && (
        <div 
          className="absolute inset-0 flex items-center justify-center rounded-lg"
          title="יש לך אילוץ על משמרת זו"
        >
          <Ban className="w-10 h-10 text-red-400" />
        </div>
      )}

      {/* Small icon for constrained shifts that ARE filled */}
      {isConstrained && !isCurrentUserInShift && employees.length > 0 && (
          <div title="יש לך אילוץ על משמרת זו" className="absolute top-1.5 right-1.5">
              <Ban className="w-4 h-4 text-red-400/80" />
          </div>
      )}

      {isUserOnVacation && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center rounded-lg"
          style={{
              backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(219, 234, 254, 0.4) 10px, rgba(219, 234, 254, 0.4) 20px)'
          }}
          title="את/ה בחופשה ביום זה"
        >
          <Plane className="w-8 h-8 text-blue-600 mb-2 opacity-90" />
          <span className="font-semibold text-blue-800 bg-white/70 px-2 py-1 rounded-md shadow">בחופשה</span>
        </div>
      )}
    </div>
  );
}
