import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, X } from 'lucide-react';

export default function NewReferralForm({ users, onSubmit, onCancel, isSubmitting }) {
    const [formData, setFormData] = useState({
        target_doctor_id: '',
        subject: '',
        initial_message: '',
        is_urgent: false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.target_doctor_id || !formData.subject || !formData.initial_message) {
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="target_user">אל *</Label>
                <Select
                    value={formData.target_doctor_id}
                    onValueChange={(value) => setFormData({ ...formData, target_doctor_id: value })}
                    required
                >
                    <SelectTrigger id="target_user">
                        <SelectValue placeholder="בחר/י נמען" />
                    </SelectTrigger>
                    <SelectContent>
                        {users.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                                {user.display_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject">נושא ההודעה *</Label>
                <Input
                    id="subject"
                    placeholder="לדוגמה: שאלה לגבי טיפול, בקשת ייעוץ..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="message">ההודעה *</Label>
                <Textarea
                    id="message"
                    placeholder="כתוב/י את ההודעה שלך כאן..."
                    value={formData.initial_message}
                    onChange={(e) => setFormData({ ...formData, initial_message: e.target.value })}
                    className="min-h-[150px]"
                    required
                />
            </div>

            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <input
                    type="checkbox"
                    id="urgent-checkbox"
                    checked={formData.is_urgent}
                    onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
                    className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="urgent-checkbox" className="text-sm font-medium text-red-800 cursor-pointer flex-1">
                    🚨 סמן כדחוף - הרופא יקבל התראה מיידית
                </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    <X className="w-4 h-4 ml-2" />
                    ביטול
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    <Send className="w-4 h-4 ml-2" />
                    {isSubmitting ? 'שולח...' : 'שלח הודעה'}
                </Button>
            </div>
        </form>
    );
}