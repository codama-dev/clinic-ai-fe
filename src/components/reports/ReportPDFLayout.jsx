import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ReportPDFLayout({ reportType, reportData, startDate, endDate, onDone }) {
  useEffect(() => {
    const originalTitle = document.title;
    const reportTitles = {
      employees: 'דוח עובדים',
      protocols: 'דוח פרוטוקולים',
      hospitalization: 'דוח אשפוזים',
      inventory: 'דוח מלאי',
      orders: 'דוח הזמנות'
    };
    document.title = `${reportTitles[reportType] || 'דוח'} - LoVeT`;
    
    const timer = setTimeout(() => {
      window.print();
      if (onDone) onDone();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.title = originalTitle;
    };
  }, [onDone, reportType]);

  const reportTitles = {
    employees: 'דוח עובדים',
    protocols: 'דוח פרוטוקולי חדר ניתוח',
    hospitalization: 'דוח אשפוזים',
    inventory: 'דוח מלאי',
    orders: 'דוח הזמנות'
  };

  const title = reportTitles[reportType] || 'דוח';

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
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
          #printable-report {
            max-height: none !important;
            overflow: visible !important;
          }
          #printable-report > *:last-child {
            page-break-after: avoid !important;
            margin-bottom: 0 !important;
          }
        }
        @media screen {
          #printable-report {
            display: none;
          }
        }
      `}</style>

      <div id="printable-report" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
        {/* Header with Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #9333ea', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/7c4ff2a29_-.png"
              alt="LoVeT לוגו"
              style={{ height: '80px' }}
            />
          </div>
          <h1 style={{ margin: '0', fontSize: '28px', color: '#1f2937' }}>{title}</h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '16px', color: '#6b7280' }}>
            תקופה: {format(new Date(startDate), 'dd/MM/yyyy', { locale: he })} - {format(new Date(endDate), 'dd/MM/yyyy', { locale: he })}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#9ca3af' }}>
            תאריך הפקה: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        </div>

        {/* Employee Report */}
        {reportType === 'employees' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #9333ea' }}>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>שם העובד</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>תפקיד</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>סך משמרות</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>כוננות סופ"ש</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>ימי חופשה</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((emp, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{emp.name}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{emp.job}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#9333ea' }}>{emp.totalShifts}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#ea580c' }}>{emp.weekendShifts}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>{emp.vacationDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Protocols Report */}
        {reportType === 'protocols' && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #9333ea' }}>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>תאריך ושעה</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>תבנית</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>שם מטופל</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>נרשם על ידי</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>הסכמה</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>חתימה</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((protocol, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{protocol.date}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>{protocol.templateName}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{protocol.patientName}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{protocol.filledBy}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: protocol.consentAgreed ? '#16a34a' : '#9ca3af' }}>
                      {protocol.consentAgreed ? '✓ אושרה' : 'לא אושרה'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: protocol.clientSignature ? '#2563eb' : '#9ca3af' }}>
                      {protocol.clientSignature ? '✓ נחתם' : 'אין חתימה'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937' }}>סיכום</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סך פרוטוקולים</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#9333ea' }}>{reportData.length}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>הסכמות אושרו</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                    {reportData.filter(p => p.consentAgreed).length}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>עם חתימה</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                    {reportData.filter(p => p.clientSignature).length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Hospitalization Report */}
        {reportType === 'hospitalization' && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #9333ea' }}>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>תאריך אשפוז</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>שם החיה</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>בעלים</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>סוג</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>משקל</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>סטטוס</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>הנחיות טיפול</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((hosp, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{hosp.admissionDate}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>{hosp.animalName}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{hosp.ownerName}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{hosp.animalType}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{hosp.admissionWeight}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{hosp.status}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#9333ea' }}>{hosp.treatmentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937' }}>סיכום</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סך אשפוזים</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#9333ea' }}>{reportData.length}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>פעילים</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                    {reportData.filter(h => h.status === 'פעיל').length}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>שוחררו</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                    {reportData.filter(h => h.status === 'שוחרר').length}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סך הנחיות טיפול</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#6366f1' }}>
                    {reportData.reduce((sum, h) => sum + h.treatmentCount, 0)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Inventory Report */}
        {reportType === 'inventory' && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #9333ea' }}>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>תאריך דיווח</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>שם פריט</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>קטגוריה</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>כמות</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>סטטוס</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>דווח על ידי</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{item.reportDate}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>{item.itemName}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{item.category}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{item.quantityNeeded}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{item.status}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{item.requestedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937' }}>סיכום</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סך דיווחים</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#9333ea' }}>{reportData.length}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>נדרש</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#ea580c' }}>
                    {reportData.filter(i => i.status === 'נדרש').length}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>הוזמן/במלאי</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                    {reportData.filter(i => i.status === 'הוזמן' || i.status === 'במלאי').length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Orders Report */}
        {reportType === 'orders' && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #9333ea' }}>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>מספר הזמנה</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>תאריך</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>סכום (₪)</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>סטטוס</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>מספר פריטים</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((order, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>{order.orderNumber}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{order.date}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>₪{order.amount}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{order.status}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{order.itemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f2937' }}>סיכום</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סך הזמנות</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#9333ea' }}>{reportData.length}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סכום כולל</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                    ₪{reportData.reduce((sum, order) => sum + parseFloat(order.amount), 0).toFixed(2)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סך פריטים</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                    {reportData.reduce((sum, order) => sum + order.itemCount, 0)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>הזמנות שהושלמו</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#6366f1' }}>
                    {reportData.filter(o => o.status === 'הושלמה').length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: '40px', paddingTop: '20px', paddingBottom: '0', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '12px', pageBreakAfter: 'avoid', pageBreakInside: 'avoid' }}>
          <p style={{ margin: '0', pageBreakAfter: 'avoid' }}>מערכת ניהול מרפאה LoVeT - דוח נוצר אוטומטית</p>
        </div>
      </div>
    </>
  );
}