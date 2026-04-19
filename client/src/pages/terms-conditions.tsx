export default function TermsConditions() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using the MarketNest platform, you agree to be bound by these Terms & Conditions and all applicable laws and regulations. If you do not agree with any part of these terms, you must not use our services. These terms apply to all users, including merchants, buyers, and visitors.`,
    },
    {
      title: "2. Eligibility",
      content: `You must be at least 18 years of age to register an account on MarketNest. By using our platform, you represent and warrant that you are of legal age and have the legal capacity to enter into binding agreements. Accounts registered on behalf of a business must be managed by an authorized representative.`,
    },
    {
      title: "3. Account Responsibilities",
      content: `You are responsible for:

• Maintaining the confidentiality of your account credentials.
• All activities that occur under your account.
• Ensuring that your account information is accurate and up to date.
• All merchants must fulfill orders on time to receive positive reviews from customers.
• Notifying us immediately of any unauthorized use of your account.

MarketNest reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or misrepresent their identity.`,
    },
    {
      title: "4. Merchant Obligations",
      content: `Merchants using MarketNest agree to:

• List only products they are authorized to sell.
• Provide accurate descriptions, pricing, and images for all listings.
• Fulfill orders promptly and maintain adequate stock levels.
• Before withdrawing funds, please ensure that you maintain your account reputation. If your reputation is compromised due to negative feedback, the system will suspend your withdrawal functionality until your reputation returns to a normal level.
• Adhere to all applicable local, national, and international laws governing their products.
• Not list counterfeit, prohibited, or illegal items.

Violation of these obligations may result in immediate account suspension and forfeiture of pending balances pending investigation.`,
    },
    {
      title: "5. Transactions and Payments",
      content: `All transactions on MarketNest are processed through our secure platform. Merchants receive earnings (the difference between selling price and cost price) which are credited to their account balance. Withdrawals are subject to minimum balance requirements and verification procedures. MarketNest reserves the right to place funds on hold during dispute resolution or fraud investigations.`,
    },
    {
      title: "6. Prohibited Activities",
      content: `The following activities are strictly prohibited on MarketNest:

• Fraudulent listings, fake reviews, or misleading product representations.
• Attempting to bypass our fee structure or payment system.
• Skipping orders multiple times will result in reputational damage, if such behavior recurs, your account will be suspended.
• Sharing account access with unauthorized individuals.
• Interfering with the platform's technical infrastructure.
• Engaging in money laundering, market manipulation, or any illegal financial activity.
• Harassment or abusive behavior toward other users or support staff.`,
    },
    {
      title: "7. Intellectual Property",
      content: `All content, branding, logos, and software on the MarketNest platform are the intellectual property of MarketNest or its licensors. You may not reproduce, distribute, or create derivative works without our express written consent. Merchants retain ownership of their own product images and descriptions but grant MarketNest a non-exclusive license to display and promote their listings.`,
    },
    {
      title: "8. Limitation of Liability",
      content: `To the fullest extent permitted by law, MarketNest shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our total liability for any claim arising from these terms shall not exceed the amount you paid to MarketNest in the 30 days preceding the claim.`,
    },
    {
      title: "9. Dispute Resolution",
      content: `In the event of a dispute between merchants and buyers, MarketNest will act as a neutral mediator. Both parties agree to provide accurate information and cooperate with our support team during the resolution process. For disputes with MarketNest itself, you agree to first attempt resolution through our support channels before pursuing legal remedies.`,
    },
    {
      title: "10. Termination",
      content: `MarketNest may terminate or suspend your account at any time, with or without notice, for conduct that we determine violates these Terms & Conditions, is harmful to other users, or is otherwise objectionable. You may close your account at any time by contacting our support team. Pending obligations (such as unfulfilled orders) must be resolved prior to account closure.`,
    },
    {
      title: "11. Modifications to Terms",
      content: `We reserve the right to modify these Terms & Conditions at any time. Updated terms will be posted on the platform with a revised effective date. Your continued use of MarketNest after changes become effective constitutes your acceptance of the new terms.`,
    },
    {
      title: "12. Governing Law",
      content: `These Terms & Conditions shall be governed by and construed in accordance with the laws of the State of New York, USA, without regard to its conflict of law provisions. Any disputes not resolved through our internal process shall be subject to the exclusive jurisdiction of the courts located in New York County.`,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-terms-title">Terms & Conditions</h1>
        <p className="text-muted-foreground text-sm">Last updated: January 1, 2025 &nbsp;|&nbsp; Effective: January 1, 2025</p>
        <p className="text-muted-foreground leading-relaxed">
          Please read these Terms & Conditions carefully before using the MarketNest platform. These terms govern your access to and use of our services.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map(({ title, content }) => (
          <section key={title} className="space-y-2" data-testid={`section-terms-${title.split(".")[0].replace(/ /g, "-").toLowerCase()}`}>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
