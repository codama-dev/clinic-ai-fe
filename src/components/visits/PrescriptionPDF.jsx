import React from "react";

export default function PrescriptionPDF({ prescription, patient, doctor, client }) {
  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>מרשם רפואי</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      direction: rtl;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      width: 120px;
      height: auto;
      margin-bottom: 10px;
    }
    .clinic-name {
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
      margin: 10px 0;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .section-title {
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    .prescription-box {
      border: 2px solid #6366f1;
      padding: 20px;
      margin: 20px 0;
      background: white;
      border-radius: 8px;
    }
    .rx-symbol {
      font-size: 32px;
      font-weight: bold;
      color: #6366f1;
      margin-bottom: 15px;
    }
    .medication {
      font-size: 18px;
      font-weight: bold;
      margin: 10px 0;
    }
    .instructions {
      margin: 10px 0;
      line-height: 1.6;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .signature {
      margin-top: 40px;
      text-align: left;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 200px;
      margin-top: 50px;
      display: inline-block;
    }
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/7c4ff2a29_-.png" alt="לוגו" class="logo">
    <div class="clinic-name">מרפאה וטרינרית LoVeT</div>
    <div>טל: 052-1234567 | דוא"ל: info@lovet.co.il</div>
  </div>

  <div class="section">
    <div class="section-title">פרטי רופא</div>
    <div class="info-row">
      <span>שם הרופא: ${doctor?.display_name || ''}</span>
      <span>מס' רישיון: ${doctor?.license_number || 'לא צוין'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">פרטי בעל החיה</div>
    <div class="info-row">
      <span>שם: ${client?.full_name || ''}</span>
      <span>טלפון: ${client?.phone || 'לא צוין'}</span>
    </div>
    ${client?.address ? `<div class="info-row"><span>כתובת: ${client.address}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">פרטי המטופל</div>
    <div class="info-row">
      <span>שם החיה: ${patient?.name || ''}</span>
      <span>סוג: ${patient?.species || ''}</span>
    </div>
    ${patient?.breed ? `<div class="info-row"><span>גזע: ${patient.breed}</span></div>` : ''}
  </div>

  <div class="prescription-box">
    <div class="rx-symbol">℞</div>
    <div class="medication">${prescription.medication_name}</div>
    
    <div class="instructions">
      <strong>מינון:</strong> ${prescription.dosage}<br>
      <strong>צורת מתן:</strong> ${prescription.administration_method}<br>
      <strong>תדירות:</strong> ${prescription.frequency}<br>
      <strong>משך הטיפול:</strong> ${prescription.duration}<br>
      ${prescription.instructions ? `<br><strong>הנחיות נוספות:</strong><br>${prescription.instructions}` : ''}
    </div>
  </div>

  <div class="signature">
    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    <div class="signature-line"></div>
    <p>חתימת הרופא</p>
  </div>

  <div class="footer">
    מרשם זה תקף ל-30 יום מיום הנפקתו | יש להציג את המרשם בבית המרקחת
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  return htmlContent;
}