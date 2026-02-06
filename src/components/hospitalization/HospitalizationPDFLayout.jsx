import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function HospitalizationPDFLayout({ hospitalization, treatmentExecutions = [], onDone }) {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `אשפוז ${hospitalization.animal_name} - LoVeT`;
    
    const timer = setTimeout(() => {
      window.print();
      if (onDone) onDone();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.title = originalTitle;
    };
  }, [onDone, hospitalization.animal_name]);

  // Process treatment instructions with execution data
  const treatmentDetails = (hospitalization.treatment_instructions || []).map(instruction => {
    const executions = treatmentExecutions
      .filter(exec => exec.instruction_id === instruction.id)
      .sort((a, b) => {
        const timeA = new Date(`${a.execution_date}T${a.execution_time}`);
        const timeB = new Date(`${b.execution_date}T${b.execution_time}`);
        return timeB - timeA; // Most recent first
      });
    
    return {
      ...instruction,
      executionCount: executions.length,
      executions: executions.map(exec => ({
        executedBy: exec.executed_by_name,
        executionDateTime: `${format(new Date(exec.execution_date), 'dd/MM/yyyy', { locale: he })} ${exec.execution_time}`
      }))
    };
  });

  const totalExecutions = treatmentDetails.reduce((sum, t) => sum + t.executionCount, 0);

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-hospitalization, #printable-hospitalization * {
            visibility: visible;
          }
          #printable-hospitalization {
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
          #printable-hospitalization {
            max-height: none !important;
            overflow: visible !important;
          }
          #printable-hospitalization > *:last-child {
            page-break-after: avoid !important;
            margin-bottom: 0 !important;
          }
        }
        @media screen {
          #printable-hospitalization {
            display: none;
          }
        }
      `}</style>

      <div id="printable-hospitalization" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
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
            דוח אשפוז
          </h1>
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#6b7280' }}>
            <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
              {hospitalization.animal_name}
            </p>
            <p style={{ margin: '5px 0' }}>
              בעלים: {hospitalization.owner_name}
            </p>
            <p style={{ margin: '5px 0' }}>
              תאריך אשפוז: {format(new Date(hospitalization.admission_date), 'dd/MM/yyyy', { locale: he })}
              {hospitalization.admission_time && ` בשעה ${hospitalization.admission_time}`}
            </p>
          </div>
        </div>

        {/* Animal Details */}
        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#7c3aed', fontWeight: 'bold' }}>
            פרטי החיה
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
            <div><strong>סוג:</strong> {hospitalization.animal_type || '-'}</div>
            <div><strong>גזע:</strong> {hospitalization.breed || '-'}</div>
            <div><strong>גיל:</strong> {hospitalization.age || '-'}</div>
            <div><strong>מין:</strong> {hospitalization.animal_sex || '-'}</div>
            <div><strong>משקל בקבלה:</strong> {hospitalization.admission_weight ? `${hospitalization.admission_weight} ק"ג` : '-'}</div>
            <div><strong>מעוקר/מסורס:</strong> {hospitalization.is_neutered ? 'כן' : 'לא'}</div>
            {hospitalization.has_catheter && (
              <>
                <div style={{ gridColumn: '1 / -1' }}><strong>קטטר וורידי:</strong> כן</div>
                {hospitalization.catheter_insertion_date && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>תאריך החדרת קטטר:</strong> {format(new Date(hospitalization.catheter_insertion_date), 'dd/MM/yyyy', { locale: he })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Diagnoses */}
        {hospitalization.diagnoses && (
          <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '2px solid #3b82f6' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#1e40af', fontWeight: 'bold' }}>
              אבחנות ובעיות רפואיות
            </h2>
            <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.6', color: '#1f2937', whiteSpace: 'pre-wrap' }}>
              {hospitalization.diagnoses}
            </p>
          </div>
        )}

        {/* Treatment Instructions */}
        {treatmentDetails.length > 0 && (
          <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
            <h2 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '18px', 
              color: '#7c3aed', 
              fontWeight: 'bold',
              borderBottom: '2px solid #7c3aed',
              paddingBottom: '8px'
            }}>
              הנחיות טיפול ומעקב ביצוע ({hospitalization.treatment_instructions.length})
            </h2>
            
            {treatmentDetails.map((treatment, index) => (
              <div key={index} style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                backgroundColor: '#faf5ff', 
                borderRadius: '8px',
                border: '2px solid #d8b4fe',
                pageBreakInside: 'avoid'
              }}>
                {/* Treatment Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#6b21a8', fontWeight: 'bold' }}>
                      {treatment.medication_name}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#581c87', lineHeight: '1.5' }}>
                      <p style={{ margin: '3px 0' }}><strong>מינון:</strong> {treatment.dosage}</p>
                      <p style={{ margin: '3px 0' }}><strong>תדירות:</strong> {treatment.frequency}</p>
                      <p style={{ margin: '3px 0' }}><strong>דרך מתן:</strong> {treatment.route}</p>
                      {treatment.notes && (
                        <p style={{ margin: '3px 0' }}><strong>הערות:</strong> {treatment.notes}</p>
                      )}
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                        נקבע ע"י: {treatment.prescribed_by} • {format(new Date(treatment.prescribed_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </p>
                    </div>
                  </div>
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#16a34a', 
                    color: 'white', 
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}>
                    ✓ {treatment.executionCount} ביצועים
                  </div>
                </div>

                {/* Executions */}
                {treatment.executions.length > 0 && (
                  <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #d8b4fe'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b21a8', fontWeight: 'bold' }}>
                      💉 רשומות ביצוע:
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {treatment.executions.map((exec, execIdx) => (
                        <div key={execIdx} style={{ 
                          padding: '6px 10px', 
                          backgroundColor: 'white', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#4b5563',
                          border: '1px solid #e9d5ff'
                        }}>
                          ✓ {exec.executionDateTime} • {exec.executedBy}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {treatment.executions.length === 0 && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px', 
                    backgroundColor: '#fef3c7', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#92400e',
                    textAlign: 'center'
                  }}>
                    ⚠️ טרם בוצע
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary Statistics */}
        <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '2px solid #16a34a' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#15803d', fontWeight: 'bold' }}>
            סיכום
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סטטוס אשפוז</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                {hospitalization.status === 'active' ? 'פעיל' : hospitalization.status === 'discharged' ? 'שוחרר' : 'נפטר'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>הנחיות טיפול</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>
                {treatmentDetails.length}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>סך טיפולים שבוצעו</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                {totalExecutions}
              </p>
            </div>
          </div>
        </div>

        {/* Discharge Instructions */}
        {hospitalization.status === 'discharged' && hospitalization.discharge_instructions && (
          <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '2px solid #f59e0b' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#92400e', fontWeight: 'bold' }}>
              הנחיות שחרור
            </h2>
            <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.6', color: '#1f2937', whiteSpace: 'pre-wrap' }}>
              {hospitalization.discharge_instructions}
            </p>
          </div>
        )}

        {/* Monitoring Logs Summary */}
        {hospitalization.monitoring_log && hospitalization.monitoring_log.length > 0 && (
          <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
            <h2 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '16px', 
              color: '#4b5563', 
              fontWeight: 'bold',
              borderBottom: '1px solid #d1d5db',
              paddingBottom: '6px'
            }}>
              רשומות ניטור ({hospitalization.monitoring_log.length})
            </h2>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              נוספו {hospitalization.monitoring_log.length} רשומות ניטור במהלך האשפוז
            </div>
          </div>
        )}

        {/* Fluids Log Summary */}
        {hospitalization.fluids_log && hospitalization.fluids_log.length > 0 && (
          <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
            <h2 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '16px', 
              color: '#4b5563', 
              fontWeight: 'bold',
              borderBottom: '1px solid #d1d5db',
              paddingBottom: '6px'
            }}>
              רשומות מתן נוזלים ({hospitalization.fluids_log.length})
            </h2>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              נוספו {hospitalization.fluids_log.length} רשומות מתן נוזלים במהלך האשפוז
            </div>
          </div>
        )}

        {/* Observations Log Summary */}
        {hospitalization.observations_log && hospitalization.observations_log.length > 0 && (
          <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
            <h2 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '16px', 
              color: '#4b5563', 
              fontWeight: 'bold',
              borderBottom: '1px solid #d1d5db',
              paddingBottom: '6px'
            }}>
              רשומות תצפית ({hospitalization.observations_log.length})
            </h2>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              נוספו {hospitalization.observations_log.length} רשומות תצפית במהלך האשפוז
            </div>
          </div>
        )}

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
          <p style={{ margin: '0', pageBreakAfter: 'avoid' }}>מערכת ניהול מרפאה LoVeT - דוח אשפוז</p>
          <p style={{ margin: '5px 0 0 0', pageBreakAfter: 'avoid' }}>
            הופק בתאריך: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        </div>
      </div>
    </>
  );
}