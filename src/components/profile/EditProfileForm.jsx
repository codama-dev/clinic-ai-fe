import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name[0].toUpperCase();
};

const ANIMAL_AVATARS = [
    "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=200&h=200&fit=crop",
];

export default function EditProfileForm({ user, onSaveSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    phone: "",
    address: "",
    job: "assistant",
    profile_image: "",
    is_active: true,
    id_number: "",
    date_of_birth: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
        setFormData({
            email: user.email || '',
            profile_image: user.profile_image || '',
            job: user.job || 'assistant',
            is_active: user.is_active,
            display_name: user.display_name || "",
            phone: user.phone || "",
            address: user.address || "",
            id_number: user.id_number || "",
            date_of_birth: user.date_of_birth || "",
        });
    }
  }, [user]);
  
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_image: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };
  
  const handleAvatarSelect = (avatarUrl) => {
    setFormData(prev => ({ ...prev, profile_image: avatarUrl }));
    setShowAvatarPicker(false);
  };

  const handleSave = async () => {
    const { display_name, phone, id_number, address } = formData;
    if (!display_name || !phone || !id_number || !address) {
        toast({
            title: "שדות חובה חסרים",
            description: "יש למלא את כל השדות המסומנים בכוכבית (*).",
            variant: "destructive",
        });
        return;
    }

    setIsSaving(true);
    try {
        const dataToUpdate = {
            display_name: formData.display_name,
            phone: formData.phone,
            address: formData.address,
            id_number: formData.id_number,
            date_of_birth: formData.date_of_birth,
            job: formData.job,
            profile_image: formData.profile_image,
            is_active: true, // Automatically set user to active upon profile completion
        };
        
        await User.updateMyUserData(dataToUpdate);
        
        onSaveSuccess({ ...user, ...dataToUpdate });
    } catch (error) {
      console.error("Error saving profile:", error);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative">
                <Avatar className="w-24 h-24">
                    <AvatarImage src={formData.profile_image} />
                    <AvatarFallback className="text-3xl">{getInitials(formData.display_name || user.full_name)}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full cursor-pointer hover:bg-purple-700">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
            </div>
            <div className="flex-grow space-y-3 w-full">
                <div className="space-y-2">
                    <Label htmlFor="display_name">שם מלא <span className="text-red-500">*</span></Label>
                    <Input id="display_name" value={formData.display_name || ''} onChange={e => setFormData({...formData, display_name: e.target.value})} placeholder="ישראל ישראלי" />
                </div>
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="w-full sm:w-auto"
                >
                    {showAvatarPicker ? "סגור אווטארים" : "בחר אווטאר חיה"}
                </Button>
            </div>
        </div>
        
        {showAvatarPicker && (
            <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-5 gap-3">
                    {ANIMAL_AVATARS.map((avatarUrl, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleAvatarSelect(avatarUrl)}
                            className="p-2 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-purple-300"
                        >
                            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto">
                                <AvatarImage src={avatarUrl} />
                            </Avatar>
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="email">אימייל (לקריאה בלבד)</Label>
                <Input id="email" value={formData.email || ''} disabled />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">טלפון <span className="text-red-500">*</span></Label>
                <Input id="phone" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="050-1234567" />
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="address">כתובת <span className="text-red-500">*</span></Label>
                <Input id="address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="רחוב, מספר, עיר" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="id_number">תעודת זהות <span className="text-red-500">*</span></Label>
                <Input id="id_number" value={formData.id_number || ''} onChange={e => setFormData({...formData, id_number: e.target.value})} placeholder="123456789" />
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="date_of_birth">תאריך לידה</Label>
                <Input id="date_of_birth" type="date" value={formData.date_of_birth || ''} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="job">תפקיד</Label>
                <Select value={formData.job || 'assistant'} onValueChange={(value) => setFormData({...formData, job: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="assistant">אסיסטנט/ית</SelectItem>
                        <SelectItem value="doctor">רופא/ה</SelectItem>
                        <SelectItem value="receptionist">קבלה</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
            {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                    <X className="w-4 h-4 ml-2" />
                    ביטול
                </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                {isSaving ? "שומר..." : "שמור שינויים"}
            </Button>
        </div>
    </div>
  );
}