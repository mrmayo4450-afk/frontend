import { useQuery } from "@tanstack/react-query";
import type { SiteSettings } from "@shared/schema";

export default function PrivacyPolicy() {
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
  });

  const contactEmail = settings?.contactEmail || "support@yourdomain.com";
  const contactAddress = settings?.contactAddress || "123 Commerce Street, Business District, NY 10001, USA";
  const siteName = settings?.siteName || "MarketNest";

  const sections = [
    {
      title: "1. Information We Collect",
      content: `We collect information you provide directly to us when you create an account, set up a store, make purchases, or contact us for support. This includes:

• Account information: name, email address, username, age, and profession.
• Store and product information you provide when listing items.
• Transaction data: purchase history, payment amounts, and withdrawal records.
• Communication data: messages sent through our support chat system.
• Device and usage data: IP address, browser type, operating system, and pages visited.`,
    },
    {
      title: "2. How We Use Your Information",
      content: `${siteName} uses the information we collect to:

• Create and manage your account and merchant profile.
• Process transactions and send related notifications.
• Provide customer support and respond to inquiries.
• Send important updates about your account, orders, or platform changes.
• Detect, prevent, and address fraud, security issues, and abuse.
• Improve our services through aggregated analytics.
• Comply with legal obligations and enforce our Terms & Conditions.`,
    },
    {
      title: "3. Sharing of Information",
      content: `We do not sell or rent your personal information to third parties. We may share your data in the following limited circumstances:

• With service providers who assist us in operating the platform (hosting, analytics, payment processing), subject to strict confidentiality agreements.
• With other merchants or buyers only to the extent necessary to complete a transaction.
• With law enforcement or government authorities when required by applicable law.
• In connection with a merger, acquisition, or sale of assets, with prior notice to users.`,
    },
    {
      title: "4. Cookies and Tracking",
      content: `${siteName} uses cookies and similar technologies to maintain your session, remember your preferences, and understand how users interact with our platform. You may configure your browser to reject cookies, but some features may not function correctly as a result.`,
    },
    {
      title: "5. Data Security",
      content: `We implement industry-standard security measures to protect your personal information, including encrypted communications (HTTPS/TLS), secure password hashing, session management controls, and regular security audits. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.`,
    },
    {
      title: "6. Data Retention",
      content: `We retain your personal data for as long as your account is active or as needed to provide services. If you close your account, we will delete or anonymize your data within 90 days, except where we are required to retain it for legal, tax, or regulatory purposes.`,
    },
    {
      title: "7. Your Rights",
      content: `Depending on your location, you may have the right to:

• Access the personal information we hold about you.
• Request correction of inaccurate data.
• Request deletion of your account and associated data.
• Object to or restrict certain types of data processing.
• Withdraw consent where processing is based on consent.

To exercise these rights, contact us at ${contactEmail}.`,
    },
    {
      title: "8. Children's Privacy",
      content: `${siteName} is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If we discover that a minor has registered an account, we will delete that account promptly.`,
    },
    {
      title: "9. Changes to This Policy",
      content: `We may update this Privacy Policy periodically. We will notify you of significant changes by posting a notice on the platform or sending an email to your registered address. Your continued use of ${siteName} after changes take effect constitutes your acceptance of the updated policy.`,
    },
    {
      title: "10. Contact Us",
      content: `If you have any questions or concerns about this Privacy Policy, please contact our Privacy Team at ${contactEmail} or write to us at ${siteName}, ${contactAddress}.`,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-privacy-title">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: January 1, 2025 &nbsp;|&nbsp; Effective: January 1, 2025</p>
        <p className="text-muted-foreground leading-relaxed">
          At {siteName}, your privacy matters. This Privacy Policy explains how we collect, use, share, and protect information about you when you use our platform. Please read it carefully.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map(({ title, content }) => (
          <section key={title} className="space-y-2" data-testid={`section-privacy-${title.split(".")[0].replace(/ /g, "-").toLowerCase()}`}>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
