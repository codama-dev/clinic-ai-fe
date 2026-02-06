import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle } from "lucide-react";

export default function DataMigration({ onComplete }) {
  const [status, setStatus] = useState('running');
  const [progress, setProgress] = useState({ client: 0, supplier: 0 });

  useEffect(() => {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const migrate = async () => {
      try {
        // Migrate ClientPriceList
        const clientPrices = await base44.entities.ClientPriceList.list('-created_date', 1000);
        let clientCount = 0;
        for (const item of clientPrices) {
          if (item.item_type && !item.sub_category) {
            await base44.entities.ClientPriceList.update(item.id, {
              sub_category: item.item_type
            });
            clientCount++;
            setProgress(prev => ({ ...prev, client: clientCount }));
            await delay(150); // Wait 150ms between updates
          }
        }

        // Migrate SupplierPrice
        const supplierPrices = await base44.entities.SupplierPrice.list('-created_date', 1000);
        let supplierCount = 0;
        for (const item of supplierPrices) {
          if (item.item_type && !item.sub_category) {
            await base44.entities.SupplierPrice.update(item.id, {
              sub_category: item.item_type
            });
            supplierCount++;
            setProgress(prev => ({ ...prev, supplier: supplierCount }));
            await delay(150); // Wait 150ms between updates
          }
        }

        setStatus('completed');
        if (onComplete) onComplete();
      } catch (error) {
        console.error('Migration error:', error);
        setStatus('error');
      }
    };

    migrate();
  }, []);

  if (status === 'running') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm text-gray-600">מעדכן נתונים...</p>
        <p className="text-xs text-gray-500">
          {progress.client} מחירון לקוחות • {progress.supplier} מחירון ספקים
        </p>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <CheckCircle className="w-8 h-8 text-green-600" />
        <p className="text-sm font-medium text-green-800">המיגרציה הושלמה!</p>
        <p className="text-xs text-gray-600">
          {progress.client} פריטים עודכנו במחירון לקוחות, {progress.supplier} במחירון ספקים
        </p>
      </div>
    );
  }

  return (
    <div className="text-center p-6 text-red-600">
      שגיאה במיגרציה - בדוק את הקונסול
    </div>
  );
}