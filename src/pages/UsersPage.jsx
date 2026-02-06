import React, { useState, useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, Users, RefreshCw } from "lucide-react";
import UserForm from "../components/users/UserForm";
import UserCard from "../components/users/UserCard";
import ExternalUserCard from "../components/users/ExternalUserCard";
import ExternalEmployeeForm from "../components/users/ExternalEmployeeForm";
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
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [externalEmployees, setExternalEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingExternal, setEditingExternal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const me = await base44.auth.me();
      setCurrentUser(me);
      
      const access = me.role === 'admin' || me.permissions?.includes('manage_employees');
      setHasAccess(access);

      if (access) {
        const [userData, externalData] = await Promise.all([
            base44.entities.User.list('-created_date'),
            base44.entities.ExternalEmployee.list('-created_date')
        ]);
        setUsers(userData);
        setExternalEmployees(externalData);
      } else {
        setUsers([]);
        setExternalEmployees([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setCurrentUser(null);
      setUsers([]);
      setExternalEmployees([]);
      setHasAccess(false);
    }
    setIsLoading(false);
  };

  const handleSyncPublicProfiles = async () => {
    setIsSyncing(true);
    try {
      // Fetch all users
      const allUsers = await base44.entities.User.list();
      
      // Fetch existing public profiles
      const existingProfiles = await base44.entities.PublicProfile.list();
      const existingProfileMap = new Map(existingProfiles.map(p => [p.user_id, p]));
      
      let created = 0;
      let updated = 0;
      let skipped = 0;
      
      for (const user of allUsers) {
        const profileData = {
          user_id: user.id,
          email: user.email,
          display_name: user.display_name || user.full_name,
          job: user.job,
          id_number: user.id_number,
          birthday_date: user.date_of_birth || null,
          is_active: user.is_active !== false // true if undefined or true, false if explicitly false
        };
        
        const existingProfile = existingProfileMap.get(user.id);
        
        if (existingProfile) {
          // Check if update is needed
          const needsUpdate = 
            existingProfile.email !== profileData.email ||
            existingProfile.display_name !== profileData.display_name ||
            existingProfile.job !== profileData.job ||
            existingProfile.id_number !== profileData.id_number ||
            existingProfile.birthday_date !== profileData.birthday_date ||
            existingProfile.is_active !== profileData.is_active;
          
          if (needsUpdate) {
            await base44.entities.PublicProfile.update(existingProfile.id, profileData);
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Create new profile
          await base44.entities.PublicProfile.create(profileData);
          created++;
        }
      }
      
      toast.success(`סנכרון הושלם: ${created} נוצרו, ${updated} עודכנו, ${skipped} ללא שינוי.`);
      
    } catch (error) {
      console.error("Error syncing public profiles:", error);
      toast.error("שגיאה בסנכרון פרופילים ציבוריים.");
    }
    setIsSyncing(false);
  };

  const handleUserSubmit = async (userData) => {
    try {
      if (editingUser) {
        const { display_name, phone, job, permissions, hire_date, is_active, is_approved, date_of_birth, id_number } = userData;
        await base44.entities.User.update(editingUser.id, { 
            display_name, phone, job, permissions, hire_date, is_active, is_approved, date_of_birth, id_number
        });
        
        // Update corresponding PublicProfile
        const profiles = await base44.entities.PublicProfile.filter({ user_id: editingUser.id });
        if (profiles.length > 0) {
          await base44.entities.PublicProfile.update(profiles[0].id, {
            email: editingUser.email,
            display_name: display_name,
            job: job,
            id_number: userData.id_number || editingUser.id_number,
            birthday_date: userData.date_of_birth || editingUser.date_of_birth || null,
            is_active: is_active
          });
        }
      }
      setShowUserForm(false);
      setEditingUser(null);
      loadData();
      toast.success("המשתמש עודכן בהצלחה.");
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("שגיאה בשמירת המשתמש.");
    }
  };
  
  const handleExternalSubmit = async (employeeData) => {
    try {
        if (editingExternal) {
            await base44.entities.ExternalEmployee.update(editingExternal.id, employeeData);
        } else {
            await base44.entities.ExternalEmployee.create(employeeData);
        }
        setShowExternalForm(false);
        setEditingExternal(null);
        loadData();
        toast.success("עובד חיצוני נשמר בהצלחה.");
    } catch (error) {
      console.error("Error saving external employee:", error);
      toast.error("שגיאה בשמירת העובד החיצוני.");
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleEditExternal = (employee) => {
    setEditingExternal(employee);
    setShowExternalForm(true);
  };

  const handleDeleteRequest = (item, type) => {
    setItemToDelete({ item, type });
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'user') {
        await base44.entities.User.delete(itemToDelete.item.id);
        // Also delete corresponding PublicProfile
        const profiles = await base44.entities.PublicProfile.filter({ user_id: itemToDelete.item.id });
        for (const profile of profiles) {
          await base44.entities.PublicProfile.delete(profile.id);
        }
        toast.success("המשתמש נמחק בהצלחה.");
      } else if (itemToDelete.type === 'external') {
        await base44.entities.ExternalEmployee.delete(itemToDelete.item.id);
        toast.success("העובד החיצוני נמחק בהצלחה.");
      }
      setItemToDelete(null);
      loadData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("שגיאה במחיקת הפריט.");
    }
  };

  const allPeople = [
      ...users.map(u => ({...u, type: 'user', name: u.display_name || u.full_name})),
      ...externalEmployees.map(e => ({...e, type: 'external', name: e.name}))
  ];

  const filteredPeople = allPeople.filter(person => 
      person.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activePeople = filteredPeople.filter(person => person.is_active !== false);
  const inactivePeople = filteredPeople.filter(person => person.is_active === false);

  if (isLoading) {
    return <p>טוען נתונים...</p>;
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
            עמוד זה מיועד למנהלי מערכת או למשתמשים בעלי הרשאת "ניהול עובדים ומשתמשים".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">ניהול צוות</h1>
                <p className="text-gray-500">ניהול משתמשי מערכת ועובדים חיצוניים</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSyncPublicProfiles} 
                disabled={isSyncing}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'מסנכרן...' : 'סנכרן פרופילים'}
              </Button>
              <Button onClick={() => setShowExternalForm(true)}>
                  <Users className="w-4 h-4 ml-2" />
                  הוספת עובד חיצוני
              </Button>
            </div>
        </div>

        <Dialog open={showUserForm} onOpenChange={(isOpen) => { if (!isOpen) setEditingUser(null); setShowUserForm(isOpen); }}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
              <DialogHeader>
                  <DialogTitle>עריכת משתמש רשום</DialogTitle>
              </DialogHeader>
              <div className="py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                <UserForm
                  user={editingUser}
                  onSubmit={handleUserSubmit}
                  onCancel={() => setShowUserForm(false)}
                />
              </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showExternalForm} onOpenChange={(isOpen) => { if (!isOpen) setEditingExternal(null); setShowExternalForm(isOpen); }}>
          <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                  <DialogTitle>{editingExternal ? 'עריכת עובד חיצוני' : 'הוספת עובד חיצוני'}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <ExternalEmployeeForm
                  employee={editingExternal}
                  onSubmit={handleExternalSubmit}
                  onCancel={() => setShowExternalForm(false)}
                />
              </div>
          </DialogContent>
        </Dialog>


        <div className="mb-6 relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש עובדים ומשתמשים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white"
            />
        </div>

        {/* Active Employees */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            עובדים פעילים ({activePeople.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePeople.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-8">אין עובדים פעילים</p>
            ) : (
              activePeople.map((person) => 
                person.type === 'user' ? (
                  <UserCard
                    key={`user-${person.id}`}
                    user={person}
                    onEdit={() => handleEditUser(person)}
                    onDelete={() => handleDeleteRequest(person, 'user')}
                    onStatusChange={loadData}
                  />
                ) : (
                  <ExternalUserCard
                    key={`ext-${person.id}`}
                    employee={person}
                    onEdit={() => handleEditExternal(person)}
                    onDelete={() => handleDeleteRequest(person, 'external')}
                    onStatusChange={loadData}
                  />
                )
              )
            )}
          </div>
        </div>

        {/* Inactive Employees */}
        {inactivePeople.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              עובדים לא פעילים ({inactivePeople.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
              {inactivePeople.map((person) => 
                person.type === 'user' ? (
                  <UserCard
                    key={`user-${person.id}`}
                    user={person}
                    onEdit={() => handleEditUser(person)}
                    onDelete={() => handleDeleteRequest(person, 'user')}
                    onStatusChange={loadData}
                  />
                ) : (
                  <ExternalUserCard
                    key={`ext-${person.id}`}
                    employee={person}
                    onEdit={() => handleEditExternal(person)}
                    onDelete={() => handleDeleteRequest(person, 'external')}
                    onStatusChange={loadData}
                  />
                )
              )}
            </div>
          </div>
        )}

        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את {itemToDelete?.type === 'user' ? 'המשתמש' : 'העובד'} <span className="font-bold">{itemToDelete?.item?.name}</span> לצמיתות. לא ניתן לשחזר פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                כן, מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}