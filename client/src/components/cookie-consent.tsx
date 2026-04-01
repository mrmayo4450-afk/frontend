import { useState, useEffect } from "react";
import { Link } from "wouter";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "mn_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] p-3 sm:p-4"
      data-testid="cookie-consent-banner"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-4xl mx-auto bg-background border border-border rounded-xl shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium mb-0.5">We use cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              MarketNest uses essential cookies to keep you logged in and improve your experience. By continuing, you agree to our{" "}
              <Link href="/privacy" className="text-primary underline underline-offset-2 hover:no-underline">
                Privacy Policy
              </Link>
              {" "}and{" "}
              <Link href="/terms" className="text-primary underline underline-offset-2 hover:no-underline">
                Terms of Service
              </Link>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={decline}
            data-testid="button-cookie-decline"
            className="text-xs"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={accept}
            data-testid="button-cookie-accept"
            className="text-xs"
          >
            Accept All
          </Button>
          <button
            onClick={accept}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close"
            data-testid="button-cookie-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
