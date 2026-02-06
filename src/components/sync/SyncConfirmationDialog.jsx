import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SyncConfirmationDialog({ 
    open, 
    onClose, 
    syncResults, 
    onConfirm,
    isConfirming 
}) {
    const [selectedUpdates, setSelectedUpdates] = useState(new Set());
    const [selectedCreates, setSelectedCreates] = useState(new Set());

    React.useEffect(() => {
        if (syncResults) {
            // Auto-select all items by default
            setSelectedUpdates(new Set(syncResults.proposed_updates.map(u => u.supplier_item_id)));
            setSelectedCreates(new Set(syncResults.proposed_creates.map(c => c.supplier_item_id)));
        }
    }, [syncResults]);

    if (!syncResults) return null;

    const handleToggleUpdate = (itemId) => {
        const newSet = new Set(selectedUpdates);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setSelectedUpdates(newSet);
    };

    const handleToggleCreate = (itemId) => {
        const newSet = new Set(selectedCreates);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setSelectedCreates(newSet);
    };

    const handleSelectAllUpdates = (checked) => {
        if (checked) {
            setSelectedUpdates(new Set(syncResults.proposed_updates.map(u => u.supplier_item_id)));
        } else {
            setSelectedUpdates(new Set());
        }
    };

    const handleSelectAllCreates = (checked) => {
        if (checked) {
            setSelectedCreates(new Set(syncResults.proposed_creates.map(c => c.supplier_item_id)));
        } else {
            setSelectedCreates(new Set());
        }
    };

    const handleConfirm = () => {
        const confirmedItems = [
            ...Array.from(selectedUpdates),
            ...Array.from(selectedCreates)
        ];
        onConfirm(confirmedItems);
    };

    const totalSelected = selectedUpdates.size + selectedCreates.size;
    const totalChanges = syncResults.proposed_updates.length + syncResults.proposed_creates.length;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">אישור סנכרון למחירון לקוחות</DialogTitle>
                    <DialogDescription>
                        נמצאו {totalChanges} שינויים מוצעים. בחר אילו שינויים לאשר.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">עדכונים</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-700">
                                {syncResults.proposed_updates.length}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                                {selectedUpdates.size} נבחרו
                            </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                                <PlusCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-900">יצירות חדשות</span>
                            </div>
                            <div className="text-2xl font-bold text-green-700">
                                {syncResults.proposed_creates.length}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                                {selectedCreates.size} נבחרו
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">ללא שינוי</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-700">
                                {syncResults.no_changes}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                                פריטים תואמים
                            </div>
                        </div>
                    </div>

                    {/* Tabs for Updates and Creates */}
                    <Tabs defaultValue="updates" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="updates">
                                עדכונים ({syncResults.proposed_updates.length})
                            </TabsTrigger>
                            <TabsTrigger value="creates">
                                יצירות חדשות ({syncResults.proposed_creates.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="updates" className="space-y-2">
                            {syncResults.proposed_updates.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={selectedUpdates.size === syncResults.proposed_updates.length}
                                                onCheckedChange={handleSelectAllUpdates}
                                            />
                                            <span className="text-sm font-medium">בחר הכל</span>
                                        </div>
                                    </div>
                                    <ScrollArea className="h-[400px] border rounded-lg p-2">
                                        <div className="space-y-2">
                                            {syncResults.proposed_updates.map((update) => (
                                                <div 
                                                    key={update.supplier_item_id}
                                                    className="border rounded-lg p-3 bg-white hover:bg-gray-50"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            checked={selectedUpdates.has(update.supplier_item_id)}
                                                            onCheckedChange={() => handleToggleUpdate(update.supplier_item_id)}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 mb-2">
                                                                {update.product_name}
                                                            </div>
                                                            <div className="space-y-1 text-sm">
                                                                {Object.entries(update.new_values).map(([field, newValue]) => {
                                                                    const oldValue = update.current_values[field];
                                                                    const displayField = {
                                                                        category: 'קטגוריה',
                                                                        sub_category: 'תת קטגוריה',
                                                                        supplier_price: 'מחיר ספק',
                                                                        supplier_name: 'שם ספק'
                                                                    }[field] || field;

                                                                    return (
                                                                        <div key={field} className="flex items-center gap-2">
                                                                            <span className="text-gray-600">{displayField}:</span>
                                                                            <Badge variant="outline" className="bg-red-50">
                                                                                {oldValue || '-'}
                                                                            </Badge>
                                                                            <span>→</span>
                                                                            <Badge variant="outline" className="bg-green-50">
                                                                                {newValue || '-'}
                                                                            </Badge>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    אין עדכונים מוצעים
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="creates" className="space-y-2">
                            {syncResults.proposed_creates.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={selectedCreates.size === syncResults.proposed_creates.length}
                                                onCheckedChange={handleSelectAllCreates}
                                            />
                                            <span className="text-sm font-medium">בחר הכל</span>
                                        </div>
                                    </div>
                                    <ScrollArea className="h-[400px] border rounded-lg p-2">
                                        <div className="space-y-2">
                                            {syncResults.proposed_creates.map((create) => (
                                                <div 
                                                    key={create.supplier_item_id}
                                                    className="border rounded-lg p-3 bg-white hover:bg-gray-50"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            checked={selectedCreates.has(create.supplier_item_id)}
                                                            onCheckedChange={() => handleToggleCreate(create.supplier_item_id)}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 mb-2">
                                                                {create.product_name}
                                                            </div>
                                                            <div className="space-y-1 text-sm text-gray-600">
                                                                <div className="flex gap-2">
                                                                    <span>קטגוריה:</span>
                                                                    <Badge variant="outline">{create.data.category || '-'}</Badge>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span>תת קטגוריה:</span>
                                                                    <Badge variant="outline">{create.data.sub_category || '-'}</Badge>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span>ספק:</span>
                                                                    <Badge variant="outline">{create.data.supplier_name || '-'}</Badge>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span>מחיר ספק:</span>
                                                                    <Badge variant="outline">{create.data.supplier_price ? `₪${create.data.supplier_price.toFixed(2)}` : '-'}</Badge>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span>מחיר לקוח מוצע:</span>
                                                                    <Badge variant="outline" className="bg-green-50">{create.data.client_price ? `₪${create.data.client_price.toFixed(2)}` : '-'}</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    אין פריטים חדשים ליצירה
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={onClose}
                        disabled={isConfirming}
                    >
                        ביטול
                    </Button>
                    <Button 
                        onClick={handleConfirm}
                        disabled={totalSelected === 0 || isConfirming}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isConfirming ? (
                            <>
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                מסנכרן...
                            </>
                        ) : (
                            <>
                                אשר סנכרון ({totalSelected})
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}