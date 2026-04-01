import { Link } from "wouter";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30 mt-auto" data-testid="site-footer">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div className="space-y-3">
            <BrandLogo size="sm" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              A trusted multi-vendor marketplace connecting independent merchants with buyers worldwide. Shop with confidence.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-about">About Us</Link></li>
              <li><Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms &amp; Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {year} MarketNest. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
