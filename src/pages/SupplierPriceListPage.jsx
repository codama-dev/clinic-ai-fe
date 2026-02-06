import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Upload, Search, ShieldAlert, CheckCircle, Edit, Trash2, Save, X, Plus, Filter, ArrowUpDown, RotateCcw, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SyncConfirmationDialog from "../components/sync/SyncConfirmationDialog";

const CATEGORIES = {
    "תרופות": ["אנטיביוטיקה", "סטרואידים ואנטיהיסטמינים", "שיכוך כאבים והרגעה", "תרופות בהזרקה", "שתן", "גאסטרו", "אוזניים", "עיניים", "עור", "תרופות שונות"],
    "בדיקות": ["בדיקות מעבדה", "בדיקות רופא", "בדיקות מומחה"],
    "תכשירים": ["טיפול מונע", "שמפו", "משחת שיניים", "תרחיץ", "אחר"],
    "ציוד": ["ציוד רפואי", "ציוד משרדי", "ציוד ניקיון"],
    "צעצועים": ["לעיסה", "משחק", "אחר"],
    "מזון": ["חטיפים", "מזון רגיל", "מזון רפואי"]
};

const ALL_CATEGORIES = Object.keys(CATEGORIES);
const ALL_SUB_CATEGORIES = Object.values(CATEGORIES).flat();

