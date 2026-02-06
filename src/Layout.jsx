import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Plane, LayoutDashboard, LogOut, ChevronDown, Settings, User as UserIcon, Menu, Clock, Stethoscope, ChevronsUpDown, ClipboardList, MessageSquare, FileText, BedDouble, PackagePlus, DollarSign, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditProfileForm from "@/components/profile/EditProfileForm";


const navigationItems = [
        {
          title: "ניהול רפואי",
          icon: Stethoscope,
          isDropdown: true,
          subItems: [
              {
                  title: "פרוטוקולים",
                  url: createPageUrl("Protocols"),
                  icon: FileText,
              },
              {
                  title: "ניהול אשפוז",
                  url: createPageUrl("Hospitalization"),
                  icon: BedDouble,
              },
              {
                  title: "ניהול מלאי",
                  url: createPageUrl("InventoryManagement"),
                  icon: PackagePlus,
              },
          ]
        },
        {
          title: "יומן מרפאה",
          icon: Calendar,
          isDropdown: true,
          subItems: [
              {
                  title: "לוח תורים",
                  url: createPageUrl("ClinicCalendar"),
                  icon: Calendar,
              },
              {
                  title: "ניהול לקוחות",
                  url: createPageUrl("ClientsManagement"),
                  icon: UserIcon,
              },
          ]
        },
        {
          title: "מעקב מרפאט",
          url: createPageUrl("MarpetTracking"),
          icon: ClipboardList,
        },
      ];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForceProfileDialog, setShowForceProfileDialog] = useState(false);

  // Redirect to Schedule page on initial load if at root
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      navigate(createPageUrl("Schedule"), { replace: true });
    }
  }, [location.pathname, navigate]);


  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const user = await base44.auth.me();

        // DEBUG: Logging for permissions diagnosis
        console.log('=== Layout User Debug ===');
        console.log('Full user object:', user);
        console.log('user.role:', user.role);
        console.log('user.permissions:', user.permissions);
        console.log('typeof user.permissions:', typeof user.permissions);
        console.log('========================');

        setCurrentUser(user);
        
        // Force profile completion for new, approved users
        if (user && !user.display_name && user.is_approved) {
            setShowForceProfileDialog(true);
        }

      } catch (error) {
        console.error("Failed to load user data:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, []);

  const { data: unreadReferrals } = useQuery({
      queryKey: ['unreadReferrals', currentUser?.id],
      queryFn: async () => {
          if (!currentUser) return [];

          const filter = currentUser.job === 'doctor'
              ? { target_doctor_id: currentUser.id, status: 'open' }
              : { referring_user_id: currentUser.id, status: 'answered' };
          
          const results = await base44.entities.VetReferral.filter(filter);
          return results;
      },
      enabled: !!currentUser,
      refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: pendingShortages } = useQuery({
      queryKey: ['pendingInventoryShortages'],
      queryFn: async () => {
          const results = await base44.entities.InventoryShortage.filter({ status: 'needed' });
          return results;
      },
      enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_orders')),
      refetchInterval: 30000,
  });

  const { data: pendingOrApprovedClinicCases } = useQuery({
      queryKey: ['pendingOrApprovedClinicCases'],
      queryFn: async () => {
          // Fetch only the 10 most recently updated cases (same as MarpetTracking page)
          const recentCases = await base44.entities.ClinicCase.list('-updated_date', 10);
          // Filter for pending or approved cases
          return recentCases.filter(c => c.status === 'pending' || c.status === 'approved');
      },
      enabled: !!currentUser,
      refetchInterval: 30000,
  });

  const hasUnreadReferrals = unreadReferrals && unreadReferrals.length > 0;
  const hasPendingShortages = pendingShortages && pendingShortages.length > 0;
  const hasPendingOrApprovedClinicCases = pendingOrApprovedClinicCases && pendingOrApprovedClinicCases.length > 0;

  const handleLogin = async () => {
    try {
      await base44.auth.redirectToLogin();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      setCurrentUser(null);
      await base44.auth.logout();
      base44.auth.redirectToLogin();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };
  
  const handleProfileSaveSuccess = (updatedUser) => {
      setCurrentUser(updatedUser);
      setShowForceProfileDialog(false);
      // Reload to ensure all components get the new user data and redirect to main page
      window.location.reload(); 
  };
  
  const handleBackNavigation = () => {
      // The key property on location changes for each new navigation.
      // If the key is 'default', it means there's no history (e.g., new tab, after refresh).
      if (location.key !== 'default') {
          navigate(-1);
      } else {
          // Fallback to the main schedule page if there's no history.
          navigate(createPageUrl("Schedule"));
      }
  };

  const navItemsForCurrentUser = navigationItems.filter(item => {
    if (item.adminOnly && (!currentUser || currentUser.role !== 'admin')) return false;
    if (item.permission) {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return currentUser.permissions?.includes(item.permission);
    }
    return true;
  });

  const displayName = currentUser?.display_name || currentUser?.full_name || "משתמש";
  const displayImage = currentUser?.profile_image;
  // Check if user has any management permissions
  const hasManagementAccess = currentUser?.role === 'admin' || 
                               (currentUser?.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white/95 md:backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main header row */}
          <div className="flex items-center justify-between h-16">
            
            <div className="flex items-center gap-6">
              <Link 
                to={createPageUrl("Schedule")}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/7c4ff2a29_-.png"
                  alt="LoVeT לוגo"
                  className="h-16 w-auto"
                />
              </Link>
              
              <nav className="hidden md:flex items-center gap-2">
                {navItemsForCurrentUser.map((item) => {
                    if (item.isDropdown) {
                        const isPersonalActive = item.subItems.some(sub => location.pathname === sub.url);
                        return (
                            <DropdownMenu key={item.title}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                            isPersonalActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.title}
                                        <ChevronDown className="w-4 h-4 opacity-70" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {item.subItems.map((subItem) => (
                                        <DropdownMenuItem key={subItem.title} asChild>
                                            <Link to={subItem.url} className="flex items-center gap-2 cursor-pointer w-full justify-start">
                                                <span>{subItem.title}</span>
                                                <subItem.icon className="w-4 h-4 text-gray-500"/>
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        );
                    }
                    
                    // Special handling for MarpetTracking with indicator
                    if (item.url === createPageUrl("MarpetTracking")) {
                        return (
                          <Link
                            key={item.title}
                            to={item.url}
                            className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              location.pathname === item.url
                                ? 'bg-purple-50 text-purple-700'
                                : `text-gray-600 hover:bg-gray-100`
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.title}
                            {hasPendingOrApprovedClinicCases && (
                                <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white"></span>
                            )}
                          </Link>
                        );
                    }
                    
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          location.pathname === item.url
                            ? 'bg-purple-50 text-purple-700'
                            : `text-gray-600 hover:bg-gray-100`
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.title}
                      </Link>
                    )
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
              ) : currentUser ? (
                <>
                  <div className="hidden md:flex items-center gap-4">
                    {/* The Vet Referrals and Management links were moved to a secondary row */}
                    {/* Only the user profile dropdown remains in this section for desktop */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                           <Avatar className="w-8 h-8">
                              <AvatarImage src={displayImage} />
                              <AvatarFallback className="bg-purple-100 text-purple-600 font-semibold">
                                {getInitials(displayName)}
                              </AvatarFallback>
                            </Avatar>
                          <span className="hidden sm:inline font-medium text-gray-700">{displayName}</span>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                           <Link to={createPageUrl("Schedule")} className="flex items-center gap-2 w-full justify-start">
                             <Calendar className="w-4 h-4" />
                             <span>לוח משמרות</span>
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link to={createPageUrl("Constraints")} className="flex items-center gap-2 w-full justify-start">
                             <Settings className="w-4 h-4" />
                             <span>אילוצים</span>
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link to={createPageUrl("VacationRequests")} className="flex items-center gap-2 cursor-pointer">
                             <Plane className="w-4 h-4" />
                             <span>בקשת חופשה</span>
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link to={createPageUrl("TimeClock")} className="flex items-center gap-2 w-full justify-start">
                             <Clock className="w-4 h-4" />
                             <span>שעון נוכחות</span>
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                           <Link to={createPageUrl("MyProfile")} className="flex items-center gap-2 w-full justify-start">
                             <UserIcon className="w-4 h-4" />
                             <span>הפרופיל שלי</span>
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer flex items-center gap-2 w-full justify-start">
                          <LogOut className="w-4 h-4" />
                          <span>התנתקות</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Mobile Menu */}
                  <div className="md:hidden">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Menu className="h-6 w-6" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[300px] sm:w-[350px]" dir="rtl">
                          <SheetHeader className="border-b pb-4">
                              <SheetTitle>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={displayImage} />
                                    <AvatarFallback className="bg-purple-100 text-purple-600 font-semibold">
                                      {getInitials(displayName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-base font-medium leading-none">{displayName}</p>
                                    <p className="text-sm leading-none text-muted-foreground">{currentUser.email}</p>
                                  </div>
                                </div>
                              </SheetTitle>
                          </SheetHeader>
                          <nav className="flex flex-col gap-2 mt-6">
                            {/* Vet Referrals button - prominent placement in mobile menu */}
                             <Link
                                to={createPageUrl("VetReferrals")}
                                className={`relative flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                                  location.pathname === createPageUrl("VetReferrals")
                                  ? 'bg-blue-100 text-blue-800'
                                  : `text-gray-700 hover:bg-gray-100`
                                }`}
                              >
                                <MessageSquare className="w-5 h-5" />
                                פניות לוטרינר
                                {hasUnreadReferrals && (
                                    <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>
                                )}
                              </Link>
                            {hasManagementAccess && (
                                <>
                                  <Link
                                    to={createPageUrl("AdminDashboard")}
                                    className={`relative flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                                      location.pathname === createPageUrl("AdminDashboard")
                                      ? 'bg-purple-100 text-purple-800'
                                      : `text-gray-700 hover:bg-gray-100`
                                    }`}
                                  >
                                    <LayoutDashboard className="w-5 h-5" />
                                    ניהול
                                    {hasPendingShortages && (
                                        <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white"></span>
                                    )}
                                  </Link>
                                </>
                            )}
                            {navItemsForCurrentUser.map((item) => {
                                if (item.isDropdown) {
                                    const isAnySubItemActive = item.subItems.some(sub => location.pathname === sub.url);
                                    return (
                                        <Collapsible key={item.title} className="w-full" defaultOpen={isAnySubItemActive}>
                                            <CollapsibleTrigger asChild>
                                                 <button className="flex w-full items-center justify-between gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className="w-5 h-5" />
                                                        {item.title}
                                                    </div>
                                                    <ChevronsUpDown className="w-4 h-4" />
                                                </button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="space-y-1 pt-1 pr-6">
                                                {item.subItems.map(subItem => (
                                                    <Link
                                                        key={subItem.title}
                                                        to={subItem.url}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                                        location.pathname === subItem.url
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : `text-gray-700 hover:bg-gray-100`
                                                        }`}
                                                    >
                                                        <subItem.icon className="w-5 h-5" />
                                                        {subItem.title}
                                                    </Link>
                                                ))}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )
                                }

                                // Special handling for MarpetTracking with indicator in mobile
                                if (item.url === createPageUrl("MarpetTracking")) {
                                    return (
                                      <Link
                                        key={item.title}
                                        to={item.url}
                                        className={`relative flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                                          location.pathname === item.url
                                          ? 'bg-purple-100 text-purple-800'
                                          : `text-gray-700 hover:bg-gray-100`
                                        }`}
                                      >
                                        <item.icon className="w-5 h-5" />
                                        {item.title}
                                        {hasPendingOrApprovedClinicCases && (
                                            <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white"></span>
                                        )}
                                      </Link>
                                    );
                                }

                                return (
                                  <Link
                                    key={item.title}
                                    to={item.url}
                                    className={`relative flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                                      location.pathname === item.url
                                      ? 'bg-purple-100 text-purple-800'
                                      : `text-gray-700 hover:bg-gray-100`
                                    }`}
                                  >
                                    <item.icon className="w-5 h-5" />
                                    {item.title}
                                  </Link>
                                )
                            })}
                             <div className="h-px w-full bg-gray-200 my-4"></div>
                             <Link to={createPageUrl("TimeClock")} className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
                               <Clock className="w-5 h-5" />
                               <span>שעון נוכחות</span>
                             </Link>
                             <Link to={createPageUrl("MyProfile")} className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100">
                               <UserIcon className="w-5 h-5" />
                               <span>הפרופיל שלי</span>
                             </Link>
                             <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 text-right">
                               <LogOut className="w-5 h-5" />
                               התנתקות
                             </button>
                          </nav>
                      </SheetContent>
                    </Sheet>
                  </div>

                </>
              ) : (
                <Button onClick={handleLogin} className="bg-purple-600 hover:bg-purple-700">
                  התחברות
                </Button>
              )}
            </div>
          </div>
          
          {/* Secondary row for Messages and Management buttons - Only on desktop */}
          {currentUser && (
            <div className="hidden md:flex items-center justify-end gap-3 pb-3 border-t border-gray-100 pt-2">
              {/* Messages button - Changed from "פניות לוטרינר" */}
              <Link
                  to={createPageUrl("VetReferrals")}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                      location.pathname === createPageUrl("VetReferrals")
                          ? 'bg-blue-600 text-white border-blue-600'
                          : `text-blue-600 border-blue-300 hover:bg-blue-50`
                  }`}
              >
                  <MessageSquare className="w-4 h-4" />
                  הודעות
                  {hasUnreadReferrals && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 ring-2 ring-white"></span>
                      </span>
                  )}
              </Link>

              {hasManagementAccess && (
                <Link
                  to={createPageUrl("AdminDashboard")}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                    location.pathname === createPageUrl("AdminDashboard")
                      ? 'bg-purple-600 text-white border-purple-600'
                      : `text-purple-600 border-purple-300 hover:bg-purple-50`
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  ניהול
                  {hasPendingShortages && (
                    <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white"></span>
                  )}
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-6">
         {/* Modal for forcing profile update */}
        <Dialog open={showForceProfileDialog}>
            <DialogContent dir="rtl" className="sm:max-w-[600px]" hideCloseButton={true}>
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">ברוך/ה הבא/ה! יש להשלים את פרטי הפרופיל</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <EditProfileForm 
                        user={currentUser}
                        onSaveSuccess={handleProfileSaveSuccess}
                        // No onCancel prop is passed, so the button will be hidden
                    />
                </div>
            </DialogContent>
        </Dialog>
        
        {currentUser && currentUser.role !== 'admin' && !currentUser.is_approved ? (
           <div className="flex items-center justify-center h-full pt-16">
              <Card className="max-w-md w-full text-center shadow-lg" dir="rtl">
                <CardHeader>
                  <div className="mx-auto bg-yellow-100 p-3 rounded-full w-fit">
                    <Clock className="w-10 h-10 text-yellow-500" />
                  </div>
                  <CardTitle className="mt-4 text-2xl font-bold text-gray-800">החשבון ממתין לאישור</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">
                    תודה על ההרשמה! החשבון שלך נשלח לבדיקה ויאושר על ידי מנהל המערכת בקרוב. תקבל/י הודעה למייל כשהחשבון יאושר.
                  </p>
                  <Button variant="outline" onClick={handleLogout}>
                    התנתק/י וחזור/י מאוחר יותר
                  </Button>
                </CardContent>
              </Card>
            </div>
        ) : (
          <>
            {currentUser && (
                <div className="mb-4">
                  <Button variant="outline" onClick={handleBackNavigation}>
                    <ArrowRight className="w-4 h-4 ml-2" />
                    חזרה
                  </Button>
                </div>
            )}
            {children}
            
            {/* Logo Footer */}
            <div className="mt-16 mb-8 flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-white rounded-lg px-8 py-4 border-2 border-blue-100 shadow-md">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/a149349dd_ClinicAIVet.png"
                    alt="ClinicAI.Vet Logo"
                    className="h-24 w-auto opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}