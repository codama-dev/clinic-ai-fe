import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function OrderPDFLayout({ order, onDone }) {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `הזמנה ${order.orderNumber} - LoVeT`;
    
    const timer = setTimeout(() => {
      window.print();
      if (onDone) onDone();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.title = originalTitle;
    };
  }, [onDone, order.orderNumber]);

  const statusHe = {
    pending: "ממתינה",
    processing: "בעיבוד",
    shipped: "נשלחה",
    delivered: "הושלמה",
    cancelled: "בוטלה"
  };

  const totalAmount = order.items?.reduce((sum, item) => {
    return sum + ((item.price_per_unit || 0) * (item.quantity || 0));
  }, 0) || 0;

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-order, #printable-order * {
            visibility: visible;
          }
          #printable-order {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-after: avoid !important;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
          }
          table {
            page-break-inside: auto;
            page-break-after: avoid;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          #printable-order {
            max-height: none !important;
            overflow: visible !important;
          }
          #printable-order > *:last-child {
            page-break-after: avoid !important;
            margin-bottom: 0 !important;
          }
        }
        @media screen {
          #printable-order {
            display: none;
          }
        }
      `}</style>

      <div id="printable-order" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
        {/* Header with Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #9333ea', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/7c4ff2a29_-.png"
              alt="LoVeT לוגו"
              style={{ height: '80px' }}
            />
          </div>
          <h1 style={{ margin: '0', fontSize: '28px', color: '#1f2937', fontWeight: 'bold' }}>
            הזמנה מספר {order.orderNumber}
          </h1>
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#6b7280' }}>
            <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
              תאריך הזמנה: {order.date}
            </p>
            {order.customer_name && (
              <p style={{ margin: '5px 0' }}>
                לקוח: {order.customer_name}
              </p>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#7c3aed', fontWeight: 'bold' }}>
            פרטי הזמנה
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '14px' }}>
            <div>
              <strong>תאריך הזמנה:</strong> {order.date}
            </div>
            <div>
              <strong>סטטוס:</strong> {statusHe[order.status] || order.status}
            </div>
            <div>
              <strong>מספר פריטים:</strong> {order.items?.length || 0}
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ 
            margin: '0 0 15px 0', 
            fontSize: '18px', 
            color: '#7c3aed', 
            fontWeight: 'bold',
            borderBottom: '2px solid #7c3aed',
            paddingBottom: '8px'
          }}>
            פריטי ההזמנה
          </h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #9333ea' }}>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>שם המוצר</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>כמות</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>ספק</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>מחיר ליחידה</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, index) => {
                const itemTotal = (item.price_per_unit || 0) * (item.quantity || 0);
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                      {item.product_name}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                      {item.chosen_supplier || '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                      ₪{(item.price_per_unit || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>
                      ₪{itemTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f0fdf4', fontWeight: 'bold', fontSize: '15px' }}>
                <td colSpan="4" style={{ padding: '12px', textAlign: 'left', border: '2px solid #16a34a' }}>
                  סה"כ להזמנה:
                </td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#16a34a', border: '2px solid #16a34a' }}>
                  ₪{totalAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Received Items Status */}
        {order.received_items && Object.keys(order.received_items).length > 0 && (
          <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '2px solid #f59e0b' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#92400e', fontWeight: 'bold' }}>
              סטטוס קבלת פריטים
            </h2>
            <div style={{ fontSize: '13px', color: '#78350f' }}>
              {Object.entries(order.received_items).map(([productName, received], index) => (
                <p key={index} style={{ margin: '5px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '50%', 
                    backgroundColor: received ? '#16a34a' : '#dc2626',
                    color: 'white',
                    textAlign: 'center',
                    lineHeight: '18px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {received ? '✓' : '✗'}
                  </span>
                  <strong>{productName}:</strong> {received ? 'התקבל' : 'לא התקבל'}
                </p>
              ))}
            </div>
            {order.received_by && (
              <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                אושר ע"י: {order.received_by} • {format(new Date(order.received_date), 'dd/MM/yyyy HH:mm', { locale: he })}
              </p>
            )}
          </div>
        )}

        {/* Summary Statistics */}
        <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '2px solid #16a34a' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#15803d', fontWeight: 'bold' }}>
            סיכום הזמנה
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סטטוס</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                {statusHe[order.status] || order.status}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>מספר פריטים</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>
                {order.items?.length || 0}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סכום כולל</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                ₪{totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '40px', 
          paddingTop: '20px', 
          paddingBottom: '0',
          borderTop: '2px solid #e5e7eb', 
          textAlign: 'center', 
          color: '#9ca3af', 
          fontSize: '12px',
          pageBreakAfter: 'avoid',
          pageBreakInside: 'avoid'
        }}>
          <p style={{ margin: '0', pageBreakAfter: 'avoid' }}>מערכת ניהול מרפאה LoVeT - הזמנה</p>
          <p style={{ margin: '5px 0 0 0', pageBreakAfter: 'avoid' }}>
            הופק בתאריך: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        </div>
      </div>
    </>
  );
}