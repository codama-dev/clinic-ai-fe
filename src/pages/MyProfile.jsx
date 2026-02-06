import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Mail, Phone, MapPin, Camera, Loader2, FileText, Cake } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditProfileForm from "../components/profile/EditProfileForm";
import { Skeleton } from "@/components/ui/skeleton";

const JOB_NAMES = { doctor: "רופא/ה", assistant: "אסיסטנט/ית", receptionist: "קבלה", admin: "מנהל מערכת" };
const JOB_COLORS = { doctor: "bg-purple-100 text-purple-800", assistant: "bg-blue-100 text-blue-800", receptionist: "bg-orange-100 text-orange-800", admin: "bg-red-100 text-red-800" };

const ProfileDetail = ({ icon, label, value }) => {
  if (!value) return null;
  const Icon = icon;
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
      <div>
        <span className="font-semibold text-gray-500">{label}</span>
        <p className="text-gray-700">{value}</p>
      </div>
    </div>
  );
};

export default function MyProfilePage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleSaveSuccess = (updatedUser) => {
    setUser(updatedUser);
    setIsEditDialogOpen(false);
    // Reloading the page to ensure the avatar updates correctly due to caching or other dependencies.
    // In a production app, a more granular state update might be preferred.
    window.location.reload(); 
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;

    setIsUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      const updatedUserData = { profile_image: file_url };
      await User.updateMyUserData(updatedUserData);

      // Reloading the page to ensure the avatar updates correctly due to caching or other dependencies.
      window.location.reload();
      
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setIsUploadingImage(false);
  };
  
  const displayName = user?.display_name || user?.full_name || "משתמש";
  const displayEmail = user?.email || "";
  const displayImage = user?.profile_image;

  if (isLoading) {
    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader className="text-center p-8 border-b relative">
                    <Skeleton className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-lg"/>
                    <Skeleton className="h-8 w-48 mx-auto mt-4"/>
                    <Skeleton className="h-4 w-56 mx-auto mt-2"/>
                </CardHeader>
                <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl border-t-4 border-purple-500 overflow-hidden">
        <CardHeader className="text-center p-8 bg-gray-50/50 border-b relative">
           <Button 
                variant="outline" 
                className="absolute top-4 right-4" 
                onClick={() => setIsEditDialogOpen(true)}
            >
                <Edit className="w-4 h-4 ml-2" />
                עריכת פרופיל
            </Button>
          <div className="relative group w-32 h-32 mx-auto">
            <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
              <AvatarImage src={displayImage} />
              <AvatarFallback className="bg-purple-100 text-purple-600 font-semibold text-4xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <label htmlFor="profile-picture-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {isUploadingImage ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
              <input
                id="profile-picture-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
              />
            </label>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mt-4">{displayName}</h1>
          {user?.job && (
            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mt-2 ${JOB_COLORS[user.job]}`}>
              {JOB_NAMES[user.job]}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-8 grid md:grid-cols-2 gap-x-12 gap-y-8">
            <ProfileDetail icon={Mail} label="כתובת אימייל" value={displayEmail} />
            <ProfileDetail icon={Phone} label="מספר טלפון" value={user?.phone} />
            <ProfileDetail icon={FileText} label="תעודת זהות" value={user?.id_number} />
            <ProfileDetail icon={Cake} label="תאריך לידה" value={user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('he-IL') : null} />
            <ProfileDetail icon={MapPin} label="כתובת" value={user?.address} />
        </CardContent>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
            <DialogHeader>
                <DialogTitle>עריכת פרטים אישיים</DialogTitle>
            </DialogHeader>
            <div className="py-4">
               <EditProfileForm 
                    user={user}
                    onSaveSuccess={handleSaveSuccess}
                    onCancel={() => setIsEditDialogOpen(false)}
               />
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}