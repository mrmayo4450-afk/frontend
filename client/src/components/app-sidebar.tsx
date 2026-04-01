import { useLocation, Link } from "wouter";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, Store, Package, Target, Shield, LogOut, Home,
  Users, BarChart3, MessageCircle, BookOpen, Wallet, Bell, UserCircle,
  Info, Phone, FileText, ScrollText,
} from "lucide-react";

const clientNav = [
  { title: "Marketplace", href: "/", icon: ShoppingBag },
  { title: "Official Catalog", href: "/catalog", icon: BookOpen },
  { title: "My Stores", href: "/stores", icon: Store },
  { title: "My Orders", href: "/orders", icon: Package },
  { title: "My Targets", href: "/targets", icon: Target },
  { title: "Withdrawals", href: "/withdrawals", icon: Wallet },
  { title: "Notices", href: "/notices", icon: Bell },
  { title: "My Account", href: "/account", icon: UserCircle },
];

const adminNav = [
  { title: "Dashboard", href: "/admin", icon: Shield },
  { title: "Marketplace", href: "/", icon: ShoppingBag },
];

const infoNav = [
  { title: "About Us", href: "/about", icon: Info },
  { title: "Contact Us", href: "/contact", icon: Phone },
  { title: "Privacy Policy", href: "/privacy", icon: FileText },
  { title: "Terms & Conditions", href: "/terms", icon: ScrollText },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const isSuperAdmin = user.role === "superadmin";
  const navItems = isAdmin ? adminNav : clientNav;

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <BrandLogo size="md" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Admin Panel" : "Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location === item.href}>
                    <Link href={item.href} data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Information</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {infoNav.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location === item.href}>
                    <Link href={item.href} data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate" data-testid="text-sidebar-username">{user.username}</p>
              {isSuperAdmin && <Badge variant="default" className="text-xs bg-amber-500">Super Admin</Badge>}
              {isAdmin && !isSuperAdmin && <Badge variant="default" className="text-xs">Admin</Badge>}
              {user.isFrozen && <Badge variant="destructive" className="text-xs">Frozen</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
