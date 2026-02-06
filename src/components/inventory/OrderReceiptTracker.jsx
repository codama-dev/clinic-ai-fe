import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, Loader2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function OrderReceiptTracker({ orders, onUpdateReceivedItems, currentUser, isUpdating }) {
    const [expandedSupplier, setExpandedSupplier] = useState(null);
    const [localReceivedItems, setLocalReceivedItems] = useState({});
    const queryClient = useQueryClient();
    
    const isAdmin = currentUser?.role === 'admin';

    // Generate consistent colors for order numbers
    const getOrderNumberColor = (orderNumber) => {
        if (!orderNumber) return 'bg-gray-100 text-gray-700 border-gray-300';
        
        const colors = [
            'bg-purple-100 text-purple-700 border-purple-300',
            'bg-blue-100 text-blue-700 border-blue-300',
            'bg-green-100 text-green-700 border-green-300',
            'bg-yellow-100 text-yellow-700 border-yellow-300',
            'bg-pink-100 text-pink-700 border-pink-300',
            'bg-indigo-100 text-indigo-700 border-indigo-300',
            'bg-red-100 text-red-700 border-red-300',
            'bg-orange-100 text-orange-700 border-orange-300',
            'bg-cyan-100 text-cyan-700 border-cyan-300',
            'bg-teal-100 text-teal-700 border-teal-300',
        ];
        
        return colors[orderNumber % colors.length];
    };

    // Group delivered and completed_with_shortages orders by supplier and date
    const supplierGroups = useMemo(() => {
        const delivered = orders.filter(order => order.status === 'delivered' || order.status === 'completed_with_shortages');
        const groups = {};
        
        delivered.forEach(order => {
            order.items?.forEach(item => {
                // Filter out invalid supplier names
                let supplier = item.chosen_supplier || 'ספק לא ידוע';
                if (supplier === 'לא נמצא' || supplier === 'אין מחיר') {
                    supplier = 'ספק לא ידוע';
                }
                const orderDate = order.order_date;
                const groupKey = `${supplier}|${orderDate}`;
                
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        supplier: supplier,
                        orderDate: orderDate,
                        items: []
                    };
                }
                groups[groupKey].items.push({
                    orderId: order.id,
                    orderDate: orderDate,
                    productName: item.product_name,
                    quantity: item.quantity,
                    notes: item.notes,
                    receivedItems: order.received_items || {},
                    received_by: order.received_by,
                    received_date: order.received_date,
                    order: order
                });
            });
        });
        
        // Sort by date (newest first)
        return Object.values(groups).sort((a, b) => {
            return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        });
    }, [orders]);

    const handleToggleItem = (orderId, productName, currentValue) => {
        setLocalReceivedItems(prev => ({
            ...prev,
            [orderId]: {
                ...(prev[orderId] || {}),
                [productName]: !currentValue
            }
        }));
    };

    const handleSaveSupplierReceipt = async (supplierItems) => {
        // Group items by order ID
        const orderUpdates = {};
        supplierItems.forEach(item => {
            if (!orderUpdates[item.orderId]) {
                orderUpdates[item.orderId] = {
                    order: item.order,
                    items: []
                };
            }
            orderUpdates[item.orderId].items.push(item);
        });

        // Collect items that weren't received to create shortage reports
        const itemsNotReceived = [];
        supplierItems.forEach(item => {
            const localState = localReceivedItems[item.orderId]?.[item.productName];
            const isReceived = localState !== undefined ? localState : (item.receivedItems?.[item.productName] || false);
            
            if (!isReceived) {
                itemsNotReceived.push({
                    productName: item.productName,
                    quantity: item.quantity,
                    notes: item.notes
                });
            }
        });

        // Create shortage reports for items not received
        if (itemsNotReceived.length > 0) {
            try {
                const { data: priceList = [] } = await base44.entities.SupplierPrice.list();
                
                for (const item of itemsNotReceived) {
                    const product = priceList.find(p => p.product_name === item.productName);
                    
                    await base44.entities.InventoryShortage.create({
                        item_name: item.productName,
                        category: product?.item_type || 'אחר',
                        quantity_needed: item.quantity,
                        notes: item.notes ? `${item.notes} (מוצר שלא הגיע בהזמנה)` : 'מוצר שלא הגיע בהזמנה',
                        status: 'needed',
                        requested_by_id: currentUser?.id,
                        requested_by_name: currentUser?.display_name || currentUser?.full_name,
                    });
                }
                
                toast.success(`נוצרו ${itemsNotReceived.length} דיווחי חוסר עבור מוצרים שלא הגיעו`);
            } catch (error) {
                console.error('Error creating shortage reports:', error);
                toast.error('שגיאה ביצירת דיווחי חוסר');
            }
        }

        // Update each order
        try {
            for (const [orderId, data] of Object.entries(orderUpdates)) {
                const updatedReceivedItems = {
                    ...(data.order.received_items || {}),
                    ...(localReceivedItems[orderId] || {})
                };
                
                // Check if all items in the ENTIRE order were received
                const allOrderItems = data.order.items || [];
                const allReceived = allOrderItems.every(orderItem => {
                    return updatedReceivedItems[orderItem.product_name] === true;
                });
                
                // Check if any item was marked as not received
                const hasUnreceivedItems = allOrderItems.some(orderItem => {
                    return updatedReceivedItems[orderItem.product_name] === false;
                });
                
                // Determine status
                let newStatus;
                if (allReceived) {
                    newStatus = 'delivered';
                } else if (hasUnreceivedItems) {
                    newStatus = 'completed_with_shortages';
                } else {
                    newStatus = data.order.status; // Keep existing if not all marked
                }

                // Update the order with new status
                await base44.entities.Order.update(orderId, {
                    received_items: updatedReceivedItems,
                    received_by: currentUser.display_name || currentUser.full_name,
                    received_date: new Date().toISOString(),
                    status: newStatus
                });
            }
            
            // Clear local state after save
            setLocalReceivedItems(prev => {
                const newState = { ...prev };
                supplierItems.forEach(item => {
                    delete newState[item.orderId];
                });
                return newState;
            });
            
            // Force immediate refetch
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            await queryClient.refetchQueries({ queryKey: ['orders'] });
            
            toast.success('אישור הקבלה נשמר והנתונים עודכנו!');
        } catch (error) {
            console.error('Error updating orders:', error);
            toast.error('שגיאה בעדכון ההזמנות');
        }
    };

    const getReceivedStatus = (item) => {
        const localState = localReceivedItems[item.orderId]?.[item.productName];
        if (localState !== undefined) return localState;
        return item.receivedItems?.[item.productName] || false;
    };

    const hasUnsavedChangesForSupplier = (supplierItems) => {
        return supplierItems.some(item => 
            localReceivedItems[item.orderId] && 
            localReceivedItems[item.orderId][item.productName] !== undefined
        );
    };

    if (supplierGroups.length === 0) {
        return (
            <Card className="border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-sm">אין הזמנות שהגיעו למעקב</p>
                    <p className="text-gray-400 text-xs mt-1">הזמנות עם סטטוס "הוזמנה" יופיעו כאן</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {supplierGroups.map((group) => {
                const groupKey = `${group.supplier}|${group.orderDate}`;
                const isExpanded = expandedSupplier === groupKey;
                const allItemsReceived = group.items.every(item => getReceivedStatus(item) === true);
                const someItemsReceived = group.items.some(item => getReceivedStatus(item) === true);
                const hasUnreceivedItems = someItemsReceived && !allItemsReceived;
                const uniqueOrders = new Set(group.items.map(item => item.orderId)).size;
                const orderNumbers = [...new Set(group.items.map(item => item.order.order_number).filter(Boolean))].sort((a, b) => a - b);

                return (
                    <Card key={groupKey} className="overflow-hidden">
                        <CardHeader 
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedSupplier(isExpanded ? null : groupKey)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Package className={`w-5 h-5 ${allItemsReceived ? 'text-green-600' : hasUnreceivedItems ? 'text-yellow-600' : 'text-orange-500'}`} />
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            ספק: {group.supplier}
                                            <div className="flex gap-1 flex-wrap">
                                                {orderNumbers.map(num => (
                                                    <Badge 
                                                        key={num} 
                                                        variant="outline" 
                                                        className={`${getOrderNumberColor(num)} border-2 font-semibold`}
                                                    >
                                                        הזמנה #{num}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">
                                            תאריך הזמנה: {format(new Date(group.orderDate), 'dd/MM/yyyy')} • {group.items.length} פריטים
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {allItemsReceived ? (
                                        <Badge className="bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 ml-1" />
                                            כל הפריטים הגיעו
                                        </Badge>
                                    ) : hasUnreceivedItems ? (
                                        <Badge className="bg-yellow-100 text-yellow-800">
                                            <XCircle className="w-3 h-3 ml-1" />
                                            הזמנה הסתיימה עם חוסרים
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-orange-100 text-orange-800">
                                            <Package className="w-3 h-3 ml-1" />
                                            טרם התקבלה
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        {isExpanded && (
                            <CardContent className="pt-4 border-t">
                                <div className="mb-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-right w-12">הגיע</TableHead>
                                                <TableHead className="text-right">שם המוצר</TableHead>
                                                <TableHead className="text-center">כמות</TableHead>
                                                <TableHead className="text-right">הערות</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.items.map((item, index) => {
                                                const isReceived = getReceivedStatus(item);
                                                return (
                                                    <TableRow 
                                                        key={index}
                                                        className={isReceived ? 'bg-green-50' : 'bg-red-50'}
                                                    >
                                                        <TableCell className="text-center">
                                                           <Checkbox
                                                               checked={isReceived}
                                                               onCheckedChange={() => handleToggleItem(item.orderId, item.productName, isReceived)}
                                                           />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {isReceived ? (
                                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                                ) : (
                                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                                )}
                                                                {item.productName}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                                        <TableCell className="text-right">
                                                            {item.notes && item.notes.trim() !== '' ? (
                                                                <div className="text-sm text-gray-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                                                    {item.notes}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {(() => {
                                    // Collect all unique approvals from items that were actually marked as received
                                    const approvals = [];
                                    const seenApprovals = new Set();
                                    
                                    group.items.forEach(item => {
                                        // Only show approval if this item was actually marked as received
                                        const isReceived = item.receivedItems?.[item.productName] === true;
                                        if (isReceived && item.received_by && item.received_date) {
                                            const key = `${item.received_by}|${item.received_date}`;
                                            if (!seenApprovals.has(key)) {
                                                seenApprovals.add(key);
                                                approvals.push({
                                                    by: item.received_by,
                                                    date: item.received_date
                                                });
                                            }
                                        }
                                    });
                                    
                                    // Sort by date (oldest first)
                                    approvals.sort((a, b) => new Date(a.date) - new Date(b.date));
                                    
                                    if (approvals.length === 0) return null;
                                    
                                    return (
                                        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm space-y-2">
                                            <div className="font-semibold text-blue-900">היסטוריית אישורים:</div>
                                            {approvals.map((approval, idx) => (
                                                <div key={idx} className="flex items-center justify-between gap-4 border-b border-blue-200 pb-2 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-2 text-blue-800">
                                                        <User className="w-4 h-4" />
                                                        <span>{approval.by}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-blue-700">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{format(new Date(approval.date), 'dd/MM/yyyy HH:mm')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => handleSaveSupplierReceipt(group.items)}
                                        disabled={isUpdating || (!isAdmin && !hasUnsavedChangesForSupplier(group.items))}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                                שומר...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 ml-2" />
                                                {isAdmin && group.items[0].received_by ? 'עדכן אישור קבלה' : 'אשר קבלה מספק זה'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}