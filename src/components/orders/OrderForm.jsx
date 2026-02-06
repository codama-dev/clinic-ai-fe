import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, X, Loader2, Wand2, AlertTriangle, CheckCircle, ChevronsUpDown, Check, Package, Edit } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "pending", label: "ממתינה" },
  { value: "processing", label: "בעיבוד" },
  { value: "shipped", label: "נשלחה" },
  { value: "delivered", label: "הוזמנה" },
  { value: "cancelled", label: "בוטלה" }
];

export default function OrderForm({ order, onSubmit, onCancel, isSubmitting, initialItems = [] }) {
  const [orderDate, setOrderDate] = useState(order?.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [itemsToOrder, setItemsToOrder] = useState(() => {
    if (order?.items) {
      return order.items.map(it => ({ product_name: it.product_name, quantity: it.quantity, notes: it.notes }));
    }
    if (initialItems && initialItems.length > 0) {
      return initialItems.map(shortage => ({
        product_name: shortage.item_name,
        quantity: shortage.quantity_needed || 1,
        notes: shortage.notes || ''
      }));
    }
    return [{ product_name: "", quantity: 1, notes: '' }];
  });
  
  // For drafts, start with null preparedItems to allow editing
  // For non-draft orders, start with preparedItems
  const [preparedItems, setPreparedItems] = useState(() => {
    if (order?.items && order.status !== 'draft') {
      return order.items;
    }
    return null;
  });
  
  const [totalAmount, setTotalAmount] = useState(order?.total_amount || 0);
  const [openComboboxIndex, setOpenComboboxIndex] = useState(null);
  const [draftOrderId, setDraftOrderId] = useState(order?.id || null);

  const { data: priceList = [], isLoading: isLoadingPriceList } = useQuery({
    queryKey: ['supplierPrices'],
    queryFn: () => base44.entities.SupplierPrice.list(),
  });

  const productOptions = useMemo(() => priceList.map(p => p.product_name), [priceList]);

  // Mutation for saving draft
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData) => {
      if (draftOrderId) {
        return await base44.entities.Order.update(draftOrderId, draftData);
      } else {
        const created = await base44.entities.Order.create(draftData);
        setDraftOrderId(created.id);
        return created;
      }
    },
    onError: (error) => {
      console.error("Error saving draft:", error);
    }
  });

  // Auto-save draft whenever items change
  useEffect(() => {
    if (!order && itemsToOrder.length > 0 && itemsToOrder.some(item => item.product_name)) {
      const timer = setTimeout(() => {
        saveDraft();
      }, 1000); // Debounce 1 second

      return () => clearTimeout(timer);
    }
  }, [itemsToOrder]);

  const saveDraft = () => {
    const draftData = {
      customer_name: "טיוטת הזמנה",
      order_date: orderDate,
      status: "draft",
      items: itemsToOrder.filter(item => item.product_name),
      total_amount: 0,
    };

    saveDraftMutation.mutate(draftData);
  };

  // Helper function to get available suppliers for a product
  const getAvailableSuppliers = (productName) => {
    const product = priceList.find(p => p.product_name === productName);
    if (!product || !product.supplier_prices) return [];
    
    return Object.entries(product.supplier_prices)
      .map(([supplier, price]) => ({ supplier, price: price || 0 }))
      .sort((a, b) => a.price - b.price);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...itemsToOrder];
    newItems[index][field] = value;
    setItemsToOrder(newItems);
    setPreparedItems(null);
  };

  const addItem = () => {
    setItemsToOrder([...itemsToOrder, { product_name: "", quantity: 1, notes: '' }]);
  };

  const removeItem = (index) => {
    const newItems = itemsToOrder.filter((_, i) => i !== index);
    setItemsToOrder(newItems);
    setPreparedItems(null);
  };

  const handlePrepareOrder = () => {
    if (itemsToOrder.some(item => !item.product_name || item.quantity <= 0)) {
        toast.warning("יש לבחור מוצר ולהזין כמות חיובית לכל הפריטים.");
        return;
    }

    let calculatedTotal = 0;
    const newPreparedItems = itemsToOrder.map(item => {
        const product = priceList.find(p => 
            p.product_name.trim().toLowerCase() === item.product_name.trim().toLowerCase()
        );
        if (!product || !product.supplier_prices) {
            return { ...item, chosen_supplier: 'לא נמצא', price_per_unit: 0, notes: item.notes || '' };
        }

        const [cheapest_supplier, price_per_unit] = Object.entries(product.supplier_prices)
            .filter(([_, price]) => price != null && price > 0)
            .reduce((best, current) => (current[1] < best[1] ? current : best), [null, Infinity]);

        if (cheapest_supplier) {
            calculatedTotal += item.quantity * price_per_unit;
        }

        return { 
            ...item, 
            chosen_supplier: cheapest_supplier || 'אין מחיר', 
            price_per_unit: price_per_unit === Infinity ? 0 : price_per_unit,
            notes: item.notes || ''
        };
    });

    setPreparedItems(newPreparedItems);
    setTotalAmount(calculatedTotal);
    toast.success("רשימת ההזמנה הוכנה עם הספקים הזולים ביותר!");
  };

  const handleSupplierChange = (itemIndex, newSupplier) => {
    const item = preparedItems[itemIndex];
    const availableSuppliers = getAvailableSuppliers(item.product_name);
    const selectedSupplierData = availableSuppliers.find(s => s.supplier === newSupplier);
    
    if (!selectedSupplierData) return;

    const newPreparedItems = [...preparedItems];
    newPreparedItems[itemIndex] = {
      ...item,
      chosen_supplier: selectedSupplierData.supplier,
      price_per_unit: selectedSupplierData.price
    };

    // Recalculate total
    const newTotal = newPreparedItems.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.price_per_unit || 0));
    }, 0);

    setPreparedItems(newPreparedItems);
    setTotalAmount(newTotal);
    toast.success(`הספק עודכן ל${newSupplier} - מחיר: ₪${selectedSupplierData.price.toFixed(2)}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preparedItems) {
      toast.error("יש להכין את רשימת ההזמנה לפני השליחה.");
      return;
    }
    
    const finalOrderData = {
      customer_name: "הזמנה למרפאה",
      order_date: orderDate,
      status: "pending",
      items: preparedItems,
      total_amount: totalAmount,
    };
    
    // Assign order_number for new orders or drafts being converted
    if (!order || (order && !order.order_number)) {
      const allOrders = await base44.entities.Order.list('-order_number', 1);
      const maxOrderNumber = allOrders.length > 0 && allOrders[0].order_number 
        ? allOrders[0].order_number 
        : 1000;
      finalOrderData.order_number = maxOrderNumber + 1;
    }
    
    if (draftOrderId && !order) {
      finalOrderData.id = draftOrderId;
    } else if (order) {
      finalOrderData.id = order.id;
    }
    
    onSubmit(finalOrderData);
  };

  if (isLoadingPriceList) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="w-6 h-6 animate-spin" /> טוען מחירון...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      <div className="grid md:grid-cols-1 gap-6">
        <div>
          <Label htmlFor="order_date">תאריך הזמנה *</Label>
          <Input id="order_date" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} required />
        </div>
      </div>

      {!order && draftOrderId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">ההזמנה נשמרה אוטומטית כטיוטה</span>
        </div>
      )}

      {order?.status === 'draft' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">עריכת טיוטה - ניתן להוסיף, לשנות או להסיר פריטים</span>
        </div>
      )}

      <div className="space-y-4">
        <Label className="text-lg font-semibold">פריטים להזמנה</Label>
        
        {!preparedItems ? (
            <div className="p-4 border rounded-lg bg-gray-50/50 space-y-3">
                {itemsToOrder.map((item, index) => (
                    <div key={index} className="space-y-2 p-3 bg-white rounded border border-gray-200">
                        <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-8">
                                <Popover 
                                  open={openComboboxIndex === index} 
                                  onOpenChange={(isOpen) => setOpenComboboxIndex(isOpen ? index : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={openComboboxIndex === index}
                                      className="w-full justify-between"
                                    >
                                      {item.product_name || "בחר מוצר או הזן ידנית..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0" align="start">
                                    <Command>
                                      <CommandInput 
                                        placeholder="חפש מוצר או הזן שם חדש..." 
                                        value={item.product_name}
                                        onValueChange={(value) => handleItemChange(index, 'product_name', value)}
                                      />
                                      <CommandList className="max-h-[300px] overflow-y-auto">
                                        {item.product_name && !productOptions.includes(item.product_name) && (
                                          <CommandGroup heading="הוסף מוצר חדש">
                                            <CommandItem
                                              value={item.product_name}
                                              onSelect={() => {
                                                setOpenComboboxIndex(null);
                                              }}
                                            >
                                              <Plus className="ml-2 h-4 w-4" />
                                              <span>הוסף "{item.product_name}"</span>
                                            </CommandItem>
                                          </CommandGroup>
                                        )}
                                        <CommandGroup heading="מוצרים במחירון">
                                          {productOptions.length === 0 ? (
                                            <CommandEmpty>לא נמצאו מוצרים במחירון</CommandEmpty>
                                          ) : (
                                            productOptions.map((productName) => (
                                              <CommandItem
                                                key={productName}
                                                value={productName}
                                                onSelect={(currentValue) => {
                                                  handleItemChange(index, 'product_name', currentValue);
                                                  setOpenComboboxIndex(null);
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "ml-2 h-4 w-4",
                                                    item.product_name === productName ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                <Package className="ml-2 h-4 w-4 text-purple-500" />
                                                {productName}
                                              </CommandItem>
                                            ))
                                          )}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                            </div>
                            <Input 
                              type="number" 
                              placeholder="כמות" 
                              value={item.quantity} 
                              min="1" 
                              onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} 
                              className="col-span-3" 
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeItem(index)} 
                              className="col-span-1 text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div>
                            <Input 
                              placeholder="הערות (אופציונלי)" 
                              value={item.notes || ''} 
                              onChange={e => handleItemChange(index, 'notes', e.target.value)} 
                              className="text-sm"
                            />
                        </div>
                    </div>
                ))}
                <div className="flex justify-between items-center mt-4">
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="w-4 h-4 ml-2" /> הוסף פריט
                    </Button>
                    <Button type="button" onClick={handlePrepareOrder} className="bg-blue-600 hover:bg-blue-700">
                        <Wand2 className="w-4 h-4 ml-2" /> הכן רשימת הזמנה
                    </Button>
                </div>
            </div>
        ) : (
            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50/30">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">שם מוצר</TableHead>
                            <TableHead className="text-center">כמות</TableHead>
                            <TableHead className="text-right">ספק</TableHead>
                            <TableHead className="text-right">מחיר ליחידה</TableHead>
                            <TableHead className="text-right">הערות</TableHead>
                            <TableHead className="text-right">סה"כ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {preparedItems.map((item, index) => {
                            const availableSuppliers = getAvailableSuppliers(item.product_name);
                            const hasMultipleSuppliers = availableSuppliers.length > 1;
                            const itemTotal = (item.quantity || 0) * (item.price_per_unit || 0);
                            
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium text-right">{item.product_name}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                        {item.chosen_supplier || (
                                            <span className="text-red-600 flex items-center gap-1">
                                                <AlertTriangle className="w-4 h-4"/>
                                                לא נמצא
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">₪{(item.price_per_unit || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {item.notes ? (
                                            <div className="text-sm text-gray-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                                {item.notes}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">₪{itemTotal.toFixed(2)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <div className="text-right font-bold text-xl mt-4">
                    סך הכל: <span className="text-green-600">₪{(totalAmount || 0).toFixed(2)}</span>
                </div>
                 <Button type="button" variant="outline" onClick={() => setPreparedItems(null)} className="mt-4 border-blue-500 text-blue-600 hover:bg-blue-50">
                    <Edit className="w-4 h-4 ml-2" />
                    ערוך רשימה
                 </Button>
            </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting || !preparedItems}>
            {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            {order ? 'עדכן הזמנה' : 'צור הזמנה'}
        </Button>
      </div>
    </form>
  );
}