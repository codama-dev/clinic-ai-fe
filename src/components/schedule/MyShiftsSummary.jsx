
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';

const DAYS_HE = {
  sunday: "יום א'", monday: "יום ב'", tuesday: "יום ג'", wednesday: "יום ד'",
  thursday: "יום ה'", friday: "יום ו'", saturday: "שבת"
};
const SHIFTS_HE = { morning: "בוקר", evening: "ערב" };

export default function MyShiftsSummary({ schedule, currentUser, currentWeek, shiftTemplates }) {
    if (!currentUser || !schedule) {
        return null;
    }

    const myShifts = [];
    const userDisplayName = currentUser.display_name || currentUser.full_name;

    Object.entries(schedule).forEach(([dayKey, shifts]) => {
        const dayIndex = Object.keys(DAYS_HE).indexOf(dayKey);
        if (dayIndex === -1 || !shifts) return;

        const dayDate = addDays(startOfWeek(currentWeek, { weekStartsOn: 0 }), dayIndex);

        Object.entries(shifts).forEach(([shiftKey, employees]) => {
            if (Array.isArray(employees) && employees.includes(userDisplayName)) {
                 const template = (shiftTemplates || []).find(t => {
                    // Safely parse hour, defaulting to 0 if split or parse fails
                    const hourString = t.start_time ? t.start_time.split(':')[0] : '0';
                    const hour = parseInt(hourString, 10);
                    
                    if (shiftKey === 'morning') return hour < 14;
                    if (shiftKey === 'evening') return hour >= 14;
                    return false;
                });

                myShifts.push({
                    id: `${dayKey}-${shiftKey}`,
                    day: DAYS_HE[dayKey],
                    date: format(dayDate, 'd/M'),
                    shift: template ? template.name : SHIFTS_HE[shiftKey],
                    time: template ? `${template.start_time} - ${template.end_time}` : '',
                    dayIndex: dayIndex, // for sorting
                });
            }
        });
    });

    // Add weekend on-call shift if the user is assigned
    if (Array.isArray(schedule.weekend_oncall) && schedule.weekend_oncall.includes(userDisplayName)) {
        myShifts.push({
            id: 'weekend-oncall',
            day: 'סוף שבוע',
            date: 'שישי-שבת',
            shift: 'כוננות',
            time: '',
            dayIndex: 6, // To sort it at the end of the week (Saturday)
        });
    }

    // Sort shifts chronologically by day of the week
    myShifts.sort((a, b) => a.dayIndex - b.dayIndex);

    return (
        <Card className="mb-6 bg-purple-50 border-purple-200 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Star className="w-5 h-5" />
                    <span>המשמרות שלי לשבוע זה</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {myShifts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {myShifts.map(shift => (
                            <div key={shift.id} className="p-3 bg-white rounded-lg border border-purple-100 text-center shadow-sm">
                                <p className="font-bold text-gray-800">{shift.day}</p>
                                <p className="text-sm text-gray-500">{shift.date}</p>
                                <p className="text-sm font-semibold text-purple-700 mt-1">{shift.shift}</p>
                                {shift.time && <p className="text-xs text-gray-500">{shift.time}</p>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-600 py-2">אין לך משמרות משובצות לשבוע זה.</p>
                )}
            </CardContent>
        </Card>
    );
}
