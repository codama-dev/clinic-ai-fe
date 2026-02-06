import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, PackagePlus, Loader2, ShieldAlert, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryShortageForm from '../components/inventory/InventoryShortageForm';
import MyShortageReports from '../components/inventory/MyShortageReports';
import AllShortageReports from '../components/inventory/AllShortageReports';
import OrderReceiptTracker from '../components/inventory/OrderReceiptTracker';
import { toast } from 'sonner';

export default function InventoryManagementPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: currentUser, isLoading: isUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => base44.entities.Order.list('-order_date'),
        enabled: !!currentUser,
    });

    const createShortageMutation = useMutation({
        mutationFn: (itemData) => {
            const itemDataWithRequester = {
                ...itemData,
                requested_by_id: currentUser?.id,
                requested_by_name: currentUser?.display_name || currentUser?.full_name,
            };
            return base44.entities.InventoryShortage.create(itemDataWithRequester);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventoryShortages'] });
            await queryClient.refetchQueries({ queryKey: ['inventoryShortages'] });
            setIsFormOpen(false);
            toast.success("הדיווח נשלח בהצלחה.");
        },
        onError: (error) => {
            console.error("Error creating shortage report:", error);
            toast.error("שגיאה בשליחת הדיווח.");
        },
    });

    const updateReceivedItemsMutation = useMutation({
        mutationFn: ({ orderId, received_items, received_by, received_date }) => {
            return base44.entities.Order.update(orderId, {
                received_items,
                received_by,
                received_date
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("סטטוס קבלת המוצרים עודכן בהצלחה.");
        },
        onError: (error) => {
            console.error("Error updating received items:", error);
            toast.error("שגיאה בעדכון סטטוס קבלת המוצרים.");
        },
    });

    if (isUserLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
    }

    if (!currentUser) {
        return (
            <Card className="max-w-2xl mx-auto mt-10 border-red-500">
                <CardHeader className="text-center">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
                    <CardTitle className="text-2xl text-red-700 mt-4">נדרשת התחברות</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-gray-600">עליך להתחבר למערכת כדי לדווח על חוסר במלאי.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><PackagePlus /> דיווח על חוסרים או הזמנות ללקוח</h1>
                    <p className="text-gray-500">דווח על חוסרים, עקוב אחרי הדיווחים שלך ואשר קבלת משלוחים.</p>
                </div>
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 ml-2" />דווח על חוסר במלאי</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]" dir="rtl">
                        <DialogHeader>
                            <DialogTitle>דיווח על פריט שאזל מהמלאי</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <InventoryShortageForm 
                                onSubmit={createShortageMutation.mutate}
                                onCancel={() => setIsFormOpen(false)}
                                isSubmitting={createShortageMutation.isPending}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">כל החוסרים</TabsTrigger>
                    <TabsTrigger value="shortages">הדיווחים שלי</TabsTrigger>
                    <TabsTrigger value="receipts" className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        אישור קבלת משלוחים
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6">
                    <AllShortageReports />
                </TabsContent>
                
                <TabsContent value="shortages" className="mt-6">
                    {currentUser && <MyShortageReports currentUser={currentUser} />}
                </TabsContent>
                
                <TabsContent value="receipts" className="mt-6">
                    <Card className="mb-6 bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                            <p className="text-sm text-blue-800">
                                <strong>הוראות שימוש:</strong> סמן את המוצרים שהגיעו במשלוח. מוצרים שסומנו יופיעו בירוק, ומוצרים שלא סומנו יופיעו באדום.
                                לאחר סימון כל המוצרים, לחץ על "שמור אישור קבלה" לשמירת הנתונים.
                            </p>
                        </CardContent>
                    </Card>
                    
                    {isOrdersLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    ) : (
                        <OrderReceiptTracker
                            orders={orders}
                            onUpdateReceivedItems={updateReceivedItemsMutation.mutate}
                            currentUser={currentUser}
                            isUpdating={updateReceivedItemsMutation.isPending}
                        />
                    )}
                </TabsContent>
            </Tabs>
            
             <Card className="text-center bg-gray-50/70 border-dashed border-gray-300 mt-8">
                <CardHeader>
                    <CardTitle className="text-gray-700">איך זה עובד?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-gray-600">
                   <p>1. לחצ/י על כפתור "דווח על חוסר במלאי".</p>
                   <p>2. מלא/י את שם הפריט, בחר/י קטגוריה וכל הערה רלוונטית.</p>
                   <p>3. הדיווח שלך יועבר אוטומטית למנהל/ת ההזמנות לטיפול.</p>
                   <p>4. במעבר לכרטיסייה "אישור קבלת משלוחים" תוכל/י לסמן אילו מוצרים הגיעו בפועל.</p>
                </CardContent>
            </Card>
        </div>
    );
}