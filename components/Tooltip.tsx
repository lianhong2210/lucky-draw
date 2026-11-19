import React from "react";

type Side = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: string;
  side?: Side;
  /** Extra classes for the wrapper (e.g. positioning like "fixed bottom-6 right-6") */
  className?: string;
  children: React.ReactNode;
}

const POSITION: Record<Side, string> = {
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2 origin-bottom",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2 origin-top",
  left: "right-full mr-2 top-1/2 -translate-y-1/2 origin-right",
  right: "left-full ml-2 top-1/2 -translate-y-1/2 origin-left",
};

/**
 * Small gold-on-black hover tooltip. Shows on mouse hover and on keyboard
 * focus (not on mouse click, so it doesn't stick around after clicking).
 * The trigger should carry its own aria-label; the tooltip is visual only.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  label,
  side = "top",
  className = "",
  children,
}) => (
  <div
    className={`inline-flex group/tip ${
      // Tooltip is positioned against the wrapper, so it needs a position;
      // keep the caller's fixed/absolute/sticky instead of overriding it.
      /\b(fixed|absolute|sticky)\b/.test(className) ? "" : "relative"
    } ${className}`}
  >
    {children}
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-[#D4AF37]/50 bg-black/85 px-2 py-1 font-serif text-xs tracking-wide text-[#F5E6BF] shadow-lg backdrop-blur-sm opacity-0 scale-95 transition duration-150 ease-out group-hover/tip:opacity-100 group-hover/tip:scale-100 group-hover/tip:delay-150 group-has-[:focus-visible]/tip:opacity-100 group-has-[:focus-visible]/tip:scale-100 ${POSITION[side]}`}
    >
      {label}
    </span>
  </div>
);
