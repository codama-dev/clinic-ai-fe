import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Stethoscope, FileText, Syringe, AlertCircle } from 'lucide-react';

export default function MedicalManagement() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const managementLinks = [
    { 
      id: 'manage_protocol_templates', 
      title: "ניהול תבניות פרוטוקול", 
      href: createPageUrl("ProtocolTemplatesManager"), 
      icon: FileText, 
      description: "יצירה ועריכה של תבניות פרוטוקולים למילוי"
    },
    { 
      id: 'medical_settings', 
      title: "הגדרות רפואיות", 
      href: createPageUrl("ClientManagementSettings"), 
      icon: Syringe, 
      description: "הגדרת חיסונים, בדיקות מעבדה ותזכורות"
    },
  ];

  if (!currentUser) {
    return <div className="text-center py-12">טוען...</div>;
  }

  const hasAccess = currentUser.role === 'admin' || 
                    currentUser.permissions?.includes('manage_protocol_templates') ||
                    currentUser.permissions?.includes('manage_client_settings');

  if (!hasAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 border-orange-500">
        <CardHeader className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-orange-500" />
          <CardTitle className="text-2xl text-orange-700 mt-4">אין לך גישה לניהול רפואי</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            לא הוקצו לך הרשאות גישה לניהול רפואי. אם אתה סבור שזו טעות, פנה למנהל המערכת.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Stethoscope className="text-purple-600" />
          ניהול רפואי
        </h1>
        <p className="text-gray-500 mt-1">ניהול תבניות פרוטוקולים והגדרות רפואיות</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {managementLinks.map(link => (
          <Link to={link.href} key={link.id}>
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-purple-300">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="p-3 rounded-lg bg-purple-100">
                  <link.icon className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>{link.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}