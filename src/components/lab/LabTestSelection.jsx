import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LabTestSelection({ onSelectFromPriceList, onCreateNew, onCancel }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: priceListTests = [], isLoading } = useQuery({
    queryKey: ['labPriceList'],
    queryFn: async () => {
      const allItems = await base44.entities.ClientPriceList.list();
      return allItems.filter(item => item.category === 'בדיקות מעבדה' || item.category === 'בדיקות' || item.category === 'ניתוחים');
    }
  });

  const filteredTests = priceListTests.filter(test =>
    test.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (test.notes && test.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectTest = (test) => {
    onSelectFromPriceList({
      test_name: test.product_name,
      test_type_name: test.product_name,
      notes: test.notes || ''
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-3">
        <Button 
          onClick={onCreateNew}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-20"
        >
          <Plus className="w-6 h-6 ml-2" />
          <div className="text-right">
            <div className="font-bold text-base">בדיקה חדשה</div>
            <div className="text-xs opacity-90">צור בדיקה מותאמת אישית</div>
          </div>
        </Button>

        <div className="flex-1 p-4 border-2 border-purple-200 rounded-lg bg-purple-50/30">
          <div className="flex items-center gap-2 text-purple-700 mb-1">
            <FlaskConical className="w-5 h-5" />
            <span className="font-bold">מחירון לקוחות</span>
          </div>
          <p className="text-xs text-purple-600">בחר מתוך הבדיקות הקיימות</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="mb-4">
          <Label htmlFor="search">חיפוש בדיקה</Label>
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              id="search"
              type="text"
              placeholder="חפש בדיקה לפי שם..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">טוען בדיקות...</div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'לא נמצאו בדיקות התואמות לחיפוש' : 'אין בדיקות במחירון'}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTests.map(test => (
              <Card 
                key={test.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-purple-300"
                onClick={() => handleSelectTest(test)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-base">{test.product_name}</h4>
                        {test.item_type && (
                          <Badge variant="outline" className="text-xs">
                            {test.item_type}
                          </Badge>
                        )}
                      </div>
                      {test.notes && (
                        <p className="text-xs text-gray-600">{test.notes}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-semibold text-green-700">
                          ₪{test.client_price.toFixed(2)}
                        </span>
                        {test.supplier_name && (
                          <span className="text-xs text-gray-500">
                            ספק: {test.supplier_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      בחר
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </div>
  );
}