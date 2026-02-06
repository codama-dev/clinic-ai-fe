import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Lock, Loader2 } from 'lucide-react';

const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name[0].toUpperCase();
};

const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // אם ההודעה נשלחה היום
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        if (diffMins < 1) return 'עכשיו';
        if (diffMins < 60) return `לפני ${diffMins} דקות`;
        if (diffHours < 24) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `היום ${hours}:${minutes}`;
        }
    }
    
    // אם ההודעה נשלחה אתמול
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `אתמול ${hours}:${minutes}`;
    }
    
    // תאריך מלא
    return date.toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

export default function ConversationView({ referral, currentUser, onReply, onClose, isUpdating }) {
    const [replyContent, setReplyContent] = React.useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [referral.messages]);

    const handleSendReply = () => {
        if (replyContent.trim()) {
            onReply(replyContent);
            setReplyContent('');
        }
    };
    
    const canReply = referral.status !== 'closed';

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                        {referral.is_urgent && <span className="text-2xl">🚨</span>}
                        {referral.subject}
                        {referral.is_urgent && (
                            <span className="text-sm bg-red-600 text-white px-3 py-1 rounded-full">דחוף</span>
                        )}
                    </h3>
                    <p className="text-sm text-gray-500">
                        פנייה מאת: {referral.referring_user_name} אל: {referral.target_doctor_name}
                    </p>
                </div>
                {canReply && (
                     <Button variant="outline" onClick={onClose} disabled={isUpdating} className="text-red-600 border-red-300 hover:bg-red-50">
                        <Lock className="w-4 h-4 ml-2"/>
                        {isUpdating ? "סוגר..." : "סגור פנייה"}
                    </Button>
                )}
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {referral.messages.map((msg, index) => {
                    const isMyMessage = msg.sender_id === currentUser.id;
                    return (
                        <div key={index} className={`flex items-end gap-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                            {!isMyMessage && <Avatar className="w-8 h-8"><AvatarFallback>{getInitials(msg.sender_name)}</AvatarFallback></Avatar>}
                            <div className={`max-w-md p-3 rounded-lg ${isMyMessage ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                <p className="text-xs font-semibold mb-1 opacity-80">{msg.sender_name}</p>
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${isMyMessage ? 'text-purple-200' : 'text-gray-500'}`}>
                                    {formatTimestamp(msg.timestamp)}
                                </p>
                            </div>
                            {isMyMessage && <Avatar className="w-8 h-8"><AvatarFallback className="bg-purple-200">{getInitials(msg.sender_name)}</AvatarFallback></Avatar>}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            {canReply ? (
                <footer className="p-4 border-t">
                    <div className="relative">
                        <Textarea 
                            placeholder="כתוב/י תגובה... (כל המשתמשים יכולים להוסיף הודעות)" 
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendReply())}
                            className="pr-24"
                            rows={2}
                        />
                        <Button 
                            size="icon" 
                            className="absolute left-3 top-1/2 -translate-y-1/2" 
                            onClick={handleSendReply}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                        </Button>
                    </div>
                </footer>
            ) : (
                <footer className="p-4 border-t text-center text-gray-500 bg-gray-50">
                    <Lock className="w-4 h-4 inline-block mr-2"/>
                    הפנייה סגורה. לא ניתן לשלוח הודעות נוספות.
                </footer>
            )}
        </div>
    );
}