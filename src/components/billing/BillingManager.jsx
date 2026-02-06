import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, DollarSign, CreditCard, Banknote, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function BillingManager({ clientId, clientName, visits, onRefresh }) {
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [isBillingFormOpen, setIsBillingFormOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    reference: '',
    notes: ''
  });

  const { data: clientPriceList = [] } = useQuery({
    queryKey: ['clientPriceList'],
    queryFn: () => base44.entities.ClientPriceList.list('-created_date', 500)
  });

  const { data: billings = [], refetch: refetchBillings } = useQuery({
    queryKey: ['clientBillings', clientId],
    queryFn: async () => {
      const allBillings = await base44.entities.Billing.list('-billing_date', 100);
      return allBillings.filter(b => b.client_id === clientId);
    },
    enabled: !!clientId
  });

  // Organize visits with their billable items
  const visitsWithItems = useMemo(() => {
    // Filter only completed visits
    const completedVisits = visits.filter(v => v.status === 'completed');
    
    return completedVisits.map(visit => {
      const items = [];
      
      // Items from price list
      if (visit.items_from_pricelist && Array.isArray(visit.items_from_pricelist)) {
        visit.items_from_pricelist.forEach(item => {
          items.push({
            product_name: item.product_name,
            quantity: item.quantity || 1,
            unit_price: item.price || 0,
            total: (item.price || 0) * (item.quantity || 1)
          });
        });
      }
      
      // ALL lab tests with a price (regardless of from_price_list flag)
      if (visit.lab_tests && Array.isArray(visit.lab_tests)) {
        visit.lab_tests.filter(test => test.test_name && test.price && test.price > 0).forEach(test => {
          items.push({
            product_name: test.test_name,
            quantity: 1,
            unit_price: test.price || 0,
            total: test.price || 0
          });
        });
      }
      
      // Prescriptions (medications)
      if (visit.prescriptions && Array.isArray(visit.prescriptions)) {
        visit.prescriptions.forEach(rx => {
          // Try to find price from price list
          const priceListItem = clientPriceList.find(p => p.product_name === rx.medication_name);
          if (priceListItem) {
            items.push({
              product_name: rx.medication_name,
              quantity: 1,
              unit_price: priceListItem.client_price || 0,
              total: priceListItem.client_price || 0
            });
          }
        });
      }
      
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
      
      return {
        visit_id: visit.id,
        visit_number: visit.visit_number,
        visit_date: visit.visit_date,
        patient_name: visit.patient_name,
        client_name: visit.client_name || visit.full_name,
        client_number: visit.client_number,
        doctor_name: visit.doctor_name,
        items: items,
        totalAmount: totalAmount
      };
    }).filter(v => v.items.length > 0); // Only visits with billable items
  }, [visits, clientPriceList]);

  const createBillingMutation = useMutation({
    mutationFn: (data) => base44.entities.Billing.create(data),
    onSuccess: () => {
      refetchBillings();
      setIsBillingFormOpen(false);
      toast.success('החשבון נוצר בהצלחה');
      if (onRefresh) onRefresh();
    }
  });

  const updateBillingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Billing.update(id, data),
    onSuccess: () => {
      refetchBillings();
      setSelectedBilling(null);
      setIsBillingFormOpen(false);
      setIsPaymentDialogOpen(false);
      toast.success('החשבון עודכן בהצלחה');
      if (onRefresh) onRefresh();
    }
  });

  const deleteBillingMutation = useMutation({
    mutationFn: (id) => base44.entities.Billing.delete(id),
    onSuccess: () => {
      refetchBillings();
      toast.success('החשבון נמחק');
      if (onRefresh) onRefresh();
    }
  });

  const handleCreateBillingFromVisit = (visitData) => {
    const items = visitData.items.map(item => ({
      description: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    setSelectedBilling({
      client_id: clientId,
      client_name: visitData.client_name || clientName,
      patient_id: '',
      patient_name: visitData.patient_name || '',
      visit_id: visitData.visit_id || '',
      visit_date: visitData.visit_date || '',
      billing_date: new Date().toISOString().split('T')[0],
      items: items,
      subtotal: subtotal,
      discount: 0,
      vat_rate: 0,
      vat_amount: 0,
      total: subtotal,
      status: 'pending'
    });
    setIsBillingFormOpen(true);
  };

  const handleAddPayment = () => {
    if (!selectedBilling || !paymentData.amount) {
      toast.error('נא למלא סכום תשלום');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (amount <= 0) {
      toast.error('סכום התשלום חייב להיות חיובי');
      return;
    }

    const newPayment = {
      date: new Date().toISOString(),
      amount: amount,
      method: paymentData.method,
      reference: paymentData.reference,
      notes: paymentData.notes
    };

    const updatedPayments = [...(selectedBilling.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const newBalance = selectedBilling.total - totalPaid;
    const newStatus = newBalance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

    updateBillingMutation.mutate({
      id: selectedBilling.id,
      data: {
        payments: updatedPayments,
        amount_paid: totalPaid,
        balance: newBalance,
        status: newStatus
      }
    });

    setPaymentData({ amount: '', method: 'cash', reference: '', notes: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">חיובים ותשלומים</h3>
          {visitsWithItems.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700 mt-2">
              {visitsWithItems.length} ביקורים ממתינים לחיוב
            </Badge>
          )}
        </div>
      </div>

      {visitsWithItems.length > 0 && (
        <div className="space-y-3 mb-6">
          <h4 className="font-semibold text-orange-800">ביקורים שטרם חויבו</h4>
          {visitsWithItems.map((visitData) => (
            <Card key={visitData.visit_id} className="border-2 border-orange-300">
              <CardHeader className="bg-orange-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex gap-3 mb-3">
                      <div className="bg-white p-3 rounded-lg border border-orange-200 flex-shrink-0">
                        <p className="text-xs text-gray-500 mb-1">מספר לקוח</p>
                        <p className="text-2xl font-bold text-orange-700">#{visitData.client_number}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-orange-200 flex-1">
                        <p className="text-xs text-gray-500 mb-1">שם לקוח</p>
                        <p className="text-xl font-bold text-gray-800">{visitData.client_name}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-orange-200 flex-1">
                        <p className="text-xs text-gray-500 mb-1">מטופל</p>
                        <p className="text-xl font-bold text-gray-800">{visitData.patient_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Badge variant="outline" className="bg-white text-orange-800 border-orange-300">
                        {visitData.visit_number ? `ביקור #${visitData.visit_number}` : 'ביקור'}
                      </Badge>
                      <span className="font-semibold">📅 {formatDate(visitData.visit_date)}</span>
                      {visitData.doctor_name && <span>👨‍⚕️ {visitData.doctor_name}</span>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-2">פריטים לחיוב:</p>
                  {visitData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-500">כמות: {item.quantity}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-600">מחיר יחידה: ₪{item.unit_price.toFixed(2)}</p>
                        <p className="font-semibold text-orange-700">סה"כ: ₪{item.total.toFixed(2)}</p>
                      </div>
                      </div>
                      ))}
                      </div>
                      </CardContent>
                      <div className="bg-orange-100 border-t-2 border-orange-300 p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-lg font-semibold text-gray-700">סה"כ לתשלום:</span>
                            <span className="text-3xl font-bold text-orange-700 mr-3">₪{visitData.totalAmount.toFixed(2)}</span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleCreateBillingFromVisit(visitData)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            צור חשבון
                          </Button>
                        </div>
                      </div>
                      </Card>
          ))}
        </div>
      )}

      {billings.length === 0 && visitsWithItems.length === 0 ? (
        <p className="text-center py-8 text-gray-500">אין חיובים רשומים</p>
      ) : billings.length > 0 && (
        <div className="space-y-3">
          {billings.map(billing => (
            <Card key={billing.id} className={`border-2 ${
              billing.status === 'paid' ? 'border-green-300 bg-green-50/30' :
              billing.status === 'partial' ? 'border-yellow-300 bg-yellow-50/30' :
              'border-gray-300'
            }`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-xl">₪{billing.total?.toFixed(2)}</h3>
                      <Badge variant={
                        billing.status === 'paid' ? 'default' :
                        billing.status === 'partial' ? 'secondary' :
                        'outline'
                      } className={
                        billing.status === 'paid' ? 'bg-green-600' :
                        billing.status === 'partial' ? 'bg-yellow-500' :
                        ''
                      }>
                        {billing.status === 'paid' ? 'שולם' :
                         billing.status === 'partial' ? 'שולם חלקית' :
                         billing.status === 'pending' ? 'ממתין לתשלום' : billing.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(billing.billing_date)} • {billing.patient_name}
                    </p>
                    {billing.balance > 0 && (
                      <p className="text-sm font-semibold text-red-600 mt-1">
                        יתרה לתשלום: ₪{billing.balance.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {billing.status !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedBilling(billing);
                          setPaymentData({
                            amount: billing.balance?.toString() || '',
                            method: 'cash',
                            reference: '',
                            notes: ''
                          });
                          setIsPaymentDialogOpen(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="w-4 h-4 ml-2" />
                        קבל תשלום
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBilling(billing);
                        setIsBillingFormOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      ערוך
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('האם למחוק את החשבון?')) {
                          deleteBillingMutation.mutate(billing.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {billing.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm border-b pb-1">
                      <span>{item.description} x{item.quantity}</span>
                      <span className="font-semibold">₪{item.total?.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {billing.payments && billing.payments.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold mb-2">תשלומים:</p>
                      {billing.payments.map((payment, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-gray-600 bg-green-50 p-2 rounded mb-1">
                          <span>
                            {formatDate(payment.date)} • {payment.method === 'cash' ? 'מזומן' : 
                             payment.method === 'credit' ? 'אשראי' : 
                             payment.method === 'check' ? 'המחאה' : payment.method}
                          </span>
                          <span className="font-semibold text-green-700">₪{payment.amount?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isBillingFormOpen} onOpenChange={setIsBillingFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{selectedBilling?.id ? 'עריכת חשבון' : 'חשבון חדש'}</DialogTitle>
          </DialogHeader>
          <BillingForm
            billing={selectedBilling}
            clientId={clientId}
            clientName={clientName}
            clientPriceList={clientPriceList}
            onSubmit={(data) => {
              if (selectedBilling?.id) {
                updateBillingMutation.mutate({ id: selectedBilling.id, data });
              } else {
                createBillingMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setIsBillingFormOpen(false);
              setSelectedBilling(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>קבלת תשלום</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">סכום לתשלום:</p>
              <p className="text-2xl font-bold text-blue-700">₪{selectedBilling?.balance?.toFixed(2)}</p>
            </div>

            <div>
              <Label>סכום התשלום *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>אמצעי תשלום *</Label>
              <Select value={paymentData.method} onValueChange={(val) => setPaymentData({ ...paymentData, method: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">מזומן</SelectItem>
                  <SelectItem value="credit">אשראי</SelectItem>
                  <SelectItem value="check">המחאה</SelectItem>
                  <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bit">ביט</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>אסמכתא</Label>
              <Input
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="מספר אסמכתא/אישור"
              />
            </div>

            <div>
              <Label>הערות</Label>
              <Input
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="הערות לתשלום"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleAddPayment} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 ml-2" />
                אשר תשלום
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillingForm({ billing, clientId, clientName, clientPriceList, onSubmit, onCancel }) {
  const VAT_RATE = 18;

  const calculateTotals = (currentItems, currentDiscount, currentDiscountType) => {
    const subtotal = currentItems.reduce((sum, item) => sum + item.total, 0);

    let discountAmount = currentDiscount || 0;
    if (currentDiscountType === 'percentage') {
      discountAmount = (subtotal * currentDiscount) / 100;
    }

    const totalAfterDiscount = subtotal - discountAmount;
    const vatAmount = totalAfterDiscount * (VAT_RATE / (100 + VAT_RATE));

    return {
      subtotal,
      vat_amount: vatAmount,
      total: totalAfterDiscount
    };
  };

  const [formData, setFormData] = useState(() => {
    const initialData = billing || {
      client_id: clientId,
      client_name: clientName,
      patient_id: '',
      patient_name: '',
      visit_id: '',
      visit_date: '',
      billing_date: new Date().toISOString().split('T')[0],
      items: [],
      subtotal: 0,
      discount: 0,
      discount_type: 'amount',
      discount_reason: '',
      vat_rate: VAT_RATE,
      vat_amount: 0,
      total: 0,
      status: 'pending',
      payments: [],
      amount_paid: 0,
      balance: 0
    };

    const calculated = calculateTotals(initialData.items, initialData.discount, initialData.discount_type);
    return { 
      ...initialData, 
      ...calculated,
      vat_rate: VAT_RATE,
      balance: calculated.total - (initialData.amount_paid || 0)
    };
  });
  
  const [discountType, setDiscountType] = useState(formData.discount_type);

  const addItem = () => {
    const newItems = [...formData.items, { description: '', quantity: 1, unit_price: 0, discount: 0, discount_type: 'amount', total: 0 }];
    const calculated = calculateTotals(newItems, formData.discount, formData.discount_type);
    setFormData({
      ...formData,
      items: newItems,
      ...calculated,
      vat_rate: VAT_RATE,
      balance: calculated.total - (formData.amount_paid || 0)
    });
  };

  const updateItem = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;

    if (field === 'description') {
      const priceListItem = clientPriceList.find(p => p.product_name === value);
      if (priceListItem) {
        items[index].unit_price = priceListItem.client_price;
      }
    }

    // Calculate item total: (quantity * unit_price) - discount
    const itemSubtotal = (items[index].quantity || 0) * (items[index].unit_price || 0);
    
    // Calculate discount based on type
    let itemDiscountAmount = items[index].discount || 0;
    if (items[index].discount_type === 'percentage') {
      itemDiscountAmount = (itemSubtotal * (items[index].discount || 0)) / 100;
    }
    
    items[index].total = itemSubtotal - itemDiscountAmount;

    const calculated = calculateTotals(items, formData.discount, formData.discount_type);
    setFormData({
      ...formData,
      items,
      ...calculated,
      vat_rate: VAT_RATE,
      balance: calculated.total - (formData.amount_paid || 0)
    });
  };

  const removeItem = (index) => {
    const items = formData.items.filter((_, i) => i !== index);
    const calculated = calculateTotals(items, formData.discount, formData.discount_type);
    setFormData({
      ...formData,
      items,
      ...calculated,
      vat_rate: VAT_RATE,
      balance: calculated.total - (formData.amount_paid || 0)
    });
  };

  const updateDiscount = (discount, type = discountType) => {
    const calculated = calculateTotals(formData.items, discount, type);
    setFormData({
      ...formData,
      discount,
      discount_type: type,
      ...calculated,
      vat_rate: VAT_RATE,
      balance: calculated.total - (formData.amount_paid || 0)
    });
    setDiscountType(type);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('נא להוסיף לפחות פריט אחד');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formData.visit_date && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-1">מקושר לביקור</p>
          <div className="text-sm text-gray-700">
            <p><strong>תאריך ביקור:</strong> {formatDate(formData.visit_date)}</p>
            <p><strong>לקוח:</strong> {formData.client_name}</p>
            {formData.patient_name && <p><strong>מטופל:</strong> {formData.patient_name}</p>}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>תאריך חשבון</Label>
          <Input
            type="date"
            value={formData.billing_date}
            onChange={(e) => setFormData({ ...formData, billing_date: e.target.value })}
          />
        </div>
        <div>
          <Label>שם מטופל (אופציונלי)</Label>
          <Input
            value={formData.patient_name}
            onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
            placeholder="שם המטופל"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>פריטי חשבון</CardTitle>
            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף פריט
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.items.length > 0 && (
            <div className="grid grid-cols-12 gap-2 mb-3 px-3 text-xs font-bold text-gray-700 bg-gray-100 py-2 rounded">
              <div className="col-span-3">שם הפריט</div>
              <div className="col-span-1 text-center">כמות</div>
              <div className="col-span-2 text-center">מחיר יחידה</div>
              <div className="col-span-1 text-center">סוג הנחה</div>
              <div className="col-span-2 text-center">הנחה</div>
              <div className="col-span-2 text-center">סה"כ</div>
              <div className="col-span-1"></div>
            </div>
          )}
          <div className="space-y-3">
            {formData.items.map((item, index) => {
              const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
              const itemDiscountAmount = item.discount_type === 'percentage' 
                ? (itemSubtotal * (item.discount || 0)) / 100 
                : (item.discount || 0);
              
              return (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-4 border-2 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="col-span-3">
                    <Label className="text-xs text-gray-500 mb-1 block">פריט</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    >
                      <option value="">בחר פריט</option>
                      {(() => {
                        const grouped = clientPriceList.reduce((acc, p) => {
                          const category = p.category || 'ללא קטגוריה';
                          if (!acc[category]) acc[category] = [];
                          acc[category].push(p);
                          return acc;
                        }, {});
                        
                        return Object.entries(grouped)
                          .sort(([catA], [catB]) => catA.localeCompare(catB, 'he'))
                          .map(([category, items]) => (
                            <optgroup key={category} label={category}>
                              {items.map(p => (
                                <option key={p.id} value={p.product_name}>
                                  {p.product_name} - ₪{p.client_price}
                                </option>
                              ))}
                            </optgroup>
                          ));
                      })()}
                    </select>
                  </div>
                  
                  <div className="col-span-1">
                    <Label className="text-xs text-gray-500 mb-1 block">כמות</Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                      className="text-center font-semibold"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">מחיר יחידה</Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 font-semibold">₪</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                        placeholder="0.00"
                        className="pr-8 text-center font-semibold"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      סה"כ: ₪{itemSubtotal.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="col-span-1">
                    <Label className="text-xs text-gray-500 mb-1 block">סוג</Label>
                    <Select
                      value={item.discount_type || 'amount'}
                      onValueChange={(val) => updateItem(index, 'discount_type', val)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">₪</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">הנחה</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.discount || 0}
                        onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        max={item.discount_type === 'percentage' ? 100 : undefined}
                        className="text-center font-semibold"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 font-semibold">
                        {item.discount_type === 'percentage' ? '%' : '₪'}
                      </span>
                    </div>
                    {itemDiscountAmount > 0 && (
                      <p className="text-xs text-orange-600 mt-1 text-center font-semibold">
                        -₪{itemDiscountAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">סה"כ</Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 font-bold text-sm">₪</span>
                      <Input
                        type="text"
                        value={item.total?.toFixed(2)}
                        disabled
                        className="bg-green-50 font-bold border-2 border-green-400 pr-8 text-center text-green-700"
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-center">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="hover:bg-red-50">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>סיכום חשבון</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-lg">
            <span>סכום ביניים:</span>
            <span className="font-semibold">₪{formData.subtotal?.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>סוג הנחה</Label>
              <Select 
                value={discountType} 
                onValueChange={(val) => {
                  setDiscountType(val);
                  updateDiscount(formData.discount, val);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">סכום (₪)</SelectItem>
                  <SelectItem value="percentage">אחוזים (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>הנחה {discountType === 'percentage' ? '(%)' : '(₪)'}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => updateDiscount(parseFloat(e.target.value) || 0)}
                  max={discountType === 'percentage' ? 100 : undefined}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {discountType === 'percentage' ? '%' : '₪'}
                </span>
              </div>
              {discountType === 'percentage' && formData.discount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ₪{((formData.subtotal * formData.discount) / 100).toFixed(2)}
                </p>
              )}
            </div>
            <div>
              <Label>סיבת ההנחה</Label>
              <Input
                value={formData.discount_reason || ''}
                onChange={(e) => setFormData({ ...formData, discount_reason: e.target.value })}
                placeholder="למשל: לקוח VIP"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-blue-900 mb-2">מע"מ (18%)</p>
            <p className="text-xs text-gray-600 mb-2">המחירים כוללים מע"מ. המע"מ מחושב מתוך הסכום הכולל.</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">רכיב המע"מ בחשבון:</span>
              <span className="text-lg font-bold text-blue-700">₪{(formData.vat_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mt-1 text-xs text-gray-600">
              <span>סכום ללא מע"מ:</span>
              <span>₪{((formData.total || 0) - (formData.vat_amount || 0)).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-2xl font-bold border-t-2 pt-3">
            <span>סה"כ לתשלום:</span>
            <span className="text-blue-700">₪{formData.total?.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button type="submit">
          <CheckCircle className="w-4 h-4 ml-2" />
          {billing?.id ? 'עדכן חשבון' : 'צור חשבון'}
        </Button>
      </div>
    </form>
  );
}