import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { MobileBottomNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { CookieConsent } from "@/components/cookie-consent";
import { AuthProvider, useAuth } from "@/lib/auth";
import { WSProvider } from "@/lib/websocket";
import { ChatWidget } from "@/components/chat";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Marketplace from "@/pages/marketplace";
import MyStores from "@/pages/my-stores";
import MyOrders from "@/pages/my-orders";
import Targets from "@/pages/targets";
import AdminPanel from "@/pages/admin";
import CatalogPage from "@/pages/catalog";
import WithdrawalsPage from "@/pages/withdrawals";
import NoticesPage from "@/pages/notices";
import MyAccount from "@/pages/my-account";
import AboutUs from "@/pages/about-us";
import ContactUs from "@/pages/contact-us";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsConditions from "@/pages/terms-conditions";

function ThemeToggle() {
  const toggle = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
  };
  return (
    <button onClick={toggle} className="w-9 h-9 rounded-full hover-elevate flex items-center justify-center text-muted-foreground" data-testid="button-theme-toggle" aria-label="Toggle theme">
      <svg className="w-4 h-4 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      <svg className="w-4 h-4 hidden dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
    </button>
  );
}

const sidebarStyle = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "3.5rem",
};

const FOOTER_ROUTES = ["/", "/about", "/contact", "/privacy", "/terms"];

function AppLayout() {
  const [location] = useLocation();
  const showFooter = FOOTER_ROUTES.includes(location);

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-dvh w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b bg-background/95 backdrop-blur-lg sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" data-testid="button-sidebar-toggle" />
              <div className="flex md:hidden items-center gap-2">
                <SidebarTrigger className="w-8 h-8" data-testid="button-mobile-menu" />
                <BrandLogo size="sm" />
              </div>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0 flex flex-col">
            <div className="flex-1">
              <Switch>
                <Route path="/" component={Marketplace} />
                <Route path="/stores" component={MyStores} />
                <Route path="/orders" component={MyOrders} />
                <Route path="/targets" component={Targets} />
                <Route path="/catalog" component={CatalogPage} />
                <Route path="/withdrawals" component={WithdrawalsPage} />
                <Route path="/notices" component={NoticesPage} />
                <Route path="/account" component={MyAccount} />
                <Route path="/admin" component={AdminPanel} />
                <Route path="/about" component={AboutUs} />
                <Route path="/contact" component={ContactUs} />
                <Route path="/privacy" component={PrivacyPolicy} />
                <Route path="/terms" component={TermsConditions} />
                <Route component={NotFound} />
              </Switch>
            </div>
            {showFooter && <SiteFooter />}
          </main>
        </div>
      </div>
      <MobileBottomNav />
      <ChatWidget />
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <WSProvider userId={user.id}>
      <AppLayout />
    </WSProvider>
  );
}

function App() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster />
          <CookieConsent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
