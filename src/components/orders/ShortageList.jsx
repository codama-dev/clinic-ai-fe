
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, Check, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ShortageList({ shortages, isLoading }) {
    const queryClient = useQueryClient();

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.InventoryShortage.update(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventoryShortages'] });
            toast.success("סטטוס הפריט עודכן.");
        },
        onError: (error) => {
            toast.error("שגיאה בעדכון סטטוס.");
            console.error("Error updating status:", error);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.InventoryShortage.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventoryShortages'] });
            toast.success("הדיווח נמחק בהצלחה.");
        },
        onError: (error) => {
            toast.error("שגיאה במחיקת הדיווח.");
            console.error("Error deleting item:", error);
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <PackageSearch className="text-blue-600" />
                    רשימת חוסרים לטיפול
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">שם הפריט</TableHead>
                            <TableHead className="text-right">קטגוריה</TableHead>
                            <TableHead className="text-right">כמות</TableHead> {/* Added Quantity header */}
                            <TableHead className="text-right">מדווח/ת</TableHead>
                            <TableHead className="text-right">תאריך דיווח</TableHead>
                            <TableHead className="text-right">הערות</TableHead>
                            <TableHead className="text-center">פעולות</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan="7" className="text-center"> {/* Updated colSpan */}
                                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-gray-400" />
                                </TableCell>
                            </TableRow>
                        ) : shortages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan="7" className="text-center h-24 text-gray-500"> {/* Updated colSpan */}
                                    אין חוסרים הממתינים לטיפול. כל הכבוד!
                                </TableCell>
                            </TableRow>
                        ) : (
                            shortages.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium text-right">{item.item_name}</TableCell>
                                    <TableCell className="text-right"><Badge variant="secondary">{item.category}</Badge></TableCell>
                                    <TableCell className="text-right">{item.quantity_needed || '-'}</TableCell> {/* Display Quantity */}
                                    <TableCell className="text-right">{item.requested_by_name}</TableCell>
                                    <TableCell className="text-right">{new Date(item.created_date).toLocaleDateString('he-IL')}</TableCell>
                                    <TableCell className="text-sm text-gray-600 max-w-xs truncate text-right">{item.notes}</TableCell>
                                    <TableCell className="text-center space-x-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'ordered' })}
                                            disabled={updateStatusMutation.isPending}
                                            className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                                        >
                                            <Check className="w-4 h-4 ml-1" />
                                            סמן כהוזמן
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteMutation.mutate(item.id)}
                                            disabled={deleteMutation.isPending}
                                            className="text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
