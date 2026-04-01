import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { ShoppingBag, Store, Package, UserCircle, Shield } from "lucide-react";

const clientTabs = [
  { title: "Market", href: "/", icon: ShoppingBag },
  { title: "Stores", href: "/stores", icon: Store },
  { title: "Orders", href: "/orders", icon: Package },
  { title: "Account", href: "/account", icon: UserCircle },
];

const adminTabs = [
  { title: "Dashboard", href: "/admin", icon: Shield },
  { title: "Market", href: "/", icon: ShoppingBag },
];

export function MobileBottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const tabs = isAdmin ? adminTabs : clientTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom" data-testid="mobile-bottom-nav">
      <div className="flex items-center justify-around h-14">
        {tabs.map(tab => {
          const isActive = location === tab.href;
          return (
            <Link key={tab.href} href={tab.href} data-testid={`mobile-nav-${tab.title.toLowerCase()}`}>
              <button className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-[60px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>{tab.title}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
