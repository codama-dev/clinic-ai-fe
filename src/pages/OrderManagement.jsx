import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, ShieldAlert, ShoppingCart, Loader2, DollarSign, FileDown, CheckCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import OrderForm from "../components/orders/OrderForm";
import ShortageList from "../components/orders/ShortageList";
import { useToast } from "@/components/ui/use-toast";
import OrderPDFLayout from "../components/orders/OrderPDFLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryCountModule from "../components/inventory/InventoryCountModule";
import { format } from "date-fns";

const STATUS_HE = {
  pending: "ממתינה",
  processing: "בעיבוד",
  shipped: "נשלחה",
  delivered: "הוזמנה",
  cancelled: "בוטלה",
  draft: "טיוטה"
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
};

export default function OrderManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderToPrint, setOrderToPrint] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_orders');
  const hasPriceListAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_supplier_price_list');
  const isAdmin = currentUser?.role === 'admin';

  const { data: orders = [], isLoading: isOrdersLoading, error: ordersError } = useQuery({
      queryKey: ['orders'],
      queryFn: async () => {
        console.log('Fetching orders...');
        const result = await base44.entities.Order.list('-created_date');
        console.log('Orders fetched:', result);
        return result;
      },
      enabled: hasAccess,
  });

  if (ordersError) {
    console.error('Error loading orders:', ordersError);
  }

  const orderNumberMap = useMemo(() => {
    if (!orders || orders.length === 0) return new Map();
    // Sort by created_date to ensure consistent numbering regardless of 'order_date'
    const sortedOrders = [...orders].sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
    const map = new Map();
    sortedOrders.forEach((order, index) => {
        map.set(order.id, 1001 + index);
    });
    return map;
  }, [orders]);

  // Update existing orders with order_number if missing
  React.useEffect(() => {
    if (!orders || orders.length === 0 || !hasAccess) return;
    
    const updateOrderNumbers = async () => {
      const ordersWithoutNumber = orders.filter(order => !order.order_number);
      if (ordersWithoutNumber.length === 0) return;

      for (const order of ordersWithoutNumber) {
        const calculatedNumber = orderNumberMap.get(order.id);
        if (calculatedNumber) {
          try {
            await base44.entities.Order.update(order.id, { order_number: calculatedNumber });
          } catch (error) {
            console.error(`Error updating order ${order.id}:`, error);
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    updateOrderNumbers();
  }, [orders, orderNumberMap, hasAccess]);

  const { data: shortages = [], isLoading: shortagesLoading } = useQuery({
      queryKey: ['inventoryShortages'],
      queryFn: () => base44.entities.InventoryShortage.filter({ status: 'needed' }, '-created_date'),
      enabled: hasAccess,
  });

  const orderMutation = useMutation({
    mutationFn: (orderData) => {
        // The form now prepares the complete data, so we don't differentiate between create/edit here.
        // The form will pass the ID if it's an edit.
        if (orderData.id) {
            const { id, ...data } = orderData;
            return base44.entities.Order.update(id, data);
        } else {
            return base44.entities.Order.create(orderData);
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        setIsFormOpen(false);
        setEditingOrder(null);
        toast({
            title: "הזמנה נשמרה בהצלחה",
            description: editingOrder ? "ההזמנה עודכנה בהצלחה." : "ההזמנה החדשה נוצרה בהצלחה.",
        });
    },
    onError: (error) => {
        console.error("Error saving order:", error);
        toast({
            title: "שגיאה",
            description: `שגיאה בשמירת ההזמנה: ${error.message || 'נסה שוב מאוחר יותר.'}`,
            variant: "destructive",
        });
    }
  });

  const updateStatusMutation = useMutation({
      mutationFn: ({ orderId, status }) => base44.entities.Order.update(orderId, { status }),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          toast({
              title: "סטטוס הזמנה עודכן",
              description: "ההזמנה סומנה כטופלה.",
          });
      },
      onError: (error) => {
          console.error("Error updating status:", error);
          toast({
              title: "שגיאה",
              description: "שגיאה בעדכון סטטוס ההזמנה.",
              variant: "destructive",
          });
      }
  });

  const deleteOrderMutation = useMutation({
      mutationFn: (orderId) => base44.entities.Order.delete(orderId),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          setOrderToDelete(null);
          toast({
              title: "הזמנה נמחקה",
              description: "ההזמנה נמחקה בהצלחה.",
          });
      },
      onError: (error) => {
          console.error("Error deleting order:", error);
          toast({
              title: "שגיאה",
              description: "שגיאה במחיקת ההזמנה.",
              variant: "destructive",
          });
      }
  });


  const handleEdit = (order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };
  
  const handleCreate = () => {
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  const handleMarkAsCompleted = (order) => {
      if (order.status === 'delivered' || order.status === 'cancelled') {
        toast({
            title: "שגיאה",
            description: "לא ניתן לסמן הזמנה שהיא כבר 'הוזמנה' או 'בוטלה'.",
            variant: "destructive",
        });
        return;
      }
      updateStatusMutation.mutate({ orderId: order.id, status: 'delivered' });
  };

  const handleDeleteConfirm = () => {
    if (orderToDelete) {
      deleteOrderMutation.mutate(orderToDelete.id);
    }
  };

  const toggleOrderExpand = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const filteredOrders = orders.filter(order => {
    return (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  if (isUserLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!hasAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 border-red-500">
        <CardHeader className="text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
          <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            עמוד זה מיועד למשתמשים בעלי הרשאת "ניהול הזמנות" בלבד.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
        {/* PDF Layout - will be hidden by print styles but rendered to trigger print */}
        {orderToPrint && <OrderPDFLayout order={orderToPrint} onDone={() => setOrderToPrint(null)} />}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>האם למחוק הזמנה זו?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את ההזמנה לצמיתות. לא ניתן לשחזר אותה.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><ShoppingCart/>ניהול הזמנות</h1>
                <p className="text-gray-500">מעקב וניהול אחר הזמנות המרפאה וטיפול בחוסרי מלאי.</p>
            </div>
            <div className="flex items-center gap-2">
                 {hasPriceListAccess && (
                    <Button asChild variant="outline">
                        <Link to={createPageUrl("SupplierPriceListPage")}>
                            <DollarSign className="w-4 h-4 ml-2" />
                            ניהול מחירון ספקים
                        </Link>
                    </Button>
                 )}
                 <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingOrder(null); setIsFormOpen(isOpen);}}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                            <Plus className="w-4 h-4 ml-2" />
                            הזמנה חדשה
                        </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle className="text-right">{editingOrder ? 'עריכת הזמנה' : 'יצירת הזמנה חדשה'}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 max-h-[80vh] overflow-y-auto pr-2">
                           <OrderForm 
                               order={editingOrder}
                               onSubmit={orderMutation.mutate}
                               onCancel={() => { setIsFormOpen(false); setEditingOrder(null); }}
                               isSubmitting={orderMutation.isPending}
                               initialItems={!editingOrder ? shortages : []}
                           />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <Tabs defaultValue="orders" dir="rtl" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">הזמנות</TabsTrigger>
            <TabsTrigger value="shortages">חוסרים במלאי</TabsTrigger>
            <TabsTrigger value="inventory">ספירת מלאי</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle>רשימת הזמנות</CardTitle>
             <div className="w-full max-w-sm relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-right">מספר הזמנה</TableHead>
                <TableHead className="text-right">תאריך ושעה</TableHead>
                <TableHead className="text-center">סטטוס</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-center">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersLoading ? (
                <TableRow><TableCell colSpan="6" className="text-center"><Loader2 className="mx-auto w-6 h-6 animate-spin" /></TableCell></TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan="6" className="text-center">לא נמצאו הזמנות</TableCell></TableRow>
              ) : (
                filteredOrders.map(order => {
                  const hasNotes = order.items?.some(item => item.notes);
                  const isExpanded = expandedOrders.has(order.id);
                  return (
                    <React.Fragment key={order.id}>
                      <TableRow>
                        <TableCell>
                          {hasNotes && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleOrderExpand(order.id)}
                              className="h-6 w-6"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-right">{order.order_number || orderNumberMap.get(order.id)}</TableCell>
                        <TableCell className="text-right">
                          <div>{format(new Date(order.created_date), 'dd/MM/yyyy')}</div>
                          <div className="text-xs text-gray-500">{format(new Date(order.created_date), 'HH:mm')}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${STATUS_COLORS[order.status]}`}>{STATUS_HE[order.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right">₪{(order.total_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-center space-x-1">
                            {order.status === 'draft' ? (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(order)} title="ערוך טיוטה">
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setOrderToDelete(order)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="מחק טיוטה"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleMarkAsCompleted(order)}
                                    disabled={order.status === 'delivered' || order.status === 'cancelled' || updateStatusMutation.isPending}
                                    className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setOrderToPrint(order)}>
                                    <FileDown className="h-4 w-4 text-blue-600" />
                                </Button>
                                {isAdmin && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setOrderToDelete(order)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="מחק הזמנה"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasNotes && (
                        <TableRow>
                          <TableCell colSpan="6" className="bg-amber-50 p-0">
                            <div className="p-4">
                              <div className="text-sm font-semibold mb-2">הערות על פריטים:</div>
                              <div className="space-y-2">
                                {order.items.filter(item => item.notes).map((item, idx) => (
                                  <div key={idx} className="bg-white p-2 rounded border border-amber-200">
                                    <span className="font-medium">{item.product_name}:</span>{' '}
                                    <span className="text-gray-700">{item.notes}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
          </TabsContent>

          <TabsContent value="shortages">
            <ShortageList shortages={shortages} isLoading={shortagesLoading} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryCountModule currentUser={currentUser} />
          </TabsContent>
        </Tabs>
    </div>
  );
}