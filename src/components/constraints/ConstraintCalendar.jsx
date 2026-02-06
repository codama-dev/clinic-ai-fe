
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Ban } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { getHolidayForDate } from '@/components/utils/holidays';

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAYS_HE_SHORT = { sunday: "א'", monday: "ב'", tuesday: "ג'", wednesday: "ד'", thursday: "ה'", friday: "ו'", saturday: "שבת" };

const getShiftType = (startTime) => {
    if (!startTime) return 'morning';
    const hour = parseInt(startTime.split(':')[0]);
    return hour < 14 ? 'morning' : 'evening';
};

export default function ConstraintCalendar({ currentWeek, shiftTemplates, constraints, currentUserId, onSelectShift, onDeleteConstraint, canSubmit }) {
    const userConstraints = constraints.filter(c => c.employee_id === currentUserId);
    const hasReachedQuota = !canSubmit; // canSubmit prop now reflects both deadline and quota

    return (
        <div dir="rtl" className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="grid grid-cols-7 bg-gray-50">
                {DAYS.map((day, index) => {
                    const dayDate = addDays(currentWeek, index);
                    const specialDay = getHolidayForDate(dayDate);
                    return (
                        <div key={day} className="text-center p-2 border-l last:border-l-0">
                            <div className="font-bold text-sm text-gray-700">{DAYS_HE_SHORT[day]}</div>
                            <div className="text-xs text-gray-500">{format(dayDate, 'd/M')}</div>
                            {specialDay && (
                                <Badge 
                                    variant={specialDay.type === 'holiday' ? "destructive" : "default"} 
                                    className={`text-[10px] p-0.5 px-1 mt-1 ${
                                        specialDay.type === 'holiday' 
                                            ? 'bg-red-100 text-red-800 border-red-200' 
                                            : 'bg-blue-100 text-blue-800 border-blue-200'
                                    }`}
                                >
                                    {specialDay.name}
                                </Badge>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="grid grid-cols-1 divide-y divide-gray-200">
                {shiftTemplates.map(template => (
                    <div key={template.id} className="grid grid-cols-7">
                        {DAYS.map(day => {
                            if (day === 'saturday' || (day === 'friday' && getShiftType(template.start_time) === 'evening')) {
                                return <div key={`${template.id}-${day}`} className="p-2 border-l last:border-l-0 bg-gray-50"></div>;
                            }

                            const shiftType = getShiftType(template.start_time);
                            const isThisShiftUserConstraint = userConstraints.some(c => c.unavailable_day === day && c.unavailable_shift === shiftType);
                            
                            const isDisabledByQuota = hasReachedQuota && !isThisShiftUserConstraint;

                            let cellClass = "p-2 border-l last:border-l-0 h-24 flex flex-col justify-between items-center text-center transition-colors";
                            
                            if (isThisShiftUserConstraint) {
                                cellClass += " bg-red-50 border-red-200";
                            } else if (isDisabledByQuota) {
                                cellClass += " bg-gray-100 text-gray-400";
                            } else {
                                cellClass += " hover:bg-green-50";
                            }
                            
                            return (
                                <div key={`${template.id}-${day}`} className={cellClass}>
                                    <div className="text-xs font-semibold text-gray-800">{template.name}</div>
                                    <div className="text-xs text-gray-500">{template.start_time}-{template.end_time}</div>
                                    
                                    {isThisShiftUserConstraint ? (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:bg-red-100" 
                                            onClick={() => onDeleteConstraint(userConstraints.find(c => c.unavailable_day === day && c.unavailable_shift === shiftType).id)}
                                        >
                                            <X className="w-4 h-4 ml-1"/> בטל
                                        </Button>
                                    ) : (
                                       <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            disabled={isDisabledByQuota}
                                            onClick={() => onSelectShift({ day, shift: shiftType, templateName: template.name })}
                                            className="disabled:cursor-not-allowed text-gray-400 hover:text-green-600 hover:bg-green-100"
                                            title={isDisabledByQuota ? "הגעת למכסת האילוצים שלך" : "הגש אילוץ"}
                                        >
                                            {isDisabledByQuota ? <Ban className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
