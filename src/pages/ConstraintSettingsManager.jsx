
import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Save, Loader2 } from "lucide-react";

const JOBS_HE = { doctor: "רופא/ה", assistant: "אסיסטנט/ית", receptionist: "קבלה", admin: "מנהל מערכת" };

export default function ConstraintSettingsManager() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [savingStatus, setSavingStatus] = useState({});

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const me = await User.me();
            setCurrentUser(me);

            const hasAccess = me.role === 'admin' || me.permissions?.includes('manage_constraint_settings'); // Changed permission
            if (hasAccess) {
                const userData = await User.list('-created_date');
                setUsers(userData.map(u => ({ ...u, allowed_constraints: u.allowed_constraints ?? 1 })));
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleConstraintChange = (userId, value) => {
        const newValue = value === '' ? '' : Number(value);
        if (newValue < 0) return;
        setUsers(users.map(u => u.id === userId ? { ...u, allowed_constraints: newValue } : u));
    };

    const handleSave = async (userToSave) => {
        setSavingStatus(prev => ({ ...prev, [userToSave.id]: true }));
        try {
            const constraintsValue = userToSave.allowed_constraints === '' ? 1 : userToSave.allowed_constraints;
            await User.update(userToSave.id, { allowed_constraints: constraintsValue });
        } catch (error) {
            console.error("Error saving user constraints:", error);
            alert("שגיאה בשמירת הנתונים.");
        } finally {
            setTimeout(() => {
                setSavingStatus(prev => ({ ...prev, [userToSave.id]: false }));
            }, 1000);
        }
    };

    if (isLoading) {
        return <p>טוען נתונים...</p>;
    }

    const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_constraint_settings'); // Changed permission
    if (!hasAccess) {
        return (
            <Card className="max-w-2xl mx-auto mt-10 border-red-500">
                <CardHeader className="text-center">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
                    <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-gray-600">עמוד זה מיועד למנהלי מערכת או למשתמשים בעלי הרשאת "ניהול הגדרות אילוצים".</p> {/* Changed message */}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">ניהול הגדרות אילוצים</h1>
                <p className="text-gray-500">הגדרת מספר האילוצים המותר לכל עובד בשבוע. ערך ברירת המחדל הוא 1.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>מכסת אילוצים שבועית לעובדים</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>שם העובד</TableHead>
                                <TableHead>תפקיד</TableHead>
                                <TableHead className="w-[150px]">מספר אילוצים מותר</TableHead>
                                <TableHead className="text-center w-[100px]">פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.display_name || user.full_name}</TableCell>
                                    <TableCell>{JOBS_HE[user.job] || user.job}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={user.allowed_constraints}
                                            onChange={(e) => handleConstraintChange(user.id, e.target.value)}
                                            className="w-full"
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSave(user)}
                                            disabled={savingStatus[user.id]}
                                        >
                                            {savingStatus[user.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            <span className="mr-2">{savingStatus[user.id] ? 'שומר...' : 'שמור'}</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