export default function SupplierPriceListPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [itemTypeFilter, setItemTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('product_name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [isProcessing, setIsProcessing] = useState(false);
    const [supplierHeaders, setSupplierHeaders] = useState([]);
    const [editingItem, setEditingItem] = useState(null); // Stores the ID of the item being edited
    const [editedData, setEditedData] = useState({}); // Stores the temporary edited data
    const [itemToDelete, setItemToDelete] = useState(null); // Stores the item selected for deletion
    const [showAddDialog, setShowAddDialog] = useState(false); // State for Add New Item dialog
    const [newItemData, setNewItemData] = useState({ // State for new item data
        product_name: '',
        category: '',
        sub_category: '',
        supplier_prices: {}
    });
    const [additionalSuppliers, setAdditionalSuppliers] = useState([]); // Dynamic supplier fields
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResults, setSyncResults] = useState(null);
    const [showSyncDialog, setShowSyncDialog] = useState(false);
    const [proposedChanges, setProposedChanges] = useState(null);
    const [isConfirmingSyncLoading, setIsConfirmingSyncLoading] = useState(false);

    const { data: currentUser, isLoading: isUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const hasAccess = currentUser?.role === 'admin' || currentUser?.permissions?.includes('manage_supplier_price_list');

    // Fetch existing price list data
    const { data: priceList = [], isLoading: isLoadingData } = useQuery({
        queryKey: ['supplierPrices'],
        queryFn: () => base44.entities.SupplierPrice.list(),
        enabled: hasAccess, // Only fetch if user has access
    });
    
    useEffect(() => {
        if (priceList.length > 0) {
            const allHeaders = new Set();
            priceList.forEach(item => {
                if (item.supplier_prices) {
                    Object.keys(item.supplier_prices).forEach(header => allHeaders.add(header));
                }
            });
            setSupplierHeaders(Array.from(allHeaders));
        } else {
            setSupplierHeaders([]);
        }
    }, [priceList]);

    // Mutation for processing the uploaded file
    const processFileMutation = useMutation({
        mutationFn: async (file) => {
            // Read and parse CSV file directly in the browser
            const fileContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file, 'UTF-8');
            });

            // Parse CSV content
            const lines = fileContent.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                throw new Error('הקובץ ריק או לא מכיל נתונים');
            }

            // Parse header row
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const productNameIndex = headers.findIndex(h => h.includes('שם המוצר') || h.toLowerCase().includes('product'));
            const categoryIndex = headers.findIndex(h => h.includes('קטגוריה ראשית') || h.includes('category'));
            const subCategoryIndex = headers.findIndex(h => h.includes('תת קטגוריה') || h.includes('sub'));
            
            if (productNameIndex === -1) {
                throw new Error('הקובץ חייב לכלול עמודה "שם המוצר"');
            }

            // Get supplier column indices (all columns after sub_category or category)
            const lastMetadataIndex = Math.max(productNameIndex, categoryIndex, subCategoryIndex);
            const supplierColumns = headers.slice(lastMetadataIndex + 1);

            // Parse data rows
            const newProducts = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;

                // Handle quoted CSV values
                const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
                const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, ''));

                const productName = cleanValues[productNameIndex]?.trim();
                const category = categoryIndex !== -1 ? cleanValues[categoryIndex]?.trim() : '';
                const subCategory = subCategoryIndex !== -1 ? cleanValues[subCategoryIndex]?.trim() : '';

                if (!productName) continue;

                const supplier_prices = {};
                const lastMetadataIndex = Math.max(productNameIndex, categoryIndex, subCategoryIndex);
                supplierColumns.forEach((supplierName, idx) => {
                    const colIndex = lastMetadataIndex + 1 + idx;
                    const priceValue = cleanValues[colIndex]?.trim();
                    if (priceValue && priceValue !== '' && !isNaN(parseFloat(priceValue))) {
                        supplier_prices[supplierName] = parseFloat(priceValue);
                    }
                });

                newProducts.push({
                    product_name: productName,
                    category: category || '',
                    sub_category: subCategory || '',
                    supplier_prices
                });
            }

            if (newProducts.length === 0) {
                throw new Error('לא נמצאו מוצרים תקינים בקובץ');
            }
            
            // Clear the old price list
            const existingRecords = await base44.entities.SupplierPrice.list();
            if (existingRecords.length > 0) {
                const deletePromises = existingRecords.map(record => base44.entities.SupplierPrice.delete(record.id));
                await Promise.all(deletePromises);
            }
            
            // Insert new data in bulk
            await base44.entities.SupplierPrice.bulkCreate(newProducts);
            
            return newProducts;
        },
        onSuccess: () => {
            toast.success("מחיון הספקים עודכן בהצלחה!");
            queryClient.invalidateQueries({ queryKey: ['supplierPrices'] });
        },
        onError: (error) => {
            toast.error(`שגיאה בעיבוד הקובץ: ${error.message}`);
        },
        onSettled: () => {
            setIsProcessing(false);
        }
    });

    // Mutation for creating a new item
    const createItemMutation = useMutation({
        mutationFn: async (data) => {
            await base44.entities.SupplierPrice.create(data);
        },
        onSuccess: () => {
            toast.success("המוצר נוסף בהצלחה!");
            queryClient.invalidateQueries({ queryKey: ['supplierPrices'] });
            setShowAddDialog(false);
            setNewItemData({ product_name: '', category: '', sub_category: '', supplier_prices: {} });
        },
        onError: (error) => {
            toast.error("שגיאה בהוספת המוצר");
            console.error(error);
        }
    });

    // Mutation for updating a single item
    const updateItemMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            await base44.entities.SupplierPrice.update(id, data);
        },
        onSuccess: () => {
            toast.success("המוצר עודכן בהצלחה!");
            queryClient.invalidateQueries({ queryKey: ['supplierPrices'] });
            setEditingItem(null);
            setEditedData({});
        },
        onError: (error) => {
            toast.error("שגיאה בעדכון המוצר");
            console.error(error);
        }
    });

    // Mutation for deleting an item
    const deleteItemMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.SupplierPrice.delete(id);
        },
        onSuccess: () => {
            toast.success("המוצר נמחק בהצלחה!");
            queryClient.invalidateQueries({ queryKey: ['supplierPrices'] });
            setItemToDelete(null);
        },
        onError: (error) => {
            toast.error("שגיאה במחיקת המוצר");
            console.error(error);
        }
    });

    const handleEdit = (item) => {
        setEditingItem(item.id);
        setEditedData({
            product_name: item.product_name || '',
            category: item.category || '',
            sub_category: item.sub_category || '',
            supplier_prices: { ...item.supplier_prices } || {}
        });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditedData({});
    };

    const handleSaveEdit = () => {
        if (!editedData.product_name) {
            toast.error("יש למלא שם מוצר");
            return;
        }
        updateItemMutation.mutate({
            id: editingItem,
            data: editedData
        });
    };

    const handleDeleteRequest = (item) => {
        setItemToDelete(item);
    };

    const handleDeleteConfirm = () => {
        if (itemToDelete) {
            deleteItemMutation.mutate(itemToDelete.id);
        }
    };

    const handlePriceChange = (supplier, value) => {
        const trimmedValue = value.trim();
        let numValue;
        if (trimmedValue === '') {
            numValue = null;
        } else {
            const parsed = parseFloat(trimmedValue);
            numValue = isNaN(parsed) ? null : parsed;
        }
        setEditedData(prev => ({
            ...prev,
            supplier_prices: {
                ...prev.supplier_prices,
                [supplier]: numValue
            }
        }));
    };

    const handleNewItemPriceChange = (supplier, value) => {
        const numValue = value === '' ? null : parseFloat(value);
        setNewItemData(prev => ({
            ...prev,
            supplier_prices: {
                ...prev.supplier_prices,
                [supplier]: numValue
            }
        }));
    };

    const handleAddSupplierField = () => {
        setAdditionalSuppliers([...additionalSuppliers, { name: '', price: '' }]);
    };

    const handleRemoveSupplierField = (index) => {
        const newSuppliers = additionalSuppliers.filter((_, i) => i !== index);
        setAdditionalSuppliers(newSuppliers);
    };

    const handleSupplierFieldChange = (index, field, value) => {
        const newSuppliers = [...additionalSuppliers];
        newSuppliers[index][field] = value;
        setAdditionalSuppliers(newSuppliers);
    };

    const handleAddNewItem = () => {
        if (!newItemData.product_name) {
            toast.error("יש למלא שם מוצר");
            return;
        }

        // Merge additional suppliers into supplier_prices
        const finalData = { ...newItemData };
        additionalSuppliers.forEach(supplier => {
            if (supplier.name.trim()) {
                finalData.supplier_prices[supplier.name.trim()] = supplier.price ? parseFloat(supplier.price) : null;
            }
        });

        createItemMutation.mutate(finalData);
    };

    const handleSyncWithClientPrices = async () => {
        setIsSyncing(true);
        setSyncResults(null);
        try {
            // First, do a dry run to get proposed changes
            const { results } = await base44.functions.invoke('syncSupplierPrices', { dry_run: true });
            
            if (results.updated === 0 && results.created === 0) {
                toast.info('אין שינויים לסנכרון');
                setIsSyncing(false);
                return;
            }

            setProposedChanges(results);
            setShowSyncDialog(true);
        } catch (error) {
            console.error('Sync error:', error);
            toast.error(`שגיאה בבדיקת שינויים: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleConfirmSync = async (confirmedItems) => {
        setIsConfirmingSyncLoading(true);
        try {
            const { results } = await base44.functions.invoke('syncSupplierPrices', { 
                dry_run: false,
                confirmed_items: confirmedItems 
            });
            
            setSyncResults(results);
            toast.success(`סנכרון הושלם! ${results.updated} עודכנו, ${results.created} נוצרו`);
            queryClient.invalidateQueries({ queryKey: ['clientPrices'] });
            setShowSyncDialog(false);
            setProposedChanges(null);
        } catch (error) {
            console.error('Sync error:', error);
            toast.error(`שגיאה בסנכרון: ${error.message}`);
        } finally {
            setIsConfirmingSyncLoading(false);
        }
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setItemTypeFilter('all');
        setCategoryFilter('all');
        setSortBy('product_name');
        setSortOrder('asc');
    };

    const hasActiveFilters = searchTerm !== '' || itemTypeFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'product_name' || sortOrder !== 'asc';

    const handleOpenAddDialog = () => {
        // Initialize supplier_prices with all existing suppliers
        const initialPrices = {};
        supplierHeaders.forEach(header => {
            initialPrices[header] = null;
        });
        setNewItemData({
            product_name: '',
            category: '',
            sub_category: '',
            supplier_prices: initialPrices
        });
        setAdditionalSuppliers([]);
        setShowAddDialog(true);
    };

    // Function to handle file input change
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsProcessing(true);
            processFileMutation.mutate(file);
        }
    };
    
    // Function to download the CSV template with existing data
    const handleDownloadTemplate = () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM for Excel
        
        // Use all existing supplier names from the price list
        const supplierColumns = supplierHeaders.length > 0 ? supplierHeaders : [];
        
        // Build header row
        const headers = ['שם המוצר', 'קטגוריה ראשית', 'תת קטגוריה', ...supplierColumns];
        csvContent += headers.join(',') + '\n';
        
        // Add data rows if we have existing data
        if (priceList.length > 0) {
            priceList.forEach(item => {
                const row = [
                    `"${item.product_name || ''}"`,
                    `"${item.category || ''}"`,
                    `"${item.sub_category || ''}"`,
                    ...supplierColumns.map(header => {
                        const price = item.supplier_prices?.[header];
                        return price != null ? price : '';
                    })
                ];
                csvContent += row.join(',') + '\n';
            });
        } else {
            // If no data exists, add 3 example rows with sample suppliers
            csvContent += '"אמוקסיצילין 500mg","תרופה",12.50,13.20,11.80\n';
            csvContent += '"כפפות ניטריל - קופסה","ציוד רפואי",45.00,48.50,44.00\n';
            csvContent += '"מזון רפואי לחתולים 2 ק\\"ג","מזון",89.00,92.50,87.00\n';
        }
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Lovet-SupplierItems-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(priceList.length > 0 ? "הקובץ הורד עם כל הנתונים הקיימים" : "הקובץ הורד עם דוגמאות");
    };

    // Memoized filtered and sorted list for performance
    const filteredPriceList = useMemo(() => {
        if (!priceList) return [];
        
        // Filter by search term
        let filtered = priceList.filter(item => {
            const searchTermLower = searchTerm.toLowerCase();
            const productNameMatch = item.product_name && item.product_name.toLowerCase().includes(searchTermLower);
            const itemTypeMatch = item.item_type && item.item_type.toLowerCase().includes(searchTermLower);
            return productNameMatch || itemTypeMatch;
        });
        
        // Filter by item type (sub_category)
        if (itemTypeFilter !== 'all') {
            filtered = filtered.filter(item => item.sub_category === itemTypeFilter);
        }
        
        // Filter by category
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(item => item.category === categoryFilter || item.sub_category === categoryFilter);
        }
        
        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            
            if (sortBy === 'product_name') {
                aVal = a.product_name || '';
                bVal = b.product_name || '';
                const comparison = aVal.localeCompare(bVal, 'he');
                return sortOrder === 'asc' ? comparison : -comparison;
            } else if (sortBy === 'category') {
                aVal = a.category || '';
                bVal = b.category || '';
                const comparison = aVal.localeCompare(bVal, 'he');
                return sortOrder === 'asc' ? comparison : -comparison;
            } else if (sortBy === 'sub_category') {
                aVal = a.sub_category || '';
                bVal = b.sub_category || '';
                const comparison = aVal.localeCompare(bVal, 'he');
                return sortOrder === 'asc' ? comparison : -comparison;
            }
            
            return 0;
        });
        
        return filtered;
    }, [priceList, searchTerm, itemTypeFilter, categoryFilter, sortBy, sortOrder]);

    // Group filtered prices by category and sub-category
    const groupedPrices = useMemo(() => {
        return filteredPriceList.reduce((acc, price) => {
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
    }, [filteredPriceList]);

    if (isUserLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
    }

    if (!hasAccess) {
        return (
          <Card className="max-w-2xl mx-auto mt-10 border-red-500">
            <CardHeader className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
              <CardTitle className="text-2xl text-red-700 mt-4">אין לך הרשאת גישה</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600">
                עמוד זה מיועד למנהלי מערכת או למשתמשים בעלי הרשאה מתאימה בלבד.
              </p>
            </CardContent>
          </Card>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">מחירון ספקים</h1>
                    <p className="text-gray-500 mt-1">כלי ליצירה וניהול מחירון הספקים של המרפאה.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={handleSyncWithClientPrices}
                        disabled={isSyncing || priceList.length === 0}
                        className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                מסנכרן...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                סנכרן למחירון לקוחות
                            </>
                        )}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => navigate(createPageUrl("ClientPriceListPage"))}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        מחירון לקוחות
                    </Button>
                </div>
            </div>

            {syncResults && (
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-green-900 mb-2">תוצאות סנכרון</h3>
                                <div className="text-sm text-green-800 space-y-1">
                                    <p>• סה"כ פריטים במחירון ספקים: {syncResults.total_supplier_items}</p>
                                    <p>• פריטים שעודכנו: {syncResults.updated}</p>
                                    <p>• פריטים חדשים שנוצרו: {syncResults.created}</p>
                                    <p>• פריטים ללא שינוי: {syncResults.no_changes}</p>
                                    {syncResults.errors.length > 0 && (
                                        <p className="text-red-600">• שגיאות: {syncResults.errors.length}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Download className="text-purple-600"/> שלב 1: הורדת תבנית</CardTitle>
                        <CardDescription>הורד את קובץ התבנית, ומלא בו את פרטי המוצרים והמחירים מהספקים השונים. ניתן לשנות את שמות הספקים בכותרות.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleDownloadTemplate} className="w-full">
                            <Download className="w-4 h-4 ml-2"/>
                            הורד תבנית CSV
                        </Button>
                    </CardContent>
                </Card>
                <Card className={isProcessing ? "animate-pulse" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Upload className="text-purple-600"/> שלב 2: העלאת קובץ</CardTitle>
                        <CardDescription>לאחר מילוי הנתונים, העלה את הקובץ המעודכן. המחירון הקיים יימחק ויוחלף בחדש.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <label htmlFor="file-upload">
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 ml-2 animate-spin"/>
                                        מעבד קובץ...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 ml-2"/>
                                        בחר קובץ
                                    </>
                                )}
                            </label>
                        </Button>
                        <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".csv" disabled={isProcessing}/>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle>שלב 3: צפייה ועריכת מחירון</CardTitle>
                            <CardDescription>ניתן לערוך שם מוצר, סוג פריט ומחירים ישירות בטבלה.</CardDescription>
                        </div>
                        <Button onClick={handleOpenAddDialog} className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                            <Plus className="w-4 h-4 ml-2" />
                            הוסף מוצר
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search and Filters Section */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Search className="w-4 h-4" />
                                <span>חיפוש וסינון</span>
                            </div>
                            
                            <div className="relative">
                                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="חיפוש לפי שם מוצר או סוג פריט..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pr-10 bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600 flex items-center gap-1">
                                        <Filter className="w-3 h-3" />
                                        סנן לפי קטגוריה
                                    </Label>
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">כל הקטגוריות</SelectItem>
                                            {ALL_CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600 flex items-center gap-1">
                                        <Filter className="w-3 h-3" />
                                        סנן לפי תת קטגוריה
                                    </Label>
                                    <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">כל תתי הקטגוריות</SelectItem>
                                            {ALL_SUB_CATEGORIES.map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600 flex items-center gap-1">
                                        <ArrowUpDown className="w-3 h-3" />
                                        מיין לפי
                                    </Label>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="product_name">שם מוצר</SelectItem>
                                            <SelectItem value="category">קטגוריה</SelectItem>
                                            <SelectItem value="sub_category">תת קטגוריה</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600">סדר המיון</Label>
                                    <Select value={sortOrder} onValueChange={setSortOrder}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="asc">א-ת (עולה)</SelectItem>
                                            <SelectItem value="desc">ת-א (יורד)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600 opacity-0">פעולות</Label>
                                    <Button 
                                        variant="outline" 
                                        className="w-full"
                                        onClick={handleResetFilters}
                                        disabled={!hasActiveFilters}
                                    >
                                        <RotateCcw className="w-4 h-4 ml-2" />
                                        אפס סינון
                                    </Button>
                                </div>
                            </div>

                            {/* Results Counter */}
                            <div className="flex items-center justify-between pt-2 border-t">
                                <div className="text-sm text-gray-600">
                                    {filteredPriceList.length === priceList.length ? (
                                        <span>מציג {filteredPriceList.length} מוצרים</span>
                                    ) : (
                                        <span className="font-medium">
                                            נמצאו {filteredPriceList.length} מתוך {priceList.length} מוצרים
                                        </span>
                                    )}
                                </div>
                                {hasActiveFilters && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                        סינון פעיל
                                    </Badge>
                                )}
                                </div>
                                </div>

                                {/* Grouped Tables by Category and Sub-Category */}
                                <div className="space-y-4">
                                    {isLoadingData ? (
                                        <div className="text-center h-24 flex items-center justify-center">
                                            <Loader2 className="mx-auto w-6 h-6 animate-spin" />
                                        </div>
                                    ) : filteredPriceList.length === 0 ? (
                                        <div className="text-center h-24 flex items-center justify-center text-gray-500">
                                            לא נמצאו נתונים. יש להעלות קובץ מחירון או להוסיף מוצרים ידנית.
                                        </div>
                                    ) : (
                                        Object.entries(groupedPrices).map(([category, subCategories]) => (
                                            <div key={category} className="border rounded-lg overflow-hidden">
                                                {/* Category Header */}
                                                <div className="bg-purple-600 text-white px-4 py-3 font-bold text-lg">
                                                    {category}
                                                </div>
                                                
                                                {/* Sub-categories */}
                                                {Object.entries(subCategories).map(([subCategory, items]) => (
                                                    <div key={subCategory}>
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
                                                                    {supplierHeaders.map(header => (
                                                                        <TableHead key={header} className="text-right w-28">{header} (₪)</TableHead>
                                                                    ))}
                                                                    <TableHead className="text-right w-24">פעולות</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {items.map((item, index) => (
                                                                    <TableRow key={item.id}>
                                                                        <TableCell className="text-gray-500 text-right align-top">{index + 1}</TableCell>
                                                                        <TableCell className="text-right align-top">
                                                                            {editingItem === item.id ? (
                                                                                <div className="space-y-2">
                                                                                    <Input
                                                                                        value={editedData.product_name}
                                                                                        onChange={(e) => setEditedData(prev => ({ ...prev, product_name: e.target.value }))}
                                                                                        className="max-w-[250px]"
                                                                                        placeholder="שם המוצר"
                                                                                    />
                                                                                    <div className="flex gap-2">
                                                                                        <Select
                                                                                            value={editedData.category}
                                                                                            onValueChange={(value) => setEditedData(prev => ({ ...prev, category: value, sub_category: '' }))}
                                                                                        >
                                                                                            <SelectTrigger className="w-[120px]">
                                                                                                <SelectValue placeholder="קטגוריה" />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                {ALL_CATEGORIES.map(cat => (
                                                                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                                                                ))}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                        <Select
                                                                                            value={editedData.sub_category}
                                                                                            onValueChange={(value) => setEditedData(prev => ({ ...prev, sub_category: value }))}
                                                                                            disabled={!editedData.category}
                                                                                        >
                                                                                            <SelectTrigger className="w-[120px]">
                                                                                                <SelectValue placeholder="תת קטגוריה" />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                {editedData.category && CATEGORIES[editedData.category]?.map(subCat => (
                                                                                                    <SelectItem key={subCat} value={subCat}>{subCat}</SelectItem>
                                                                                                ))}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="font-medium">{item.product_name}</span>
                                                                            )}
                                                                        </TableCell>
                                                                        {supplierHeaders.map(header => (
                                                                            <TableCell key={header} className="text-right align-top">
                                                                                {editingItem === item.id ? (
                                                                                    <Input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        value={editedData.supplier_prices?.[header] ?? ''}
                                                                                        onChange={(e) => handlePriceChange(header, e.target.value)}
                                                                                        className="max-w-[100px]"
                                                                                    />
                                                                                ) : (
                                                                                    item.supplier_prices && item.supplier_prices[header] != null 
                                                                                        ? (typeof item.supplier_prices[header] === 'number' 
                                                                                            ? item.supplier_prices[header].toFixed(2) 
                                                                                            : item.supplier_prices[header]) 
                                                                                        : '-'
                                                                                )}
                                                                            </TableCell>
                                                                        ))}
                                                                        <TableCell className="text-right align-top">
                                                                            {editingItem === item.id ? (
                                                                                <div className="flex gap-2 justify-end">
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="default"
                                                                                        onClick={handleSaveEdit}
                                                                                        disabled={updateItemMutation.isPending}
                                                                                    >
                                                                                        {updateItemMutation.isPending ? (
                                                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                                                        ) : (
                                                                                            <Save className="w-4 h-4" />
                                                                                        )}
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="outline"
                                                                                        onClick={handleCancelEdit}
                                                                                    >
                                                                                        <X className="w-4 h-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex gap-2 justify-end">
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="outline"
                                                                                        onClick={() => handleEdit(item)}
                                                                                    >
                                                                                        <Edit className="w-4 h-4" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="destructive"
                                                                                        onClick={() => handleDeleteRequest(item)}
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add New Item Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-[600px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>הוספת מוצר חדש</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-product-name">שם המוצר</Label>
                            <Input
                                id="new-product-name"
                                value={newItemData.product_name}
                                onChange={(e) => setNewItemData({ ...newItemData, product_name: e.target.value })}
                                placeholder="הזן שם מוצר"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-category">קטגוריה ראשית</Label>
                                <Select
                                    value={newItemData.category}
                                    onValueChange={(value) => setNewItemData({ ...newItemData, category: value, sub_category: '' })}
                                >
                                    <SelectTrigger id="new-category">
                                        <SelectValue placeholder="בחר קטגוריה" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALL_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-sub-category">תת קטגוריה</Label>
                                <Select
                                    value={newItemData.sub_category}
                                    onValueChange={(value) => setNewItemData({ ...newItemData, sub_category: value })}
                                    disabled={!newItemData.category}
                                >
                                    <SelectTrigger id="new-sub-category">
                                        <SelectValue placeholder="בחר תת קטגוריה" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {newItemData.category && CATEGORIES[newItemData.category]?.map(subCat => (
                                            <SelectItem key={subCat} value={subCat}>{subCat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>מחירי ספקים קיימים (₪)</Label>
                            </div>

                            {supplierHeaders.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto p-2 border rounded-md bg-gray-50">
                                    {supplierHeaders.map(supplier => (
                                        <div key={supplier} className="space-y-1">
                                            <Label htmlFor={`new-price-${supplier}`} className="text-sm text-gray-600">{supplier}</Label>
                                            <Input
                                                id={`new-price-${supplier}`}
                                                type="number"
                                                step="0.01"
                                                value={newItemData.supplier_prices?.[supplier] ?? ''}
                                                onChange={(e) => handleNewItemPriceChange(supplier, e.target.value)}
                                                placeholder="0.00"
                                                className="bg-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t pt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <Label>הוספת ספקים חדשים</Label>
                                    <Button 
                                        type="button" 
                                        size="sm" 
                                        onClick={handleAddSupplierField}
                                        variant="outline"
                                    >
                                        <Plus className="w-3 h-3 ml-1" />
                                        הוסף ספק
                                    </Button>
                                </div>

                                {additionalSuppliers.length > 0 ? (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                                        {additionalSuppliers.map((supplier, index) => (
                                            <div key={index} className="flex items-end gap-2 p-2 bg-blue-50 rounded">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">שם ספק</Label>
                                                    <Input
                                                        placeholder="הזן שם ספק..."
                                                        value={supplier.name}
                                                        onChange={(e) => handleSupplierFieldChange(index, 'name', e.target.value)}
                                                        className="bg-white"
                                                    />
                                                </div>
                                                <div className="w-28 space-y-1">
                                                    <Label className="text-xs">מחיר (₪)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={supplier.price}
                                                        onChange={(e) => handleSupplierFieldChange(index, 'price', e.target.value)}
                                                        className="bg-white"
                                                    />
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    onClick={() => handleRemoveSupplierField(index)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-3 text-sm text-gray-500 border-2 border-dashed rounded-lg">
                                        לחץ על "הוסף ספק" להוספת ספק חדש
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            ביטול
                        </Button>
                        <Button 
                            onClick={handleAddNewItem}
                            disabled={createItemMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {createItemMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    מוסיף...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 ml-2" />
                                    הוסף מוצר
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SyncConfirmationDialog
                open={showSyncDialog}
                onClose={() => {
                    setShowSyncDialog(false);
                    setProposedChanges(null);
                }}
                syncResults={proposedChanges}
                onConfirm={handleConfirmSync}
                isConfirming={isConfirmingSyncLoading}
            />

            <SyncConfirmationDialog
                open={showSyncDialog}
                onClose={() => {
                    setShowSyncDialog(false);
                    setProposedChanges(null);
                }}
                syncResults={proposedChanges}
                onConfirm={handleConfirmSync}
                isConfirming={isConfirmingSyncLoading}
            />

            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                        <AlertDialogDescription>
                            פעולה זו תמחק את המוצר <span className="font-bold">"{itemToDelete?.product_name}"</span> לצמיתות. לא ניתן לשחזר פעולה זו.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteConfirm} 
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteItemMutation.isPending}
                        >
                            {deleteItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            כן, מחק
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}