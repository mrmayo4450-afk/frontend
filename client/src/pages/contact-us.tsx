import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, MapPin, Clock, MessageCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SiteSettings } from "@shared/schema";

export default function ContactUs() {
  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const contacts = settings
    ? [
        { icon: Mail, label: "Email", value: settings.contactEmail, href: `mailto:${settings.contactEmail}` },
        { icon: Phone, label: "Phone", value: settings.contactPhone, href: `tel:${settings.contactPhone}` },
        { icon: MapPin, label: "Address", value: settings.contactAddress, href: undefined },
        { icon: MessageCircle, label: "WhatsApp", value: settings.contactWhatsapp, href: `https://wa.me/${settings.contactWhatsapp.replace(/\D/g, "")}` },
        { icon: Send, label: "Telegram", value: settings.contactTelegram, href: `https://t.me/${settings.contactTelegram.replace("@", "")}` },
        { icon: Clock, label: "Business Hours", value: settings.contactHours, href: undefined },
      ]
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-contact-title">Contact Us</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Have a question, issue, or just want to say hello? Our support team is here to help you. Reach out through any of the channels below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 space-y-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </CardContent>
              </Card>
            ))
          : contacts.map(({ icon: Icon, label, value, href }) => (
              <Card key={label} data-testid={`card-contact-${label.toLowerCase().replace(/ /g, "-")}`}>
                <CardContent className="pt-5 space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm font-medium hover:text-primary transition-colors break-words"
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      data-testid={`link-contact-${label.toLowerCase().replace(/ /g, "-")}`}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">{value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="bg-muted/50 rounded-xl p-6 text-center space-y-2">
        <h2 className="font-semibold">Need faster support?</h2>
        <p className="text-sm text-muted-foreground">
          For account-specific issues, use the live chat widget at the bottom of the screen. Our team typically responds within a few hours during business hours.
        </p>
      </div>
    </div>
  );
}
