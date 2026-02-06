import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, Calendar, Timer } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { he } from "date-fns/locale";

export default function TimeClockPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayEntry } = useQuery({
    queryKey: ['timeClockEntry', currentUser?.email, today],
    queryFn: async () => {
      const entries = await base44.entities.TimeClockEntry.filter({
        employee_email: currentUser.email,
        date: today
      });
      return entries[0] || null;
    },
    enabled: !!currentUser
  });

  const { data: recentEntries = [] } = useQuery({
    queryKey: ['recentTimeClockEntries', currentUser?.email],
    queryFn: async () => {
      const entries = await base44.entities.TimeClockEntry.filter({
        employee_email: currentUser.email
      }, '-date', 10);
      return entries;
    },
    enabled: !!currentUser
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      return await base44.entities.TimeClockEntry.create({
        employee_id: currentUser.id,
        employee_name: currentUser.display_name || currentUser.full_name,
        employee_email: currentUser.email,
        date: today,
        clock_in_time: timeString,
        status: 'clocked_in'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timeClockEntry']);
      queryClient.invalidateQueries(['recentTimeClockEntries']);
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const clockInParts = todayEntry.clock_in_time.split(':');
      const clockInDate = new Date();
      clockInDate.setHours(parseInt(clockInParts[0]), parseInt(clockInParts[1]), 0);
      
      const totalMinutes = differenceInMinutes(now, clockInDate);
      const totalHours = (totalMinutes / 60).toFixed(2);
      
      return await base44.entities.TimeClockEntry.update(todayEntry.id, {
        clock_out_time: timeString,
        total_hours: parseFloat(totalHours),
        status: 'clocked_out'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timeClockEntry']);
      queryClient.invalidateQueries(['recentTimeClockEntries']);
    }
  });

  const calculateDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '-';
    
    const [inHours, inMinutes] = clockIn.split(':').map(Number);
    const [outHours, outMinutes] = clockOut.split(':').map(Number);
    
    const inDate = new Date();
    inDate.setHours(inHours, inMinutes, 0);
    
    const outDate = new Date();
    outDate.setHours(outHours, outMinutes, 0);
    
    const diffMinutes = differenceInMinutes(outDate, inDate);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-8 h-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">שעון נוכחות</h1>
          <p className="text-gray-500">רישום כניסה ויציאה ממשמרות</p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-purple-900">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-xl text-purple-700">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: he })}
            </div>
            
            {todayEntry ? (
              <div className="space-y-4 mt-6">
                <div className="flex justify-center items-center gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border-2 border-green-300">
                    <div className="text-sm text-gray-600 mb-1">כניסה</div>
                    <div className="text-2xl font-bold text-green-700">{todayEntry.clock_in_time}</div>
                  </div>
                  
                  {todayEntry.clock_out_time && (
                    <div className="text-center p-4 bg-white rounded-lg border-2 border-red-300">
                      <div className="text-sm text-gray-600 mb-1">יציאה</div>
                      <div className="text-2xl font-bold text-red-700">{todayEntry.clock_out_time}</div>
                    </div>
                  )}
                </div>
                
                {todayEntry.status === 'clocked_in' ? (
                  <Button
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white text-xl py-6 px-12"
                  >
                    <LogOut className="w-6 h-6 ml-3" />
                    יציאה מהמשמרת
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Badge className="bg-green-600 text-white text-lg py-2 px-6">
                      ✓ המשמרת הסתיימה
                    </Badge>
                    <div className="text-lg text-gray-700">
                      סך שעות: <span className="font-bold">{todayEntry.total_hours?.toFixed(2)} שעות</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white text-xl py-6 px-12 mt-6"
              >
                <LogIn className="w-6 h-6 ml-3" />
                כניסה למשמרת
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            משמרות אחרונות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">אין רשומות</p>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">תאריך</div>
                      <div className="font-semibold">
                        {format(new Date(entry.date), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="h-8 w-px bg-gray-300" />
                    <div className="text-center">
                      <div className="text-xs text-gray-500">כניסה</div>
                      <div className="font-semibold text-green-700">{entry.clock_in_time}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">יציאה</div>
                      <div className="font-semibold text-red-700">
                        {entry.clock_out_time || '-'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {entry.total_hours && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Timer className="w-4 h-4" />
                        <span className="font-semibold">{entry.total_hours.toFixed(2)} שעות</span>
                      </div>
                    )}
                    <Badge className={
                      entry.status === 'clocked_out' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {entry.status === 'clocked_out' ? 'הושלם' : 'פעיל'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}