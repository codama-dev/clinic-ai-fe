import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Search, Plus, Edit, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustomPriceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');

  // Get price list ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const priceListId = urlParams.get('id');

  // Fetch price list details
  const { data: priceList } = useQuery({
    queryKey: ['priceList', priceListId],
    queryFn: async () => {
      const lists = await base44.entities.PriceList.list();
      return lists.find(l => l.id === priceListId);
    },
    enabled: !!priceListId,
  });

  // Fetch price list items
  const { data: priceListItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['priceListItems', priceListId],
    queryFn: () => base44.entities.PriceListItem.filter({ price_list_id: priceListId }),
    enabled: !!priceListId,
  });

  // Fetch supplier prices for import
  const { data: supplierPrices = [] } = useQuery({
    queryKey: ['supplierPrices'],
    queryFn: () => base44.entities.SupplierPrice.list(),
    enabled: showImportDialog,
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (items) => {
      await base44.entities.PriceListItem.bulkCreate(items);
    },
    onSuccess: () => {
      toast.success("המוצרים יובאו בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ['priceListItems', priceListId] });
      setShowImportDialog(false);
      setSelectedProducts({});
    },
    onError: () => {
      toast.error("שגיאה בייבוא המוצרים");
    }
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PriceListItem.update(id, data),
    onSuccess: () => {
      toast.success("המוצר עודכן בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ['priceListItems', priceListId] });
      setEditingItem(null);
      setEditedData({});
    },
    onError: () => {
      toast.error("שגיאה בעדכון המוצר");
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.PriceListItem.delete(id),
    onSuccess: () => {
      toast.success("המוצר נמחק בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ['priceListItems', priceListId] });
      setItemToDelete(null);
    },
    onError: () => {
      toast.error("שגיאה במחיקת המוצר");
    }
  });

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditedData({
      sale_price: item.sale_price || '',
      notes: item.notes || ''
    });
  };

  const handleSaveEdit = () => {
    if (!editedData.sale_price || isNaN(parseFloat(editedData.sale_price))) {
      toast.error("יש למלא מחיר מכירה תקין");
      return;
    }
    updateItemMutation.mutate({
      id: editingItem,
      data: {
        sale_price: parseFloat(editedData.sale_price),
        notes: editedData.notes
      }
    });
  };

  const handleImportProducts = () => {
    const selected = Object.entries(selectedProducts)
      .filter(([_, data]) => data.selected)
      .map(([key, data]) => {
        const [productName, supplierName] = key.split('|||');
        const supplierProduct = supplierPrices.find(
          p => p.product_name === productName && p.supplier_prices?.[supplierName] != null
        );
        
        return {
          price_list_id: priceListId,
          price_list_name: priceList?.name || '',
          product_name: productName,
          category: supplierProduct?.category || '',
          sub_category: supplierProduct?.sub_category || '',
          supplier_name: supplierName,
          supplier_price: supplierProduct?.supplier_prices?.[supplierName] || 0,
          sale_price: data.salePrice || 0,
          notes: ''
        };
      });

    if (selected.length === 0) {
      toast.error("יש לבחור לפחות מוצר אחד");
      return;
    }

    createItemMutation.mutate(selected);
  };

  const handleProductSelection = (productName, supplierName, isChecked, salePrice) => {
    const key = `${productName}|||${supplierName}`;
    setSelectedProducts(prev => ({
      ...prev,
      [key]: {
        selected: isChecked,
        salePrice: salePrice || prev[key]?.salePrice || 0
      }
    }));
  };

  const handleSalePriceChange = (productName, supplierName, value) => {
    const key = `${productName}|||${supplierName}`;
    setSelectedProducts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        salePrice: value ? parseFloat(value) : 0
      }
    }));
  };

  // Flatten supplier prices for selection
  const supplierProductOptions = useMemo(() => {
    const options = [];
    supplierPrices.forEach(product => {
      if (product.supplier_prices) {
        Object.entries(product.supplier_prices).forEach(([supplierName, price]) => {
          if (price != null) {
            options.push({
              product_name: product.product_name,
              category: product.category,
              sub_category: product.sub_category,
              supplier_name: supplierName,
              supplier_price: price
            });
          }
        });
      }
    });
    return options;
  }, [supplierPrices]);

  const filteredSupplierOptions = useMemo(() => {
    return supplierProductOptions.filter(opt => 
      opt.product_name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
      opt.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
    );
  }, [supplierProductOptions, supplierSearchTerm]);

  // Group products by category and sub-category
  const groupedProducts = useMemo(() => {
    const grouped = {};
    filteredSupplierOptions.forEach(opt => {
      const category = opt.category || 'ללא קטגוריה';
      const subCategory = opt.sub_category || 'ללא תת קטגוריה';
      
      if (!grouped[category]) {
        grouped[category] = {};
      }
      if (!grouped[category][subCategory]) {
        grouped[category][subCategory] = [];
      }
      grouped[category][subCategory].push(opt);
    });
    return grouped;
  }, [filteredSupplierOptions]);

  const handleSelectAll = () => {
    const allSelected = Object.keys(selectedProducts).length === filteredSupplierOptions.length &&
      Object.values(selectedProducts).every(p => p.selected);
    
    if (allSelected) {
      setSelectedProducts({});
    } else {
      const newSelected = {};
      filteredSupplierOptions.forEach(opt => {
        const key = `${opt.product_name}|||${opt.supplier_name}`;
        newSelected[key] = {
          selected: true,
          salePrice: selectedProducts[key]?.salePrice || 0
        };
      });
      setSelectedProducts(newSelected);
    }
  };

  const allSelected = filteredSupplierOptions.length > 0 && 
    filteredSupplierOptions.every(opt => {
      const key = `${opt.product_name}|||${opt.supplier_name}`;
      return selectedProducts[key]?.selected;
    });

  const filteredPriceListItems = useMemo(() => {
    return priceListItems.filter(item =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [priceListItems, searchTerm]);

  if (!priceListId) {
    return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <p className="text-red-600">לא נמצא מזהה מחירון</p>
        <Button onClick={() => navigate(createPageUrl("PriceListsPage"))} className="mt-4">
          חזרה למחירונים
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("PriceListsPage"))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{priceList?.name || 'מחירון'}</h1>
          </div>
          {priceList?.description && (
            <p className="text-gray-500 mr-12">{priceList.description}</p>
          )}
        </div>
        <Button onClick={() => setShowImportDialog(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 ml-2" />
          ייבא מוצרים
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>מוצרים במחירון</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש מוצר או ספק..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם המוצר</TableHead>
                    <TableHead className="text-right">קטגוריה</TableHead>
                    <TableHead className="text-right">שם ספק</TableHead>
                    <TableHead className="text-right">מחיר ספק (₪)</TableHead>
                    <TableHead className="text-right">מחיר מכירה (₪)</TableHead>
                    <TableHead className="text-right">הערות</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingItems ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        <Loader2 className="mx-auto w-6 h-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : filteredPriceListItems.length > 0 ? (
                    filteredPriceListItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-right font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-right">
                          {item.category && <Badge variant="outline">{item.category}</Badge>}
                          {item.sub_category && <Badge variant="secondary" className="mr-1">{item.sub_category}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{item.supplier_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {item.supplier_price != null ? item.supplier_price.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItem === item.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editedData.sale_price}
                              onChange={(e) => setEditedData({ ...editedData, sale_price: e.target.value })}
                              className="max-w-[100px]"
                            />
                          ) : (
                            <span className="font-semibold text-green-700">
                              {item.sale_price != null ? item.sale_price.toFixed(2) : '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItem === item.id ? (
                            <Input
                              value={editedData.notes}
                              onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                              className="max-w-[150px]"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{item.notes || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItem === item.id ? (
                            <div className="flex gap-2 justify-end">
                              <Button size="icon" variant="default" onClick={handleSaveEdit}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="outline" onClick={() => { setEditingItem(null); setEditedData({}); }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <Button size="icon" variant="outline" onClick={() => handleEdit(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="destructive" onClick={() => setItemToDelete(item)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                        אין מוצרים במחירון. לחץ על "ייבא מוצרים" להוספת מוצרים ממחירון הספקים.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>ייבא מוצרים ממחירון ספקים</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חיפוש מוצר או ספק..."
                  value={supplierSearchTerm}
                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleSelectAll}
                className="whitespace-nowrap"
              >
                {allSelected ? 'בטל בחירה' : 'בחר הכל'}
              </Button>
            </div>

            <div className="border rounded-md max-h-[500px] overflow-y-auto">
              {Object.entries(groupedProducts).map(([category, subCategories]) => (
                <div key={category} className="mb-4">
                  <div className="sticky top-0 bg-purple-100 px-4 py-2 font-bold text-purple-900 border-b-2 border-purple-200 z-20">
                    {category}
                  </div>
                  {Object.entries(subCategories).map(([subCategory, products]) => (
                    <div key={subCategory}>
                      <div className="sticky top-10 bg-purple-50 px-6 py-1.5 font-semibold text-purple-800 text-sm border-b border-purple-100 z-10">
                        {subCategory}
                      </div>
                      <Table>
                        <TableHeader className="sticky top-[60px] bg-gray-50 z-10">
                          <TableRow>
                            <TableHead className="text-right w-12"></TableHead>
                            <TableHead className="text-right">מוצר</TableHead>
                            <TableHead className="text-right">ספק</TableHead>
                            <TableHead className="text-right">מחיר ספק (₪)</TableHead>
                            <TableHead className="text-right">מחיר מכירה (₪)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((opt, idx) => {
                            const key = `${opt.product_name}|||${opt.supplier_name}`;
                            const isSelected = selectedProducts[key]?.selected || false;
                            const salePrice = selectedProducts[key]?.salePrice || '';

                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleProductSelection(opt.product_name, opt.supplier_name, checked, salePrice)}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <p className="font-medium">{opt.product_name}</p>
                                </TableCell>
                                <TableCell className="text-right">{opt.supplier_name}</TableCell>
                                <TableCell className="text-right">{opt.supplier_price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={salePrice}
                                    onChange={(e) => handleSalePriceChange(opt.product_name, opt.supplier_name, e.target.value)}
                                    disabled={!isSelected}
                                    className="max-w-[120px]"
                                  />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setSelectedProducts({}); }}>
              ביטול
            </Button>
            <Button onClick={handleImportProducts} disabled={createItemMutation.isPending}>
              {createItemMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              ייבא מוצרים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את המוצר <span className="font-bold">"{itemToDelete?.product_name}"</span> מהמחירון. לא ניתן לשחזר פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteItemMutation.mutate(itemToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              כן, מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}