interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", inverted = false, className = "" }: BrandLogoProps) {
  const sizes = {
    sm: { text: "text-lg", icon: "w-5 h-5", gap: "gap-1.5" },
    md: { text: "text-xl", icon: "w-6 h-6", gap: "gap-2" },
    lg: { text: "text-3xl", icon: "w-8 h-8", gap: "gap-2.5" },
  };

  const s = sizes[size];
  const iconColor = inverted ? "text-white/90" : "text-primary";
  const marketColor = inverted ? "text-white" : "text-foreground";
  const nestColor = inverted ? "text-white/80" : "text-primary";

  return (
    <div
      className={`flex items-center ${s.gap} ${className}`}
      data-testid="brand-logo"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <svg
        className={`${s.icon} ${iconColor} flex-shrink-0`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 22V12h6v10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      </svg>
      <span className={`${s.text} font-bold tracking-tight leading-none`}>
        <span className={marketColor}>Market</span>
        <span className={nestColor}>Nest</span>
      </span>
    </div>
  );
}
