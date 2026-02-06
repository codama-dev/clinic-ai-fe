import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, Plane, GanttChartSquare, CheckSquare, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function EmployeeManagement() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: pendingVacations } = useQuery({
    queryKey: ['pendingVacationRequests'],
    queryFn: async () => {
      const results = await base44.entities.VacationRequest.filter({ status: 'pending' });
      return results;
    },
    enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_vacations')),
    refetchInterval: 30000,
  });

  const { data: pendingSchedules } = useQuery({
    queryKey: ['pendingScheduleApprovals'],
    queryFn: async () => {
      const results = await base44.entities.WeeklySchedule.filter({ approval_status: 'pending_approval' });
      return results;
    },
    enabled: !!currentUser && currentUser.role === 'admin',
    refetchInterval: 30000,
  });

  const hasPendingVacations = pendingVacations && pendingVacations.length > 0;
  const hasPendingSchedules = pendingSchedules && pendingSchedules.length > 0;

  const managementLinks = [
    { 
      id: 'manage_vacations', 
      title: "ניהול חופשות", 
      href: createPageUrl("VacationRequests"), 
      icon: Plane, 
      description: "אישור ודחייה של בקשות חופשה",
      showIndicator: hasPendingVacations,
      indicatorCount: pendingVacations?.length || 0,
      indicatorMessage: hasPendingVacations ? `${pendingVacations.length} בקשות חופשה ממתינות` : ''
    },
    { 
      id: 'manage_schedule', 
      title: "ניהול סידור שבועי", 
      href: createPageUrl("WeeklyScheduleManager"), 
      icon: GanttChartSquare, 
      description: "יצירה, עריכה ופרסום של סידורי עבודה",
      showIndicator: false
    },
    { 
      id: 'approve_schedules', 
      title: "אישור סידורים", 
      href: createPageUrl("ApproveSchedules"), 
      icon: CheckSquare, 
      description: "אישור סידורים שנשלחו על ידי מנהלים",
      showIndicator: hasPendingSchedules,
      indicatorCount: pendingSchedules?.length || 0,
      indicatorMessage: hasPendingSchedules ? `${pendingSchedules.length} סידורים ממתינים לאישור` : '',
      adminOnly: true
    },
    { 
      id: 'manage_time_clock', 
      title: "ניהול שעון נוכחות", 
      href: createPageUrl("TimeClockManagement"), 
      icon: Clock, 
      description: "צפייה ועריכת דיווחי נוכחות של העובדים",
      showIndicator: false,
      adminOnly: true
    },
  ];

  const visibleLinks = managementLinks.filter(link => {
    if (link.adminOnly && currentUser?.role !== 'admin') return false;
    return true;
  });

  if (!currentUser) {
    return <div className="text-center py-12">טוען...</div>;
  }

  const hasAccess = currentUser.role === 'admin' || 
                    currentUser.permissions?.includes('manage_vacations') ||
                    currentUser.permissions?.includes('manage_schedule');

  if (!hasAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 border-orange-500">
        <CardHeader className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-orange-500" />
          <CardTitle className="text-2xl text-orange-700 mt-4">אין לך גישה לניהול עובדים</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            לא הוקצו לך הרשאות גישה לניהול עובדים. אם אתה סבור שזו טעות, פנה למנהל המערכת.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="text-purple-600" />
          ניהול עובדים
        </h1>
        <p className="text-gray-500 mt-1">ניהול מקיף של משמרות, חופשות ונוכחות עובדים</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleLinks.map(link => (
          <Link to={link.href} key={link.id}>
            <Card className={`relative h-full transition-all duration-300 ${
              link.showIndicator 
                ? 'hover:shadow-lg hover:border-orange-300 border-orange-200' 
                : 'hover:shadow-lg hover:border-purple-300'
            }`}>
              {link.showIndicator && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className={`p-3 rounded-lg ${
                  link.showIndicator ? 'bg-orange-100' : 'bg-purple-100'
                }`}>
                  <link.icon className={`w-6 h-6 ${
                    link.showIndicator ? 'text-orange-600' : 'text-purple-600'
                  }`} />
                </div>
                <CardTitle>{link.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{link.description}</p>
                {link.showIndicator && link.indicatorMessage && (
                  <p className="text-xs text-orange-600 font-semibold mt-2">
                    🔔 {link.indicatorMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}