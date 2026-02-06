import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Inbox, Eye, EyeOff, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import NewReferralForm from '../components/referrals/NewReferralForm';
import ReferralList from '../components/referrals/ReferralList';
import ConversationView from '../components/referrals/ConversationView';

export default function VetReferralsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedReferral, setSelectedReferral] = useState(null);
    const [filterStatus, setFilterStatus] = useState('open'); // 'open', 'closed', 'all'
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();
    const audioRef = useRef(null);
    const previousUnreadCountRef = useRef(0);

    const createPageUrl = (pageName) => {
        switch (pageName) {
            case 'VetReferrals':
                return '/vet-referrals';
            default:
                return '/';
        }
    };

    const { data: currentUser, isLoading: isUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    // Fetch referrals based on filter status
    const { data: allReferrals = [], isLoading: areReferralsLoading } = useQuery({
        queryKey: ['vetReferrals', filterStatus],
        queryFn: async () => {
            if (filterStatus === 'all') {
                // Fetch all referrals
                return base44.entities.VetReferral.list('-updated_date');
            } else {
                // Fetch referrals by status (open or closed)
                return base44.entities.VetReferral.filter({ status: filterStatus }, '-updated_date');
            }
        },
        enabled: !!currentUser,
        refetchInterval: 5000, // Check every 5 seconds for new messages
    });
    
    // Filter referrals based on search query
    const filteredReferrals = React.useMemo(() => {
        if (!searchQuery.trim()) {
            return allReferrals;
        }
        
        const query = searchQuery.toLowerCase();
        return allReferrals.filter(referral => {
            // Search in subject
            if (referral.subject?.toLowerCase().includes(query)) return true;
            
            // Search in referring user name
            if (referral.referring_user_name?.toLowerCase().includes(query)) return true;
            
            // Search in target doctor name
            if (referral.target_doctor_name?.toLowerCase().includes(query)) return true;
            
            // Search in messages content
            if (referral.messages?.some(msg => msg.content?.toLowerCase().includes(query))) return true;
            
            return false;
        });
    }, [allReferrals, searchQuery]);
    
    const canViewUserList = currentUser?.role === 'admin' || (currentUser?.permissions || []).includes('view_user_list_in_messages');

    const { data: allUsers = [] } = useQuery({
        queryKey: ['allUsersForMessages'],
        queryFn: async () => {
            const profiles = await base44.entities.PublicProfile.list();
            return profiles.filter(p => p.user_id && p.display_name);
        },
        enabled: !!currentUser,
    });

    // Filter available recipients based on current user's role
    const availableRecipients = React.useMemo(() => {
        if (!currentUser || !allUsers.length) return [];
        
        // If current user is a doctor, they can message everyone
        if (currentUser.job === 'doctor') {
            return allUsers.filter(u => u.user_id !== currentUser.id); // Exclude self
        }
        
        // Non-doctors can only message doctors
        return allUsers.filter(u => u.job === 'doctor' && u.user_id !== currentUser.id);
    }, [currentUser, allUsers]);

    // Check for new unread messages and play sound + show notification
    useEffect(() => {
        if (!currentUser || !allReferrals.length) return;

        const unreadReferrals = allReferrals.filter(ref => {
            if (ref.status === 'closed') return false;
            
            const lastMessage = ref.messages[ref.messages.length - 1];
            if (!lastMessage) return false;
            
            // Check if last message is from someone else
            return lastMessage.sender_id !== currentUser.id;
        });

        const currentUnreadCount = unreadReferrals.length;
        
        // If unread count increased, play sound and show notification
        if (currentUnreadCount > previousUnreadCountRef.current && previousUnreadCountRef.current > 0) {
            // Play notification sound
            if (audioRef.current) {
                audioRef.current.play().catch(err => console.log('Audio play prevented:', err));
            }
            
            // Show toast notification
            const newMessagesCount = currentUnreadCount - previousUnreadCountRef.current;
            toast.info(`📨 ${newMessagesCount} הודעה חדשה`, {
                description: 'לחץ כאן לצפייה',
                duration: 5000,
            });
        }
        
        previousUnreadCountRef.current = currentUnreadCount;
    }, [allReferrals, currentUser]);

    const createReferralMutation = useMutation({
        mutationFn: (referralData) => base44.entities.VetReferral.create(referralData),
        onSuccess: async (newReferral) => {
            queryClient.invalidateQueries({ queryKey: ['vetReferrals'] });
            setIsFormOpen(false);
            setSelectedReferral(newReferral);
            toast.success("ההודעה נשלחה בהצלחה.");

            try {
                const targetUserProfile = allUsers.find(user => user.user_id === newReferral.target_doctor_id);

                if (targetUserProfile && targetUserProfile.email) {
                    const referralLink = `${window.location.origin}${createPageUrl('VetReferrals')}`;
                    await base44.integrations.Core.SendEmail({
                        to: targetUserProfile.email,
                        subject: `הודעה חדשה מ${newReferral.referring_user_name} במערכת LoVeT`,
                        body: `
                            <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
                                <h2>שלום ${targetUserProfile.display_name},</h2>
                                <p>קיבלת הודעה חדשה מאת <strong>${newReferral.referring_user_name}</strong>.</p>
                                <hr>
                                <p><strong>נושא:</strong> ${newReferral.subject}</p>
                                <p><strong>תוכן ההודעה:</strong></p>
                                <p style="padding: 10px; border-right: 2px solid #eee; background-color: #f9f9f9;">
                                    ${newReferral.messages[0].content}
                                </p>
                                <hr>
                                <p>כדי להשיב להודעה, אנא היכנס למערכת:</p>
                                <a href="${referralLink}" style="display: inline-block; padding: 10px 20px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 5px;">
                                    מעבר למערכת ההודעות
                                </a>
                                <br><br>
                                <p>בברכה,<br>מערכת LoVeT</p>
                            </div>
                        `
                    });
                    toast.info(`נשלחה התראה בדוא"ל ל${targetUserProfile.display_name}.`);
                }
            } catch (emailError) {
                console.error("Error sending notification email:", emailError);
                toast.error("ההודעה נוצרה, אך הייתה שגיאה בשליחת התראת אימייל.");
            }
        },
        onError: (error) => {
            console.error("Error creating referral:", error);
            toast.error("שגיאה בשליחת ההודעה.");
        },
    });

    const updateReferralMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.VetReferral.update(id, data),
        onSuccess: (updatedReferral) => {
            queryClient.setQueryData(['vetReferrals', filterStatus], (oldData) =>
                oldData.map((r) => (r.id === updatedReferral.id ? updatedReferral : r))
            );
            
            // If the referral was just closed and we're viewing open only, clear selection and refresh
            if (updatedReferral.status === 'closed' && filterStatus === 'open') {
                setSelectedReferral(null);
                queryClient.invalidateQueries({ queryKey: ['vetReferrals'] });
            } else {
                setSelectedReferral(updatedReferral);
            }
            
            toast.success("ההודעה עודכנה.");
        },
        onError: (error) => {
            console.error("Error updating referral:", error);
            toast.error("שגיאה בעדכון ההודעה.");
        },
    });

    const handleCreateReferral = (formData) => {
        const initialMessage = {
            sender_id: currentUser.id,
            sender_name: currentUser.display_name || currentUser.full_name,
            content: formData.initial_message,
            timestamp: new Date().toISOString(),
        };
        
        const selectedUser = allUsers.find(u => u.user_id === formData.target_doctor_id);

        createReferralMutation.mutate({
            subject: formData.subject,
            referring_user_id: currentUser.id,
            referring_user_name: currentUser.display_name || currentUser.full_name,
            target_doctor_id: formData.target_doctor_id,
            target_doctor_name: selectedUser.display_name,
            is_urgent: formData.is_urgent || false,
            status: 'open',
            messages: [initialMessage],
        });
    };

    const handleReply = (replyContent) => {
        if (!selectedReferral || !currentUser) return;

        const newMessage = {
            sender_id: currentUser.id,
            sender_name: currentUser.display_name || currentUser.full_name,
            content: replyContent,
            timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...selectedReferral.messages, newMessage];
        
        // Keep the status as-is - only manual closure changes it
        updateReferralMutation.mutate({
            id: selectedReferral.id,
            data: { messages: updatedMessages },
        });
    };

    const handleCloseReferral = () => {
        if (!selectedReferral) return;
        updateReferralMutation.mutate({
            id: selectedReferral.id,
            data: { status: 'closed' },
        });
    };

    const isLoading = isUserLoading || areReferralsLoading;

    const getFilterTitle = () => {
        switch (filterStatus) {
            case 'open': return 'הודעות פתוחות';
            case 'closed': return 'הודעות סגורות';
            case 'all': return 'כל ההודעות';
            default: return 'הודעות';
        }
    };

    const getEmptyStateMessage = () => {
        if (searchQuery.trim()) {
            return {
                title: 'לא נמצאו תוצאות',
                subtitle: `אין הודעות התואמות לחיפוש "${searchQuery}"`
            };
        }
        
        switch (filterStatus) {
            case 'open': 
                return {
                    title: 'אין הודעות פתוחות',
                    subtitle: 'כל ההודעות טופלו ונסגרו.'
                };
            case 'closed':
                return {
                    title: 'אין הודעות סגורות',
                    subtitle: 'עדיין לא נסגרו הודעות במערכת.'
                };
            case 'all':
                return {
                    title: 'אין הודעות במערכת',
                    subtitle: 'עדיין לא נוצרו הודעות.'
                };
            default:
                return {
                    title: 'אין הודעות',
                    subtitle: ''
                };
        }
    };

    const openCount = allReferrals.filter(r => r.status === 'open').length;
    const closedCount = allReferrals.filter(r => r.status === 'closed').length;

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-lg shadow-md border" dir="rtl">
            {/* Notification sound - using a short beep sound */}
            <audio ref={audioRef} preload="auto">
                <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZVA0PVKzn77BdGAg+ltryxnMpBSuAzu/ekD4JE2S56OSZVQ0PUqzn7bFeFgo9mNvzw3IoBSuBzu/dkj4JE2S56OOaVQ0PVK3o77FdGAg9ltrzxHMnBSuBzu/dkj4JE2S56OOaVA0OVK3o77FdGAg9ltrzxHMnBSuBzu/ekj4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHMnBSuBzu/ekj4JE2S56OOaVQ0OVKzo77FdGAg9ltrzxHInBSuBzu/ekj4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekj4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrzxHInBSuBzu/ekT4JE2S56OOaVQ0OVK3o77FdGAg9ltrz" type="audio/wav" />
            </audio>
            
            <aside className="w-1/3 border-l overflow-y-auto flex flex-col">
                <div className="p-4 border-b flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-semibold">{getFilterTitle()}</h2>
                        <Button size="sm" onClick={() => setIsFormOpen(true)} disabled={availableRecipients.length === 0}>
                            <Plus className="w-4 h-4 ml-2"/>הודעה חדשה
                        </Button>
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative mb-3">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="חיפוש לפי נושא, שם, או תוכן..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10 pl-10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    {/* Filter Buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant={filterStatus === 'open' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('open')}
                            className="flex-1"
                        >
                            <Eye className="w-3 h-3 ml-1" />
                            פתוחות
                            {filterStatus !== 'open' && openCount > 0 && (
                                <Badge variant="secondary" className="mr-1 text-xs">
                                    {openCount}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant={filterStatus === 'closed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('closed')}
                            className="flex-1"
                        >
                            <EyeOff className="w-3 h-3 ml-1" />
                            סגורות
                            {filterStatus !== 'closed' && closedCount > 0 && (
                                <Badge variant="secondary" className="mr-1 text-xs">
                                    {closedCount}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            variant={filterStatus === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('all')}
                            className="flex-1"
                        >
                            הכל
                        </Button>
                    </div>
                    
                    {/* Search Results Counter */}
                    {searchQuery && (
                        <div className="mt-2 text-sm text-gray-600">
                            נמצאו {filteredReferrals.length} תוצאות
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : filteredReferrals.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Inbox className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">{getEmptyStateMessage().title}</p>
                            <p className="text-sm">{getEmptyStateMessage().subtitle}</p>
                        </div>
                    ) : (
                        <ReferralList 
                            referrals={filteredReferrals}
                            currentUser={currentUser}
                            selectedReferralId={selectedReferral?.id}
                            onSelectReferral={setSelectedReferral}
                        />
                    )}
                </div>
            </aside>
            <main className="w-2/3 flex flex-col">
                 {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                       <p>טוען נתונים...</p>
                    </div>
                ) : selectedReferral ? (
                    <ConversationView 
                        referral={selectedReferral}
                        currentUser={currentUser}
                        onReply={handleReply}
                        onClose={handleCloseReferral}
                        isUpdating={updateReferralMutation.isPending}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <Inbox className="w-24 h-24 mb-4 text-gray-300"/>
                        <h3 className="text-xl font-medium">בחר/י הודעה כדי להציג את ההתכתבות</h3>
                        <p>או צור/י הודעה חדשה כדי להתחיל.</p>
                    </div>
                )}
            </main>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>יצירת הודעה חדשה</DialogTitle>
                    </DialogHeader>
                    {availableRecipients.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            <p className="mb-2">אין נמענים זמינים</p>
                            <p className="text-sm">
                                {currentUser?.job === 'doctor' 
                                    ? 'לא נמצאו משתמשים אחרים במערכת.'
                                    : 'לא נמצאו רופאים זמינים במערכת.'}
                            </p>
                        </div>
                    ) : (
                        <NewReferralForm
                            users={availableRecipients}
                            onSubmit={handleCreateReferral}
                            onCancel={() => setIsFormOpen(false)}
                            isSubmitting={createReferralMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}