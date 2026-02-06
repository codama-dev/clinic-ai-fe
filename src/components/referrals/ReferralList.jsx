import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name[0].toUpperCase();
};

const statusConfig = {
    open: { label: 'פתוחה', bgColor: 'bg-blue-100 text-blue-800' },
    closed: { label: 'סגורה', bgColor: 'bg-gray-100 text-gray-800' }
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) return 'היום';
    if (messageDate.getTime() === yesterday.getTime()) return 'אתמול';
    
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
};

const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
};

const groupByDate = (referrals) => {
    const grouped = {};
    referrals.forEach(ref => {
        const lastMessage = ref.messages[ref.messages.length - 1];
        const dateKey = formatDate(lastMessage.timestamp);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(ref);
    });
    return Object.entries(grouped).sort((a, b) => {
        const aDate = new Date(a[1][0].messages[a[1][0].messages.length - 1].timestamp);
        const bDate = new Date(b[1][0].messages[b[1][0].messages.length - 1].timestamp);
        return bDate - aDate;
    });
};

export default function ReferralList({ referrals, currentUser, selectedReferralId, onSelectReferral }) {
    const groupedReferrals = groupByDate(referrals);

    return (
        <div>
            {groupedReferrals.map(([dateLabel, refs]) => (
                <div key={dateLabel}>
                    <div className="sticky top-0 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 z-10">
                        {dateLabel}
                    </div>
                    {refs.map(referral => {
                        const lastMessage = referral.messages[referral.messages.length - 1];
                        const isParticipant = referral.referring_user_id === currentUser.id || referral.target_doctor_id === currentUser.id;
                        const isSelected = referral.id === selectedReferralId;
                        const senderName = referral.referring_user_id === currentUser.id ? referral.target_doctor_name : referral.referring_user_name;
                        
                        return (
                            <div 
                                key={referral.id}
                                onClick={() => onSelectReferral(referral)}
                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                                    referral.is_urgent 
                                        ? 'bg-red-50 border-r-4 border-r-red-500'
                                        : isSelected 
                                            ? 'bg-purple-50 border-r-4 border-r-purple-600' 
                                            : ''
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {referral.is_urgent && (
                                        <span className="text-xl flex-shrink-0 mt-1" title="דחוף">🚨</span>
                                    )}
                                    <Avatar className="w-10 h-10">
                                        <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-sm truncate flex items-center gap-1">
                                                {senderName}
                                                {referral.is_urgent && (
                                                    <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">דחוף</span>
                                                )}
                                            </h4>
                                            <span className="text-xs text-gray-500 flex-shrink-0 mr-2">
                                                {formatTime(lastMessage.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 truncate mb-1">{referral.subject}</p>
                                        <p className="text-xs text-gray-500 truncate">{lastMessage.content}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge className={`text-xs ${statusConfig[referral.status].bgColor}`}>
                                                {statusConfig[referral.status].label}
                                            </Badge>
                                            {isParticipant && (
                                                <div className="flex items-center gap-1 text-xs text-purple-600">
                                                    <CheckCircle className="w-3 h-3"/>
                                                    <span>משתתף/ת</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}