import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, Plus, FileText, Trash2, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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

const defaultPriceListLinks = [
  {
    id: 'supplier-prices',
    title: 'מחירון ספקים (בסיס)',
    url: createPageUrl("SupplierPriceListPage"),
    icon: Package,
    description: 'מחירון הבסיס - ניהול מחירי ספקים וייבוא מחירונים',
    isDefault: true
  },
  {
    id: 'client-prices',
    title: 'מחירון לקוחות',
    url: createPageUrl("ClientPriceListPage"),
    icon: DollarSign,
    description: 'מחירון ללקוחות על בסיס מחירון ספקים',
    isDefault: true
  }
];

export default function PriceListsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [deleteList, setDeleteList] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data: customPriceLists = [], isLoading } = useQuery({
    queryKey: ['customPriceLists'],
    queryFn: () => base44.entities.PriceList.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PriceList.create(data),
    onSuccess: (newList) => {
      toast.success("המחירון נוצר בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ['customPriceLists'] });
      setShowCreateDialog(false);
      setFormData({ name: '', description: '' });
      // Navigate to the new price list page to import items
      window.location.href = createPageUrl("CustomPriceListPage") + `?id=${newList.id}`;
    },
    onError: () => {
      toast.error("שגיאה ביצירת המחירון");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PriceList.update(id, data),
    onSuccess: () => {
      toast.success("המחירון עודכן בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ['customPriceLists'] });
      setShowCreateDialog(false);
      setEditingList(null);
      setFormData({ name: '', description: '' });
    },
    onError: () => {
      toast.error("שגיאה בעדכון המחירון");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Delete all items first
      const items = await base44.entities.PriceListItem.filter({ price_list_id: id });
      await Promise.all(items.map(item => base44.entities.PriceListItem.delete(item.id)));
      // Then delete the price list
      await base44.entities.PriceList.delete(id);
    },
    onSuccess: () => {
      toast.success("המחירון נמחק בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ['customPriceLists'] });
      setDeleteList(null);
    },
    onError: () => {
      toast.error("שגיאה במחיקת המחירון");
    }
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("יש למלא שם מחירון");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      toast.error("יש למלא שם מחירון");
      return;
    }
    updateMutation.mutate({ id: editingList.id, data: formData });
  };

  const handleEdit = (list) => {
    setEditingList(list);
    setFormData({ name: list.name, description: list.description || '' });
    setShowCreateDialog(true);
  };

  const handleOpenCreate = () => {
    setEditingList(null);
    setFormData({ name: '', description: '' });
    setShowCreateDialog(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">מחירונים</h1>
          <p className="text-gray-500 mt-2">ניהול מחירוני ספקים, לקוחות ומחירונים מותאמים אישית</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 ml-2" />
          מחירון חדש
        </Button>
      </div>

      <div className="space-y-6">
        {/* Default Price Lists */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">מחירונים ברירת מחדל</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {defaultPriceListLinks.map((link) => (
              <Link key={link.id} to={link.url}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-300">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <link.icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{link.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{link.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Custom Price Lists */}
        {customPriceLists.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">מחירונים מותאמים אישית</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {customPriceLists.map((list) => (
                <Card key={list.id} className="h-full hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{list.name}</CardTitle>
                          {list.description && (
                            <p className="text-sm text-gray-500 mt-1">{list.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            handleEdit(list);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteList(list);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link to={createPageUrl("CustomPriceListPage") + `?id=${list.id}`}>
                      <Button variant="outline" className="w-full">
                        פתח מחירון
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8 text-gray-500">טוען...</div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingList ? 'עריכת מחירון' : 'יצירת מחירון חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם המחירון *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="לדוגמה: מחירון ביטוח, מחירון VIP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="תיאור קצר של המחירון..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingList(null);
              setFormData({ name: '', description: '' });
            }}>
              ביטול
            </Button>
            <Button 
              onClick={editingList ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingList ? 'עדכן' : 'צור מחירון'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteList} onOpenChange={() => setDeleteList(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את המחירון <span className="font-bold">"{deleteList?.name}"</span> ואת כל המוצרים שבו לצמיתות. לא ניתן לשחזר פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteList.id)}
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