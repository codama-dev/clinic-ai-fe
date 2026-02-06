import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { History, Loader2 } from 'lucide-react';

const STATUS_HE = {
  needed: "ממתין לטיפול",
  ordered: "הוזמן",
  stocked: "במלאי"
};

const STATUS_COLORS = {
  needed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ordered: "bg-green-100 text-green-800 border-green-200",
  stocked: "bg-blue-100 text-blue-800 border-blue-200",
};


export default function MyShortageReports({ currentUser }) {
    const { data: myReports = [], isLoading } = useQuery({
        queryKey: ['myInventoryShortages', currentUser?.id],
        queryFn: () => base44.entities.InventoryShortage.filter({ requested_by_id: currentUser.id }, '-created_date', 20), // get last 20 reports
        enabled: !!currentUser,
    });

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <History className="text-purple-600" />
                    היסטוריית הדיווחים שלי
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">שם הפריט</TableHead>
                            <TableHead className="text-right">קטגוריה</TableHead>
                            <TableHead className="text-right">כמות</TableHead>
                            <TableHead className="text-right">תאריך דיווח</TableHead>
                            <TableHead className="text-right">הערות</TableHead>
                            <TableHead className="text-center">סטטוס</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan="6" className="text-center">
                                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-gray-400" />
                                </TableCell>
                            </TableRow>
                        ) : myReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan="6" className="text-center h-24 text-gray-500">
                                    לא דיווחת על חוסרים עדיין.
                                </TableCell>
                            </TableRow>
                        ) : (
                            myReports.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium text-right">{item.item_name}</TableCell>
                                    <TableCell className="text-right">{item.category}</TableCell>
                                    <TableCell className="text-right">{item.quantity_needed || '-'}</TableCell>
                                    <TableCell className="text-right">{new Date(item.created_date).toLocaleDateString('he-IL')}</TableCell>
                                    <TableCell className="text-right">
                                        {item.notes ? (
                                            <div className="text-sm text-gray-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                                {item.notes}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-800'}>
                                            {STATUS_HE[item.status] || item.status}
                                        </Badge>
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