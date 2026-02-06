import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ProtocolPDFLayout({ protocol, template, onDone }) {
  useEffect(() => {
    const originalTitle = document.title;
    
    // Clean patient name from illegal file name characters
    const cleanFileName = (name) => {
      return name.replace(/[/\\:*?"<>|]/g, '-').trim();
    };
    
    const patientName = cleanFileName(protocol.patient_name || 'ללא-שם');
    document.title = `LoVeT - ${patientName}`;
    
    const timer = setTimeout(() => {
      window.print();
      if (onDone) onDone();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.title = originalTitle;
    };
  }, [onDone, protocol.patient_name]);

  // Group fields by sections (title fields)
  const sections = [];
  let currentSection = { title: "פרטי הפרוטוקול", fields: [] };
  
  if (template?.fields) {
    template.fields.forEach(field => {
      if (field.type === 'title' && !(field.name && field.name.endsWith('_warning'))) {
        if (currentSection.fields.length > 0 || currentSection.title !== "פרטי הפרוטוקול") {
          sections.push(currentSection);
        }
        currentSection = { title: field.label, fields: [] };
      } else if (field.type !== 'title' || (field.name && field.name.endsWith('_warning'))) {
        currentSection.fields.push(field);
      }
    });
    if (currentSection.fields.length > 0 || currentSection.title !== "פרטי הפרוטוקול") {
      sections.push(currentSection);
    }
  }

  const getFieldValue = (fieldName) => {
    const value = protocol.data?.[fieldName];
    if (value === undefined || value === null || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'כן' : 'לא';
    return value;
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-protocol, #printable-protocol * {
            visibility: visible;
          }
          #printable-protocol {
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
          #printable-protocol {
            max-height: none !important;
            overflow: visible !important;
          }
          #printable-protocol > *:last-child {
            page-break-after: avoid !important;
            margin-bottom: 0 !important;
          }
        }
        @media screen {
          #printable-protocol {
            display: none;
          }
        }
      `}</style>

      <div id="printable-protocol" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
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
            {protocol.template_name}
          </h1>
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#6b7280' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>שם המטופל:</strong> {protocol.patient_name}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>מולא על ידי:</strong> {protocol.filled_by_name}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>תאריך יצירה:</strong> {format(new Date(protocol.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
            </p>
          </div>
        </div>

        {/* Consent Section (if exists) */}
        {protocol.data?.consent_agreed && (
          <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #3b82f6', borderRadius: '8px', backgroundColor: '#eff6ff' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1e40af', fontWeight: 'bold' }}>
              הסכמה לפרוצדורה
            </h2>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {protocol.data?.client_consent_name && (
                <p style={{ margin: '5px 0' }}>
                  <strong>שם הלקוח:</strong> {protocol.data.client_consent_name}
                </p>
              )}
              {protocol.data?.fasting_8h && (
                <p style={{ margin: '5px 0' }}>✓ החיה הייתה בצום של 8 שעות (משקל 5 ק"ג או פחות)</p>
              )}
              {protocol.data?.fasting_12h && (
                <p style={{ margin: '5px 0' }}>✓ החיה הייתה בצום של 12 שעות (מעל 5 ק"ג)</p>
              )}
              <p style={{ margin: '10px 0 5px 0', fontWeight: 'bold', color: '#16a34a' }}>
                ✓ ההסכמה אושרה על ידי הלקוח
              </p>
              {protocol.data?.client_signature && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ margin: '5px 0', fontWeight: 'bold' }}>חתימת הלקוח:</p>
                  <img 
                    src={protocol.data.client_signature} 
                    alt="חתימת לקוח" 
                    style={{ maxWidth: '300px', height: 'auto', border: '1px solid #d1d5db', borderRadius: '4px', marginTop: '5px' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Association Name (if this is an association protocol) */}
        {protocol.template_name === 'פרוטוקול חדר ניתוח - עמותות' && protocol.data?.association_name && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '2px solid #f59e0b', textAlign: 'center' }}>
            <h2 style={{ margin: '0', fontSize: '18px', color: '#92400e', fontWeight: 'bold' }}>
              עמותה: {protocol.data.association_name}
            </h2>
          </div>
        )}

        {/* Procedures List (for association surgery protocol) */}
        {protocol.template_name === 'פרוטוקול חדר ניתוח - עמותות' && protocol.data?.procedures && protocol.data.procedures.length > 0 && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '18px', 
              color: '#7c3aed', 
              fontWeight: 'bold',
              borderBottom: '2px solid #7c3aed',
              paddingBottom: '8px'
            }}>
              פרוצדורות שבוצעו ({protocol.data.procedures.length})
            </h2>
            {protocol.data.procedures.map((procedure, index) => (
              <div key={index} style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                backgroundColor: index % 2 === 0 ? '#faf5ff' : '#f0fdf4', 
                borderRadius: '8px',
                border: `2px solid ${index % 2 === 0 ? '#d8b4fe' : '#bbf7d0'}`,
                pageBreakInside: 'avoid'
              }}>
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '16px', 
                  color: index % 2 === 0 ? '#6b21a8' : '#15803d', 
                  fontWeight: 'bold',
                  borderBottom: `1px solid ${index % 2 === 0 ? '#d8b4fe' : '#bbf7d0'}`,
                  paddingBottom: '6px'
                }}>
                  פרוצדורה #{index + 1} - {procedure.procedure_type || 'לא צוין'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong style={{ color: '#4b5563' }}>שם החיה:</strong> 
                    <span style={{ marginRight: '8px', color: '#1f2937' }}>{procedure.animal_name || '-'}</span>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong style={{ color: '#4b5563' }}>מין:</strong> 
                    <span style={{ marginRight: '8px', color: '#1f2937' }}>{procedure.gender || '-'}</span>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong style={{ color: '#4b5563' }}>מקום לכידה:</strong> 
                    <span style={{ marginRight: '8px', color: '#1f2937' }}>{procedure.capture_location || '-'}</span>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong style={{ color: '#4b5563' }}>סימון אוזן:</strong> 
                    <span style={{ marginRight: '8px', color: '#1f2937' }}>{procedure.ear_marking || '-'}</span>
                  </div>
                  {procedure.description && (
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', gridColumn: '1 / -1' }}>
                      <strong style={{ color: '#4b5563', display: 'block', marginBottom: '4px' }}>תיאור:</strong>
                      <span style={{ color: '#1f2937', whiteSpace: 'pre-wrap' }}>{procedure.description}</span>
                    </div>
                  )}
                  <div style={{ 
                    padding: '10px', 
                    backgroundColor: procedure.pain_relief_given ? '#dcfce7' : '#fee2e2', 
                    borderRadius: '4px', 
                    gridColumn: '1 / -1',
                    border: `1px solid ${procedure.pain_relief_given ? '#86efac' : '#fca5a5'}`
                  }}>
                    <strong style={{ color: procedure.pain_relief_given ? '#15803d' : '#991b1b' }}>
                      {procedure.pain_relief_given ? '✓ ניתן שיכוך כאבים' : '✗ לא ניתן שיכוך כאבים'}
                    </strong>
                    {procedure.pain_relief_given && procedure.pain_relief_details && (
                      <div style={{ marginTop: '6px', fontSize: '13px', color: '#166534' }}>
                        פרטי שיכוך: {procedure.pain_relief_details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Anesthesia Monitoring (if exists) */}
        {protocol.data?.anesthesia_monitoring && protocol.data.anesthesia_monitoring.length > 0 && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#16a34a', fontWeight: 'bold', borderBottom: '2px solid #16a34a', paddingBottom: '8px' }}>
              ניטור הרדמה
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #9333ea' }}>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>תאריך</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>שעה</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>דופק</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>נשימות</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>לחץ דם</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>ISO</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>הערות</th>
                </tr>
              </thead>
              <tbody>
                {protocol.data.anesthesia_monitoring.map((record, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                      {record.date ? new Date(record.date).toLocaleDateString('he-IL') : '-'}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>{record.time || '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>{record.pulse || '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>{record.respirations || '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>{record.blood_pressure || '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>{record.iso || '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #e5e7eb' }}>{record.procedure_notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Protocol Sections */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
            <h2 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '18px', 
              color: '#7c3aed', 
              fontWeight: 'bold',
              borderBottom: '2px solid #7c3aed',
              paddingBottom: '8px'
            }}>
              {section.title}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px' }}>
              {section.fields.map((field, fieldIndex) => {
                // Skip warning fields
                if (field.type === 'title' && field.name?.endsWith('_warning')) {
                  return null;
                }
                
                const value = getFieldValue(field.name);
                
                return (
                  <div key={fieldIndex} style={{ 
                    gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto',
                    padding: '10px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#4b5563', marginBottom: '5px' }}>
                      {field.label}
                    </div>
                    <div style={{ color: '#1f2937', whiteSpace: field.type === 'textarea' ? 'pre-wrap' : 'normal' }}>
                      {value}
                    </div>
                    {protocol.field_metadata?.[field.name]?.filled_by_name && (
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px' }}>
                        נמלא ע"י: {protocol.field_metadata[field.name].filled_by_name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

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
          <p style={{ margin: '0', pageBreakAfter: 'avoid' }}>מערכת ניהול מרפאה LoVeT - פרוטוקול נוצר אוטומטית</p>
          <p style={{ margin: '5px 0 0 0', pageBreakAfter: 'avoid' }}>
            הופק בתאריך: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        </div>
      </div>
    </>
  );
}