import React, { useState, useEffect } from 'react';
import { SystemSettings } from '@/entities/SystemSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';

const DAYS_OPTIONS = [
    { value: "sunday", label: "יום ראשון" },
    { value: "monday", label: "יום שני" },
    { value: "tuesday", label: "יום שלישי" },
    { value: "wednesday", label: "יום רביעי" },
    { value: "thursday", label: "יום חמישי" },
    { value: "friday", label: "יום שישי" },
    { value: "saturday", label: "יום שבת" },
];

export default function SystemSettingsManager() {
    const [settings, setSettings] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const settingsList = await SystemSettings.list();
        if (settingsList.length > 0) {
            setSettings(settingsList[0]);
        } else {
            // Create default settings if none exist
            const defaultSettings = {
                constraint_deadline_day: 'thursday',
                constraint_deadline_time: '20:00',
                constraint_weeks_ahead: 3,
            };
            const newSettings = await SystemSettings.create(defaultSettings);
            setSettings(newSettings);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await SystemSettings.update(settings.id, settings);
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
        setIsSaving(false);
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    if (!settings) {
        return <p>טוען הגדרות...</p>;
    }

    return (
        <Card className="shadow-lg border-green-200 bg-white">
            <CardHeader>
                <CardTitle>הגדרות מערכת</CardTitle>
                <CardDescription>ניהול הגדרות כלליות של המערכת.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>מועד אחרון להגשת אילוצים</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <Select value={settings.constraint_deadline_day} onValueChange={v => handleChange('constraint_deadline_day', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="בחר יום" />
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            type="time"
                            value={settings.constraint_deadline_time}
                            onChange={e => handleChange('constraint_deadline_time', e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="weeks_ahead">כמה שבועות קדימה ניתן להגיש אילוצים</Label>
                    <Input
                        id="weeks_ahead"
                        type="number"
                        min="1"
                        max="10"
                        value={settings.constraint_weeks_ahead}
                        onChange={e => handleChange('constraint_weeks_ahead', parseInt(e.target.value, 10))}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="w-4 h-4 ml-2" />
                        {isSaving ? 'שומר...' : 'שמור הגדרות'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}