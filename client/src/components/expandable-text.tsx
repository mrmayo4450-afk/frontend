import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableTextProps {
  text: string;
  className?: string;
  lines?: number;
  "data-testid"?: string;
}

export function ExpandableText({ text, className = "", lines = 2, "data-testid": testId }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  const clampStyle = !expanded ? { WebkitLineClamp: lines, display: "-webkit-box", WebkitBoxOrient: "vertical" as const, overflow: "hidden" } : {};

  return (
    <div>
      <p
        ref={ref}
        className={`whitespace-pre-wrap ${className}`}
        style={clampStyle}
        data-testid={testId}
      >
        {text}
      </p>
      {isClamped && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-1 flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          data-testid={testId ? `${testId}-toggle` : undefined}
        >
          {expanded ? (
            <>See less <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>See more <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
