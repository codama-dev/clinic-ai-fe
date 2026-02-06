import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, MessageSquare, Mail, Send, CheckCircle2, XCircle, Clock, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import SendNotificationForm from "../components/notifications/SendNotificationForm";

const CHANNEL_ICONS = {
  whatsapp: MessageSquare,
  sms: Send,
  email: Mail
};

const CHANNEL_NAMES = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "אימייל"
};

const TYPE_NAMES = {
  confirmation: "אישור תור",
  reminder_24h: "תזכורת 24 שעות",
  reminder_2h: "תזכורת 2 שעות",
  cancellation: "ביטול תור",
  rescheduled: "תור שונה"
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  sent: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200"
};

const STATUS_ICONS = {
  pending: Clock,
  sent: CheckCircle2,
  failed: XCircle,
  cancelled: AlertCircle
};

export default function NotificationsManagerPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showSendDialog, setShowSendDialog] = useState(false);
  
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
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-scheduled_time', 100),
    enabled: !!currentUser
  });

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_notifications');

  if (!currentUser) {
    return <div className="text-center py-12">טוען...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">אין הרשאת גישה</h2>
            <p className="text-gray-600">אין לך הרשאה לנהל הודעות ותזכורות.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredNotifications = notifications.filter(n => {
    const channelMatch = selectedChannel === "all" || n.channel === selectedChannel;
    const statusMatch = selectedStatus === "all" || n.status === selectedStatus;
    return channelMatch && statusMatch;
  });

  const stats = {
    total: notifications.length,
    pending: notifications.filter(n => n.status === 'pending').length,
    sent: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    byChannel: {
      whatsapp: notifications.filter(n => n.channel === 'whatsapp').length,
      sms: notifications.filter(n => n.channel === 'sms').length,
      email: notifications.filter(n => n.channel === 'email').length
    }
  };

  const handleSendSuccess = () => {
    queryClient.invalidateQueries(['notifications']);
    setShowSendDialog(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול הודעות ותזכורות</h1>
          <p className="text-gray-500">מעקב ושליחת הודעות ללקוחות דרך SMS, WhatsApp ואימייל</p>
        </div>
        <Button onClick={() => setShowSendDialog(true)}>
          <Plus className="w-4 h-4 ml-2" />
          שלח הודעה חדשה
        </Button>
      </div>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>שליחת הודעה ללקוח</DialogTitle>
          </DialogHeader>
          <SendNotificationForm 
            onClose={() => setShowSendDialog(false)}
            onSuccess={handleSendSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">סה"כ הודעות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.total}</span>
              <Bell className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700">ממתינות לשליחה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-yellow-700">{stats.pending}</span>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">נשלחו בהצלחה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-700">{stats.sent}</span>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700">נכשלו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-red-700">{stats.failed}</span>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Stats */}
      <Card>
        <CardHeader>
          <CardTitle>התפלגות לפי ערוץ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <MessageSquare className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <p className="text-2xl font-bold">{stats.byChannel.whatsapp}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Send className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">SMS</p>
                <p className="text-2xl font-bold">{stats.byChannel.sms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Mail className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">אימייל</p>
                <p className="text-2xl font-bold">{stats.byChannel.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ערוץ תקשורת</label>
              <div className="flex gap-2">
                <Button
                  variant={selectedChannel === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChannel("all")}
                >
                  הכל
                </Button>
                <Button
                  variant={selectedChannel === "whatsapp" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChannel("whatsapp")}
                >
                  <MessageSquare className="w-4 h-4 ml-1" />
                  WhatsApp
                </Button>
                <Button
                  variant={selectedChannel === "sms" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChannel("sms")}
                >
                  <Send className="w-4 h-4 ml-1" />
                  SMS
                </Button>
                <Button
                  variant={selectedChannel === "email" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChannel("email")}
                >
                  <Mail className="w-4 h-4 ml-1" />
                  אימייל
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">סטטוס</label>
              <div className="flex gap-2">
                <Button
                  variant={selectedStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("all")}
                >
                  הכל
                </Button>
                <Button
                  variant={selectedStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("pending")}
                >
                  ממתין
                </Button>
                <Button
                  variant={selectedStatus === "sent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("sent")}
                >
                  נשלח
                </Button>
                <Button
                  variant={selectedStatus === "failed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus("failed")}
                >
                  נכשל
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>היסטוריית הודעות ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">טוען הודעות...</p>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">אין הודעות להצגה</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(notification => {
                const ChannelIcon = CHANNEL_ICONS[notification.channel];
                const StatusIcon = STATUS_ICONS[notification.status];
                
                return (
                  <div key={notification.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <ChannelIcon className="w-5 h-5 text-gray-600 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notification.client_name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {TYPE_NAMES[notification.type]}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.patient_name && `מטופל: ${notification.patient_name} • `}
                            {notification.recipient}
                          </p>
                          {notification.message_content && (
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border">
                              {notification.message_content}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>
                              {notification.sent_time 
                                ? `נשלח ב-${format(new Date(notification.sent_time), 'dd/MM/yyyy HH:mm', { locale: he })}`
                                : `מתוכנן ל-${format(new Date(notification.scheduled_time), 'dd/MM/yyyy HH:mm', { locale: he })}`
                              }
                            </span>
                            <span>ערוץ: {CHANNEL_NAMES[notification.channel]}</span>
                          </div>
                          {notification.failure_reason && (
                            <p className="text-xs text-red-600 mt-1">
                              סיבת כישלון: {notification.failure_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={`${STATUS_COLORS[notification.status]} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {notification.status === 'pending' && 'ממתין'}
                        {notification.status === 'sent' && 'נשלח'}
                        {notification.status === 'failed' && 'נכשל'}
                        {notification.status === 'cancelled' && 'בוטל'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}