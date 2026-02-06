import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Edit, Search, AlertTriangle, CheckCircle, Loader2, Save, X, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const LOCATIONS = [
  "חדר בדיקות 1",
  "חדר בדיקות 2",
  "קבלה",
  "חדר ניתוח",
  "חדרי אשפוז",
  "מחסן קטן - ח. ניתוח"
];

export default function InventoryCountModule({ currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    product_name: '',
    item_type: '',
    current_quantity: 0,
    required_quantity: 0,
    locations: []
  });

  const queryClient = useQueryClient();

  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list('-updated_date'),
  });

  const { data: supplierPrices = [], isLoading: isLoadingPrices } = useQuery({
    queryKey: ['supplierPrices'],
    queryFn: () => base44.entities.SupplierPrice.list(),
  });

  const isLoading = isLoadingInventory || isLoadingPrices;

  const saveItemMutation = useMutation({
    mutationFn: async (itemData) => {
      // Calculate total quantity from all locations
      const totalQuantity = itemData.locations?.reduce((sum, loc) => sum + (loc.quantity || 0), 0) || 0;
      
      const dataWithUser = {
        ...itemData,
        current_quantity: totalQuantity,
        last_counted_by: currentUser?.display_name || currentUser?.full_name,
        last_counted_date: new Date().toISOString()
      };

      if (editingItem) {
        return await base44.entities.InventoryItem.update(editingItem.id, dataWithUser);
      } else {
        return await base44.entities.InventoryItem.create(dataWithUser);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      setIsFormOpen(false);
      setEditingItem(null);
      resetForm();
      toast.success(editingItem ? 'פריט עודכן בהצלחה' : 'פריט נוסף בהצלחה');
    },
    onError: (error) => {
      console.error('Error saving item:', error);
      toast.error('שגיאה בשמירת הפריט');
    }
  });

  const resetForm = () => {
    setFormData({
      product_name: '',
      item_type: '',
      current_quantity: 0,
      required_quantity: 0,
      locations: []
    });
  };

  const handleAddLocation = () => {
    setFormData({
      ...formData,
      locations: [...(formData.locations || []), { location: '', quantity: 0 }]
    });
  };

  const handleRemoveLocation = (index) => {
    const newLocations = formData.locations.filter((_, i) => i !== index);
    setFormData({ ...formData, locations: newLocations });
  };

  const handleLocationChange = (index, field, value) => {
    const newLocations = [...formData.locations];
    newLocations[index] = { ...newLocations[index], [field]: field === 'quantity' ? (parseInt(value) || 0) : value };
    setFormData({ ...formData, locations: newLocations });
  };

  const handleEdit = (item) => {
    setEditingItem(item.isPlaceholder ? null : item);
    
    // If locations array exists and has data, use it; otherwise create from old location field
    let locations = [];
    if (item.locations && item.locations.length > 0) {
      locations = item.locations;
    } else if (item.location) {
      // Migrate old data: if has old location field, convert to new format
      locations = [{ location: item.location, quantity: item.current_quantity || 0 }];
    }
    
    setFormData({
      product_name: item.product_name,
      item_type: item.item_type,
      current_quantity: item.current_quantity || 0,
      required_quantity: item.required_quantity || 0,
      locations: locations
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveItemMutation.mutate(formData);
  };

  const getStatusBadge = (item) => {
    const current = item.current_quantity || 0;
    const required = item.required_quantity || 0;

    if (current === 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />אזל</Badge>;
    } else if (current < required) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />נמוך</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1"><CheckCircle className="w-3 h-3" />תקין</Badge>;
    }
  };

  // CRITICAL: Merge inventory items with supplier prices
  // This preserves ALL existing inventory data, even if items are removed from supplier price list
  const allItems = React.useMemo(() => {
    const result = [];
    const processedNames = new Set();
    
    // STEP 1: Add ALL existing inventory items (these have real quantity data that must be preserved)
    inventoryItems.forEach(item => {
      result.push(item);
      processedNames.add(item.product_name);
    });
    
    // STEP 2: Add placeholders ONLY for new items from supplier price list that don't have inventory records yet
    supplierPrices.forEach(priceItem => {
      if (!processedNames.has(priceItem.product_name)) {
        result.push({
          product_name: priceItem.product_name,
          item_type: priceItem.item_type,
          current_quantity: 0,
          required_quantity: 0,
          location: '',
          isPlaceholder: true
        });
      }
    });
    
    return result;
  }, [inventoryItems, supplierPrices]);

  const filteredItems = allItems
    .filter(item => {
      // Search filter
      const matchesSearch = item.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Location filter
      let matchesLocation = true;
      if (locationFilter !== 'all') {
        if (item.locations && item.locations.length > 0) {
          matchesLocation = item.locations.some(loc => loc.location === locationFilter);
        } else {
          matchesLocation = item.location === locationFilter;
        }
      }
      
      // Status filter - must match the logic in getStatusBadge
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const current = item.current_quantity || 0;
        const required = item.required_quantity || 0;
        
        if (statusFilter === 'out_of_stock') {
          matchesStatus = current === 0;
        } else if (statusFilter === 'low') {
          matchesStatus = current > 0 && current < required;
        } else if (statusFilter === 'ok') {
          // Item is "ok" only if: has quantity AND meets requirement
          matchesStatus = current > 0 && current >= required;
        }
      }
      
      return matchesSearch && matchesLocation && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by status: out of stock (0) -> low (1) -> ok (2)
      const getStatusPriority = (item) => {
        const current = item.current_quantity || 0;
        const required = item.required_quantity || 0;
        
        if (current === 0) return 0; // Out of stock - highest priority
        if (current < required) return 1; // Low stock - medium priority
        return 2; // OK - lowest priority
      };
      
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      
      return priorityA - priorityB;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          ספירת מלאי
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            מציג <span className="font-semibold text-gray-900">{filteredItems.length}</span> מתוך {allItems.length} פריטים
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש מוצר..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="כל המיקומים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המיקומים</SelectItem>
              {LOCATIONS.map(location => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="כל הסטטוסים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="ok">תקין</SelectItem>
              <SelectItem value="low">נמוך</SelectItem>
              <SelectItem value="out_of_stock">אזל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'לא נמצאו מוצרים' : 'אין פריטים במלאי - התחל בהוספת פריטים'}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם מוצר</TableHead>
                  <TableHead className="text-center">סטטוס</TableHead>
                  <TableHead className="text-center">כמות כוללת</TableHead>
                  <TableHead className="text-center">כמות נדרשת</TableHead>
                  <TableHead className="text-right">מיקומים</TableHead>
                  <TableHead className="text-center">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const hasLocations = item.locations && item.locations.length > 0;
                  const displayLocations = hasLocations 
                    ? item.locations.map(loc => `${loc.location} (${loc.quantity})`).join(', ')
                    : (item.location || '-');
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(item)}</TableCell>
                      <TableCell className="text-center">{item.current_quantity || 0}</TableCell>
                      <TableCell className="text-center">{item.required_quantity || 0}</TableCell>
                      <TableCell className="text-right">
                        {hasLocations ? (
                          <div className="flex flex-wrap gap-1">
                            {item.locations.map((loc, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <MapPin className="w-3 h-3 ml-1" />
                                {loc.location} - {loc.quantity} יח'
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">{item.location || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent dir="rtl" className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'עריכת פריט' : 'הוספת פריט חדש'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>שם המוצר</Label>
                <Input value={formData.product_name} disabled className="bg-gray-50" />
              </div>
              
              <div className="space-y-2">
                <Label>סוג פריט</Label>
                <Input value={formData.item_type} disabled className="bg-gray-50" />
              </div>

              <div className="space-y-2">
                <Label>כמות נדרשת *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.required_quantity}
                  onChange={(e) => setFormData({ ...formData, required_quantity: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    מיקומים וכמויות
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddLocation}>
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף מיקום
                  </Button>
                </div>
                
                {formData.locations && formData.locations.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                    {formData.locations.map((loc, index) => (
                      <div key={index} className="flex items-end gap-2 p-2 bg-gray-50 rounded">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">מיקום</Label>
                          <Select
                            value={loc.location}
                            onValueChange={(value) => handleLocationChange(index, 'location', value)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="בחר מיקום" />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCATIONS.map(location => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">כמות</Label>
                          <Input
                            type="number"
                            min="0"
                            value={loc.quantity}
                            onChange={(e) => handleLocationChange(index, 'quantity', e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleRemoveLocation(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500 border-2 border-dashed rounded-lg">
                    לא הוגדרו מיקומים. לחץ על "הוסף מיקום" להוספת מיקום ראשון
                  </div>
                )}
                
                {formData.locations && formData.locations.length > 0 && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    <strong>סה"כ כמות:</strong> {formData.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0)}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  <X className="w-4 h-4 ml-2" />
                  ביטול
                </Button>
                <Button type="submit" disabled={saveItemMutation.isPending}>
                  {saveItemMutation.isPending ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  שמור
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}