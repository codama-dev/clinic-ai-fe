import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, DollarSign, Edit, Plus, Save, Search, Trash2, X, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DataMigration from "../components/utils/DataMigration";

export default function ClientPriceListPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ 
    product_name: "", 
    category: "",
    sub_category: "",
    client_price: 0, 
    supplier_price: 0,
    supplier_name: "",
    notes: "" 
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [missingItems, setMissingItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showMigration, setShowMigration] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // פונקציה לנירמול שמות מוצרים להשוואה מדויקת
  const normalizeProductName = (name) => {
    if (!name) return '';
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/["'״׳]/g, '')
      .toLowerCase();
  };

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: clientPrices = [], isLoading: loadingClientPrices } = useQuery({
    queryKey: ['clientPrices'],
    queryFn: () => base44.entities.ClientPriceList.list('-created_date', 200),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  const { data: supplierPrices = [], isLoading: loadingSupplierPrices } = useQuery({
    queryKey: ['supplierPrices'],
    queryFn: () => base44.entities.SupplierPrice.list('-created_date', 200),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  // Migration removed - no longer needed

  // Auto-sync disabled - now using manual sync with dialog

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientPriceList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientPrices']);
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData({ product_name: "", category: "", sub_category: "", client_price: 0, supplier_price: 0, supplier_name: "", notes: "" });
      toast.success('המחיר ללקוח נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientPriceList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientPrices']);
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData({ product_name: "", category: "", sub_category: "", client_price: 0, supplier_price: 0, supplier_name: "", notes: "" });
      toast.success('המחיר עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientPriceList.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientPrices']);
      toast.success('הפריט נמחק מהמחירון');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      product_name: item.product_name,
      category: item.category || "",
      sub_category: item.sub_category || "",
      client_price: item.client_price,
      supplier_price: item.supplier_price || 0,
      supplier_name: item.supplier_name || "",
      notes: item.notes || ""
    });
    setIsFormOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`האם למחוק את "${item.product_name}" מהמחירון?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ product_name: "", category: "", sub_category: "", client_price: 0, supplier_price: 0, supplier_name: "", notes: "" });
    setIsFormOpen(true);
  };

  const handleOpenSyncDialog = () => {
    // Find matching products in supplier prices
    const itemsToUpdate = [];
    
    for (const clientItem of clientPrices) {
      const normalizedClientName = normalizeProductName(clientItem.product_name);
      
      // Find matching supplier item
      const supplierItem = supplierPrices.find(sp => 
        normalizeProductName(sp.product_name) === normalizedClientName
      );
      
      if (supplierItem) {
        // Get supplier name and price (use the first available supplier)
        let newSupplierName = '';
        let newSupplierPrice = 0;
        if (supplierItem.supplier_prices && Object.keys(supplierItem.supplier_prices).length > 0) {
          const suppliers = Object.entries(supplierItem.supplier_prices).filter(([_, price]) => price != null);
          if (suppliers.length > 0) {
            // Find the supplier with the lowest price
            const [supplierName, price] = suppliers.reduce((min, curr) => 
              curr[1] < min[1] ? curr : min
            );
            newSupplierName = supplierName;
            newSupplierPrice = price;
          }
        }
        
        // Prepare updated values - only update if supplier has a non-empty value OR if it's a legitimate change
        const updatedProductName = supplierItem.product_name || clientItem.product_name;
        const updatedCategory = supplierItem.category || clientItem.category;
        const updatedSubCategory = supplierItem.sub_category || clientItem.sub_category;
        
        // Check if any field needs updating
        const needsUpdate = 
          clientItem.product_name !== updatedProductName ||
          clientItem.category !== updatedCategory ||
          clientItem.sub_category !== updatedSubCategory ||
          clientItem.supplier_name !== newSupplierName ||
          clientItem.supplier_price !== newSupplierPrice;
        
        if (needsUpdate) {
          itemsToUpdate.push({
            id: clientItem.id,
            product_name: updatedProductName,
            category: updatedCategory,
            sub_category: updatedSubCategory,
            supplier_name: newSupplierName,
            supplier_price: newSupplierPrice,
            oldProductName: clientItem.product_name,
            oldCategory: clientItem.category,
            oldSubCategory: clientItem.sub_category,
            oldSupplierName: clientItem.supplier_name,
            oldSupplierPrice: clientItem.supplier_price
          });
        }
      }
    }
    
    if (itemsToUpdate.length === 0) {
      toast.info('כל הפריטים מעודכנים');
      return;
    }
    
    setMissingItems(itemsToUpdate);
    setSelectedItems(itemsToUpdate.map((_, idx) => idx));
    setShowSyncDialog(true);
  };

  const handleSyncSelected = async () => {
    if (selectedItems.length === 0) {
      toast.error('לא נבחרו פריטים לעדכון');
      return;
    }

    setIsSyncing(true);
    const itemsToUpdate = selectedItems.map(idx => missingItems[idx]);
    setSyncProgress({ current: 0, total: itemsToUpdate.length });
    let success = false;
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // Process items one by one with delay to avoid rate limits
      for (let i = 0; i < itemsToUpdate.length; i++) {
        const item = itemsToUpdate[i];
        setSyncProgress({ current: i + 1, total: itemsToUpdate.length });
        
        try {
          await base44.entities.ClientPriceList.update(item.id, {
            product_name: item.product_name,
            category: item.category,
            sub_category: item.sub_category,
            supplier_name: item.supplier_name,
            supplier_price: item.supplier_price
          });
          
          successCount++;
          
          // Wait 400ms between each update to avoid rate limits
          if (i < itemsToUpdate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        } catch (error) {
          console.error(`Error updating item ${item.id}:`, error);
          failCount++;
          
          // If too many consecutive failures, stop the process
          if (failCount > 5) {
            throw new Error(`יותר מדי שגיאות - העדכון הופסק. ${successCount} פריטים עודכנו בהצלחה, ${failCount} נכשלו.`);
          }
          
          // Wait longer after an error
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      await queryClient.invalidateQueries(['clientPrices']);
      
      if (failCount === 0) {
        toast.success(`כל ${successCount} הפריטים עודכנו בהצלחה!`);
      } else {
        toast.warning(`${successCount} פריטים עודכנו בהצלחה, ${failCount} נכשלו`);
      }
      
      success = true;
    } catch (error) {
      console.error('Sync error:', error);
      const errorMsg = error?.message || error?.toString() || 'שגיאה לא ידועה';
      toast.error(`שגיאה בעדכון: ${errorMsg}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
      if (success) {
        setShowSyncDialog(false);
        setSelectedItems([]);
        setMissingItems([]);
      }
    }
  };

  const toggleItemSelection = (index) => {
    if (selectedItems.includes(index)) {
      setSelectedItems(selectedItems.filter(i => i !== index));
    } else {
      setSelectedItems([...selectedItems, index]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === missingItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(missingItems.map((_, idx) => idx));
    }
  };

  const availableProducts = supplierPrices.map(sp => ({
    name: sp.product_name,
    category: sp.category,
    sub_category: sp.sub_category,
    supplier_prices: sp.supplier_prices
  }));

  const uniqueProducts = Array.from(
    new Map(availableProducts.map(p => [p.name, p])).values()
  );

  const filteredPrices = clientPrices.filter(price => {
    const matchesSearch = price.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || price.category === filterCategory || price.sub_category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Group prices by category and sub-category
  const groupedPrices = filteredPrices.reduce((acc, price) => {
    const category = price.category || 'ללא קטגוריה';
    const subCategory = price.sub_category || 'ללא תת קטגוריה';
    
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][subCategory]) {
      acc[category][subCategory] = [];
    }
    acc[category][subCategory].push(price);
    
    return acc;
  }, {});

  const categories = {
    "תרופות": ["אנטיביוטיקה", "סטרואידים ואנטיהיסטמינים", "שיכוך כאבים והרגעה", "תרופות בהזרקה", "שתן", "גאסטרו", "אוזניים", "עיניים", "עור", "תרופות שונות"],
    "בדיקות": ["בדיקות מעבדה", "בדיקות רופא", "בדיקות מומחה"],
    "תכשירים": ["טיפול מונע", "שמפו", "משחת שיניים", "תרחיץ", "אחר"],
    "ציוד": ["ציוד רפואי", "ציוד משרדי", "ציוד ניקיון"],
    "צעצועים": ["לעיסה", "משחק", "אחר"],
    "מזון": ["חטיפים", "מזון רגיל", "מזון רפואי"],
    "כירורגיה": ["אורתופדיה", "עיניים", "אוזניים", "שיניים", "עור", "אורולוגיה", "חבישות", "אחר"]
  };
  
  const allCategories = Object.keys(categories);
  const allSubCategories = Object.values(categories).flat();

  const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_orders');

  if (!currentUser) {
    return <div className="text-center py-12">טוען...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">אין הרשאת גישה</h2>
            <p className="text-gray-600">אין לך הרשאה לנהל מחירון לקוחות.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loadingClientPrices || loadingSupplierPrices;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              מחירון לקוחות
            </h1>
            <p className="text-gray-500 mt-1">ניהול מחירים ללקוחות על בסיס מחירון הספקים</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate(createPageUrl("SupplierPriceListPage"))}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            מחירון ספקים
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">חיפוש מוצר</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="חפש לפי שם מוצר..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="w-56">
              <Label htmlFor="filterCategory">סינון לפי קטגוריה</Label>
              <select
                id="filterCategory"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="all">כל הקטגוריות</option>
                {allCategories.map(cat => (
                  <optgroup key={cat} label={cat}>
                    {categories[cat].map(subCat => (
                      <option key={subCat} value={subCat}>{subCat}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleOpenSyncDialog} disabled={isLoading} variant="outline">
                <RefreshCw className="w-4 h-4 ml-2" />
                עדכן מספקים
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף פריט
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מחירון ({filteredPrices.length} פריטים)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">טוען נתונים...</p>
          ) : filteredPrices.length === 0 ? (
            <p className="text-center py-8 text-gray-500">אין פריטים במחירון</p>
          ) : (
            <div className="overflow-x-auto">
              {Object.entries(groupedPrices).map(([category, subCategories]) => (
                <div key={category} className="mb-6">
                  {/* Category Header */}
                  <div className="sticky top-0 bg-purple-600 text-white px-4 py-3 font-bold text-lg rounded-t-lg z-10">
                    {category}
                  </div>
                  
                  {/* Sub-categories */}
                  {Object.entries(subCategories).map(([subCategory, prices]) => (
                    <div key={subCategory} className="border-x border-b">
                      {/* Sub-category Header */}
                      <div className="bg-purple-100 px-6 py-2 font-semibold text-purple-900 border-b">
                        {subCategory}
                      </div>
                      
                      {/* Products Table */}
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="w-16 text-right">#</TableHead>
                            <TableHead className="text-right">שם המוצר</TableHead>
                            <TableHead className="text-right w-32">ספק</TableHead>
                            <TableHead className="text-right w-28">מחיר ספק</TableHead>
                            <TableHead className="text-right w-28">מחיר ללקוח</TableHead>
                            <TableHead className="text-right w-24">פעולות</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {prices.map((price, index) => {
                            const supplierItem = supplierPrices.find(sp => sp.product_name === price.product_name);
                            const supplierPriceValue = supplierItem?.supplier_prices 
                              ? Object.values(supplierItem.supplier_prices).find(p => p !== null)
                              : null;
                            
                            return (
                              <TableRow key={price.id}>
                                <TableCell className="text-gray-500 text-right align-top">{index + 1}</TableCell>
                                <TableCell className="font-medium text-right align-top break-words">{price.product_name}</TableCell>
                                <TableCell className="text-right text-sm text-gray-600 align-top break-words">
                                  {price.supplier_name || '-'}
                                </TableCell>
                                <TableCell className="font-semibold text-blue-700 text-right align-top whitespace-nowrap">
                                  {price.supplier_price ? `₪${price.supplier_price.toFixed(2)}` : (supplierPriceValue ? `₪${supplierPriceValue.toFixed(2)}` : '-')}
                                </TableCell>
                                <TableCell className="font-semibold text-green-700 text-right align-top whitespace-nowrap">₪{price.client_price.toFixed(2)}</TableCell>
                                <TableCell className="align-top">
                                  <div className="flex items-start justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(price)}>
                                      <Edit className="w-4 h-4 text-gray-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(price)}>
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>עדכון פריטים ממחירון ספקים</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                נמצאו {missingItems.length} פריטים שניתן לעדכן ממחירון הספקים. בחר אילו פריטים לעדכן:
              </p>
            </div>

            <div className="mb-3 flex items-center gap-2 p-2 bg-gray-50 rounded">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedItems.length === missingItems.length}
                onChange={toggleSelectAll}
                className="w-4 h-4"
              />
              <Label htmlFor="select-all" className="cursor-pointer font-semibold">
                בחר הכל ({selectedItems.length}/{missingItems.length})
              </Label>
            </div>

            <div className="space-y-2">
              {missingItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    id={`item-${index}`}
                    checked={selectedItems.includes(index)}
                    onChange={() => toggleItemSelection(index)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`item-${index}`} className="cursor-pointer flex-1">
                    <div className="space-y-2">
                      <div className="font-medium">
                        {item.oldProductName !== item.product_name ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 line-through">{item.oldProductName}</span>
                            <span className="text-green-600">→</span>
                            <span className="text-green-700">{item.product_name}</span>
                          </div>
                        ) : (
                          item.product_name
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">קטגוריה נוכחית: </span>
                          <Badge variant="outline">{item.oldCategory || 'ללא'}</Badge>
                        </div>
                        <div>
                          <span className="text-green-600">→ חדשה: </span>
                          <Badge variant="outline" className="border-green-500 text-green-700">{item.category || 'ללא'}</Badge>
                        </div>
                        <div>
                          <span className="text-gray-500">תת קטגוריה נוכחית: </span>
                          <Badge variant="secondary">{item.oldSubCategory || 'ללא'}</Badge>
                        </div>
                        <div>
                          <span className="text-green-600">→ חדשה: </span>
                          <Badge variant="secondary" className="border-green-500 text-green-700">{item.sub_category || 'ללא'}</Badge>
                        </div>
                        <div>
                          <span className="text-gray-500">ספק נוכחי: </span>
                          <span className="text-sm font-medium">{item.oldSupplierName || 'ללא'}</span>
                        </div>
                        <div>
                          <span className="text-green-600">→ חדש: </span>
                          <span className="text-sm font-semibold text-green-700">{item.supplier_name || 'ללא'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">מחיר ספק נוכחי: </span>
                          <span className="text-sm font-medium">₪{item.oldSupplierPrice?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div>
                          <span className="text-green-600">→ חדש: </span>
                          <span className="text-sm font-semibold text-green-700">₪{item.supplier_price?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t">
            {isSyncing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    מעדכן פריט {syncProgress.current} מתוך {syncProgress.total}
                  </span>
                  <span className="text-sm text-blue-700">
                    {Math.round((syncProgress.current / syncProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSyncDialog(false)} disabled={isSyncing}>
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button onClick={handleSyncSelected} disabled={isSyncing || selectedItems.length === 0}>
                <Save className="w-4 h-4 ml-2" />
                {isSyncing ? `מעדכן (${syncProgress.current}/${syncProgress.total})` : `עדכן ${selectedItems.length} פריטים`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'עריכת מחיר' : 'הוספת מחיר חדש'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="product_name">שם המוצר *</Label>
              <Input
                id="product_name"
                list="products-list"
                value={formData.product_name}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, product_name: value });
                  
                  // Auto-fill from supplier if exists
                  const supplierProduct = availableProducts.find(p => p.name === value);
                  if (supplierProduct) {
                    const minPrice = supplierProduct.supplier_prices 
                      ? Math.min(...Object.values(supplierProduct.supplier_prices).filter(p => p != null))
                      : null;
                    setFormData({
                      ...formData,
                      product_name: value,
                      category: supplierProduct.category || '',
                      sub_category: supplierProduct.sub_category || '',
                      supplier_price: minPrice || 0
                    });
                  }
                }}
                placeholder="הזן שם מוצר או בחר מהרשימה"
                required
              />
              <datalist id="products-list">
                {uniqueProducts.map((product, idx) => (
                  <option key={idx} value={product.name} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">קטגוריה ראשית *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value, sub_category: "" })}
                  className="w-full border rounded-md px-3 py-2"
                  required
                >
                  <option value="">בחר קטגוריה</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="sub_category">תת קטגוריה *</Label>
                <select
                  id="sub_category"
                  value={formData.sub_category}
                  onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={!formData.category}
                  required
                >
                  <option value="">בחר תת קטגוריה</option>
                  {formData.category && categories[formData.category]?.map(subCat => (
                    <option key={subCat} value={subCat}>{subCat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_name">ספק</Label>
                <Input
                  id="supplier_name"
                  list="suppliers-list"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="בחר ספק או הזן שם חדש"
                />
                <datalist id="suppliers-list">
                  {Array.from(new Set(
                    supplierPrices.flatMap(sp => 
                      sp.supplier_prices ? Object.keys(sp.supplier_prices) : []
                    )
                  )).sort().map(supplier => (
                    <option key={supplier} value={supplier} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="supplier_price">מחיר ספק (₪)</Label>
                <Input
                  id="supplier_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.supplier_price}
                  onChange={(e) => setFormData({ ...formData, supplier_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client_price">מחיר ללקוח (₪) *</Label>
              <Input
                id="client_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.client_price}
                onChange={(e) => setFormData({ ...formData, client_price: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">הערות</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות נוספות"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 ml-2" />
                שמור
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}