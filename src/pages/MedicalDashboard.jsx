
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Stethoscope, FileText, BedDouble, ShieldAlert } from 'lucide-react';

const medicalLinks = [
    { id: 'protocols', title: "פרוטוקולים", href: createPageUrl("Protocols"), icon: FileText, description: "מילוי וצפייה בפרוטוקולים רפואיים" },
    { id: 'hospitalization', title: "ניהול אשפוז", href: createPageUrl("Hospitalization"), icon: BedDouble, description: "מעקב וניהול חיות מאושפזות" },
];

export default function MedicalDashboard() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await User.me();
                setCurrentUser(user);
            } catch (e) {
                console.error("Failed to fetch user", e);
                setCurrentUser(null);
            }
            setIsLoading(false);
        };
        fetchUser();
    }, []);

    if (isLoading) {
        return <p>טוען...</p>;
    }
    
    if (!currentUser) {
        return (
             <Card className="max-w-2xl mx-auto mt-10 border-red-500">
                <CardHeader className="text-center">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
                    <CardTitle className="text-2xl text-red-700 mt-4">נדרשת התחברות</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-gray-600">
                        עליך להתחבר למערכת כדי לגשת למודול הרפואי.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Stethoscope className="w-8 h-8"/> מודול ניהול רפואי</h1>
                <p className="text-gray-500 mt-1">ניהול פרוטוקולים, אשפוזים ומעקב קליני.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {medicalLinks.map(link => (
                    <Link to={link.href} key={link.id}>
                        <Card className="h-full hover:shadow-lg hover:border-purple-300 transition-all duration-300">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="p-3 bg-purple-100 rounded-lg">
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
