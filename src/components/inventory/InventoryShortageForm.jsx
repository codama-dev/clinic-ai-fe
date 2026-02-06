import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = ["תרופה", "ציוד מתכלה", "מזון רפואי", "ציוד משרדי", "אחר"];
const LOCATIONS = [
    "חדר בדיקות 1",
    "חדר בדיקות 2",
    "קבלה",
    "חדר ניתוח",
    "חדרי אשפוז",
    "מחסן קטן - ח. ניתוח"
];

export default function InventoryShortageForm({ onSubmit, onCancel, isSubmitting }) {
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [category, setCategory] = useState('');

    const { data: priceList = [], isLoading: isLoadingPriceList } = useQuery({
        queryKey: ['supplierPrices'],
        queryFn: () => base44.entities.SupplierPrice.list(),
    });

    const productOptions = useMemo(() => {
        if (!priceList || priceList.length === 0) return [];
        return priceList.map(p => ({
            name: p.product_name,
            category: p.category,
            sub_category: p.sub_category
        }));
    }, [priceList]);

    // Filter and group suggestions based on input
    const groupedSuggestions = useMemo(() => {
        let filtered;
        if (!itemName || itemName.length < 1) {
            // Show all products when field is empty and focused
            filtered = productOptions.slice(0, 30);
        } else {
            const searchTerm = itemName.toLowerCase();
            filtered = productOptions.filter(p => 
                p.name.toLowerCase().includes(searchTerm)
            ).slice(0, 30);
        }
        
        // Group by category and sub_category
        const grouped = {};
        filtered.forEach(product => {
            const category = product.category || 'ללא קטגוריה';
            const subCategory = product.sub_category || 'ללא תת קטגוריה';
            
            if (!grouped[category]) {
                grouped[category] = {};
            }
            if (!grouped[category][subCategory]) {
                grouped[category][subCategory] = [];
            }
            grouped[category][subCategory].push(product);
        });
        
        return grouped;
    }, [itemName, productOptions]);

    // Find the selected product's category and sub_category
    const selectedProduct = useMemo(() => {
        const product = productOptions.find(p => p.name === itemName);
        if (product) {
            setCategory(product.category || '');
            return { category: product.category, sub_category: product.sub_category };
        }
        return null;
    }, [itemName, productOptions]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!itemName.trim()) {
            alert("יש למלא שם פריט.");
            return;
        }
        if (!category) {
            alert("יש לבחור קטגוריה.");
            return;
        }
        if (!quantity || parseInt(quantity, 10) <= 0) {
            alert("יש למלא כמות נדרשת.");
            return;
        }
        if (!location) {
            alert("יש לבחור מיקום במרפאה.");
            return;
        }
        
        // Update inventory item if exists
        try {
            const inventoryItems = await base44.entities.InventoryItem.filter({ product_name: itemName });
            if (inventoryItems && inventoryItems.length > 0) {
                const item = inventoryItems[0];
                const reportedQuantity = quantity ? parseInt(quantity, 10) : 1;
                const newQuantity = Math.max(0, (item.current_quantity || 0) - reportedQuantity);
                await base44.entities.InventoryItem.update(item.id, {
                    current_quantity: newQuantity
                });
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
        }
        
        onSubmit({
            item_name: itemName,
            category: category,
            quantity_needed: parseInt(quantity, 10),
            notes,
            location: location,
        });
    };

    const handleSelectSuggestion = (productName) => {
        setItemName(productName);
        setShowSuggestions(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                    <Label htmlFor="item-name">שם הפריט החסר *</Label>
                    <Input
                        id="item-name"
                        value={itemName}
                        onChange={(e) => {
                            setItemName(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder={isLoadingPriceList ? "טוען מחירון..." : "הקלד שם פריט..."}
                        disabled={isLoadingPriceList}
                        required
                    />
                    
                    {/* Autocomplete suggestions dropdown */}
                    {showSuggestions && Object.keys(groupedSuggestions).length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
                            {Object.entries(groupedSuggestions).map(([category, subCategories]) => (
                                <div key={category}>
                                    <div className="sticky top-0 bg-purple-100 px-4 py-2 font-semibold text-sm text-purple-900 border-b">
                                        {category}
                                    </div>
                                    {Object.entries(subCategories).map(([subCategory, products]) => (
                                        <div key={subCategory}>
                                            <div className="bg-gray-50 px-6 py-1.5 text-xs font-medium text-gray-600">
                                                {subCategory}
                                            </div>
                                            {products.map((product, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    className="w-full text-right px-8 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                                                    onClick={() => handleSelectSuggestion(product.name)}
                                                >
                                                    {product.name}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="category">קטגוריה *</Label>
                    <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger id="category">
                            <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                            {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedProduct?.sub_category && (
                        <Badge variant="outline" className="text-sm mt-1">
                            תת קטגוריה: {selectedProduct.sub_category}
                        </Badge>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="quantity">כמות נדרשת *</Label>
                    <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="לדוגמה: 5"
                        min="1"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="location">מיקום במרפאה *</Label>
                    <Select value={location} onValueChange={setLocation} required>
                        <SelectTrigger id="location">
                            <SelectValue placeholder="בחר מיקום" />
                        </SelectTrigger>
                        <SelectContent>
                            {LOCATIONS.map(loc => (
                                <SelectItem key={loc} value={loc}>
                                    {loc}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">הערות</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="שם לקוח להזמנה או כל מידע נוסף רלוונטי (אופציונלי)"
                />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    <X className="w-4 h-4 ml-2" />
                    ביטול
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoadingPriceList}>
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 ml-2" />
                    )}
                    שליחת דיווח
                </Button>
            </div>
        </form>
    );
}