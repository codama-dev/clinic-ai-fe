import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Package, Calendar, DollarSign, User, Loader2, FileDown, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import OrderPDFLayout from "../components/orders/OrderPDFLayout";

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

export default function OrderDetailsPage() {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderToPrint, setOrderToPrint] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('id');
        
        if (!orderId) {
          navigate(createPageUrl("OrderManagement"));
          return;
        }

        const orders = await base44.entities.Order.list();
        const foundOrder = orders.find(o => o.id === orderId);
        
        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          navigate(createPageUrl("OrderManagement"));
        }
      } catch (error) {
        console.error("Error loading order:", error);
        navigate(createPageUrl("OrderManagement"));
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      {orderToPrint && <OrderPDFLayout order={orderToPrint} onDone={() => setOrderToPrint(null)} />}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(createPageUrl("OrderManagement"))}>
          <ArrowRight className="w-4 h-4 ml-2" />
          חזרה לרשימת הזמנות
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`${createPageUrl("OrderManagement")}?edit=${order.id}`)}>
            <Edit className="w-4 h-4 ml-2" />
            ערוך הזמנה
          </Button>
          <Button onClick={() => setOrderToPrint(order)}>
            <FileDown className="w-4 h-4 ml-2" />
            הורד PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Package className="w-6 h-6" />
              פרטי הזמנה
            </CardTitle>
            <Badge className={`${STATUS_COLORS[order.status]} text-lg px-4 py-2`}>
              {STATUS_HE[order.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600">תאריך הזמנה</div>
                <div className="font-semibold">{format(new Date(order.order_date), 'dd/MM/yyyy')}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">סכום כולל</div>
                <div className="font-semibold text-lg">₪{(order.total_amount || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">נוצר על ידי</div>
                <div className="font-semibold">{order.created_by || 'לא ידוע'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-600">תאריך יצירה</div>
                <div className="font-semibold">{format(new Date(order.created_date), 'dd/MM/yyyy HH:mm')}</div>
              </div>
            </div>
          </div>

          {order.received_by && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800 font-semibold mb-1">
                <User className="w-4 h-4" />
                אושר קבלה
              </div>
              <div className="text-sm text-blue-700">
                ע"י: {order.received_by} • {format(new Date(order.received_date), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-3">פריטים בהזמנה</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם מוצר</TableHead>
                  <TableHead className="text-center">כמות</TableHead>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">מחיר ליחידה</TableHead>
                  <TableHead className="text-right">סה"כ</TableHead>
                  <TableHead className="text-center">התקבל</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item, index) => {
                  const itemTotal = (item.quantity || 0) * (item.price_per_unit || 0);
                  const isReceived = order.received_items?.[item.product_name];
                  
                  return (
                    <React.Fragment key={index}>
                      <TableRow className={isReceived ? 'bg-green-50' : ''}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{item.chosen_supplier || '-'}</TableCell>
                        <TableCell>₪{(item.price_per_unit || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">₪{itemTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {isReceived ? (
                            <Badge className="bg-green-100 text-green-800">✓</Badge>
                          ) : (
                            <Badge variant="outline">✗</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {item.notes && (
                        <TableRow>
                          <TableCell colSpan="6" className="bg-amber-50 py-2">
                            <div className="text-sm">
                              <strong>הערה:</strong> {item.notes}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}