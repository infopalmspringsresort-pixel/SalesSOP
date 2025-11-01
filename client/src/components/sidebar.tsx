import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema-client";
import { useState } from "react";
import { sessionSync } from "@/lib/sessionSync";
import { useQueryClient } from "@tanstack/react-query";
import { 
  ChartLine, 
  Mail, 
  FileText, 
  ClipboardList, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  Calendar,
  Utensils,
  Building,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Enquiries", href: "/enquiries", icon: Mail },
  { name: "Bookings", href: "/bookings", icon: FileText },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Menu Management", href: "/menu-management", icon: Utensils, adminOnly: true },
  { name: "Room Management", href: "/room-management", icon: Building, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarContentProps {
  onItemClick?: () => void;
  isCollapsed?: boolean;
}

function SidebarContent({ onItemClick, isCollapsed = false }: SidebarContentProps) {
  const [location] = useLocation();
  const { user } = useAuth() as { user: User | undefined };
  const queryClient = useQueryClient();

  // Debug: Log user object to console
  if (user) {
    }

  // Check if current user is admin - handle nested user object structure
  const actualUser = user?.user || user; // Handle both nested and flat structures
  const isCurrentUserAdmin = Boolean(actualUser && 
    typeof actualUser === 'object' && 
    'role' in actualUser && 
    actualUser.role && 
    typeof actualUser.role === 'object' && 
    'name' in actualUser.role && 
    (actualUser.role as any).name === 'admin');
  
  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly) {
      return isCurrentUserAdmin;
    }
    if (item.name === 'Settings') {
      return isCurrentUserAdmin;
    }
    return true;
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return "U";
    return `${(firstName?.[0] || "").toUpperCase()}${(lastName?.[0] || "").toUpperCase()}`;
  };

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'sales': return 'Sales';
      case 'accounts': return 'Accounts';
      case 'gm': return 'General Manager';
      case 'md': return 'Managing Director';
      default: return 'User';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {getInitials(actualUser?.firstName, actualUser?.lastName)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {actualUser?.firstName || actualUser?.lastName ? 
                  `${actualUser.firstName || ''} ${actualUser.lastName || ''}`.trim() : 
                  'User'
                }
              </p>
              <p className="text-xs text-gray-500 truncate">
                {actualUser?.role?.displayName || actualUser?.role?.name || 'User'}
              </p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {getInitials(actualUser?.firstName, actualUser?.lastName)}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    "min-h-[44px] touch-manipulation", // Touch-friendly minimum size
                    isCollapsed && "justify-center", // Center icons when collapsed
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
                  )}
                  onClick={onItemClick}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-label={`Navigate to ${item.name}`}
                  role="menuitem"
                  tabIndex={0}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0", // Slightly larger icons for mobile
                    isActive ? "text-white" : "text-gray-500"
                  )} />
                  {!isCollapsed && <span className="truncate font-medium">{item.name}</span>}
                </Link>
              </li>
            );
          })}
          <li className="pt-3 mt-3 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={async () => {
                onItemClick?.();
                
                try {
                  // Notify other tabs that user is logging out
                  sessionSync.notifyLogout();
                  
                  // Clear all queries immediately
                  queryClient.clear();
                  
                  // Call logout endpoint
                  await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                  });
                  
                  // Redirect to home
                  window.location.href = '/';
                } catch (error) {
                  // Fallback to direct redirect
                  window.location.href = '/api/auth/logout';
                }
              }}
              className={cn(
                "w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600 active:bg-red-100 text-sm font-medium px-3 py-3 rounded-lg min-h-[44px] touch-manipulation",
                isCollapsed && "justify-center"
              )}
              data-testid="button-logout"
              aria-label="Sign out of the application"
              role="menuitem"
              title={isCollapsed ? "Sign Out" : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="truncate font-medium ml-3">Sign Out</span>}
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  return (
    <>
      {/* Mobile Menu Button - Enhanced for touch devices */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background border-border shadow-lg min-h-[44px] min-w-[44px] touch-manipulation"
              data-testid="mobile-menu-trigger"
              style={{ 
                WebkitAppearance: 'none',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 sm:w-80">
            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex bg-card border-r border-border shadow-sm flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <SidebarContent isCollapsed={isCollapsed} />
        
        {/* Toggle Button */}
        <div className="p-2 border-t border-gray-200">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full hover:bg-gray-100"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
