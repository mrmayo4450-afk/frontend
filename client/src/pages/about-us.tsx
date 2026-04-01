import { ShoppingBag, Target, Users, Shield, TrendingUp, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutUs() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <ShoppingBag className="w-9 h-9 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-about-title">About MarketNest</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Empowering merchants and buyers with a seamless, trusted marketplace experience — built for growth, driven by community.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Who We Are</h2>
        <p className="text-muted-foreground leading-relaxed">
          MarketNest is a next-generation e-commerce marketplace that connects independent merchants with millions of buyers around the world. Founded with a simple mission — to make online commerce accessible, fair, and profitable for everyone — we have grown into a thriving platform where sellers of all sizes can build successful businesses.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Whether you are a first-time entrepreneur or an established brand, MarketNest provides the tools, infrastructure, and community support you need to succeed in today's competitive digital marketplace.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Target, title: "Our Mission", desc: "To democratize e-commerce by giving every merchant the same powerful tools that large enterprises use, at a fraction of the cost." },
          { icon: Users, title: "Our Community", desc: "A global network of merchants, buyers, and partners who share a commitment to quality products, honest dealings, and mutual growth." },
          { icon: Shield, title: "Our Promise", desc: "Every transaction on MarketNest is protected. We stand behind each purchase with dedicated support and a secure payment guarantee." },
          { icon: TrendingUp, title: "Our Growth", desc: "From humble beginnings to thousands of active stores, our platform continues to expand with new features and markets every quarter." },
          { icon: Globe, title: "Our Reach", desc: "Serving customers and merchants across multiple countries with localized support, multi-currency handling, and fast logistics partnerships." },
          { icon: ShoppingBag, title: "Our Products", desc: "A curated catalog spanning electronics, fashion, beauty, home goods, and more — all verified for quality before listing." },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} data-testid={`card-about-${title.toLowerCase().replace(/ /g, "-")}`}>
            <CardContent className="pt-5 space-y-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="bg-muted/50 rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold">Our Values</h2>
        <ul className="space-y-2 text-muted-foreground">
          {[
            "Transparency — We believe in honest pricing, clear policies, and open communication.",
            "Integrity — Every decision we make is guided by what is right for our merchants and buyers.",
            "Innovation — We continuously improve our platform to stay ahead of the market.",
            "Inclusion — Our marketplace is open to merchants from all backgrounds and industries.",
            "Security — We invest heavily in protecting your data and financial transactions.",
          ].map((v) => (
            <li key={v} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Join the MarketNest Community</h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Thousands of merchants trust MarketNest to power their businesses. Start your store today and experience the difference a truly merchant-first marketplace makes.
        </p>
      </section>
    </div>
  );
}
