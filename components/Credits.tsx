import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "./Tooltip";

interface Developer {
  name: string;
  github?: { label: string; url: string };
}

const DEVELOPERS: Developer[] = [
  {
    name: "Lian Hong",
    github: {
      label: "github.lianhonglim.my",
      url: "https://github.lianhonglim.my",
    },
  },
  {
    name: "Wisely Diwan",
    github: { label: "github.com/Purblac", url: "https://github.com/Purblac" },
  },
  {
    name: "Enson Chin",
  },
];

const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

/**
 * Credits - icon button fixed to the bottom-right corner that opens
 * a modal crediting the developers.
 */
export const Credits: React.FC = () => {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Escape to close; move focus into the dialog and back to the trigger
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <Tooltip
        label="Credits"
        side="left"
        className="fixed bottom-6 right-6 z-30 pointer-events-auto"
      >
        <button
          ref={triggerRef}
          onClick={() => setOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-full border-2 border-[#D4AF37] bg-black/60 backdrop-blur-sm text-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.25)] hover:bg-[#D4AF37] hover:text-black transition-colors"
          aria-label="Credits"
        >
          {/* Users icon */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
      </Tooltip>

      {/* Portal to <body> so the modal sits above the webcam preview (z-50)
          but below the hand-pointer cursor (z-60). */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[55] flex items-center justify-center p-4 animate-fade-in pointer-events-auto"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="credits-title"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-lg border border-[#D4AF37]/60 bg-gradient-to-b from-[#0d1f16] to-black px-6 pt-7 pb-6 shadow-[0_0_40px_rgba(212,175,55,0.2)] animate-scale-in"
            >
              <button
                ref={closeBtnRef}
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                aria-label="Close credits"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2
                id="credits-title"
                className="text-center font-serif text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5E6BF] to-[#D4AF37]"
              >
                Credits
              </h2>
              <p className="mt-1 text-center font-serif text-sm italic text-[#F5E6BF]/70">
                Developed by
              </p>

              <ul className="mt-5 flex flex-col gap-3">
                {DEVELOPERS.map((dev) => (
                  <li
                    key={dev.name}
                    className="rounded-md border border-[#D4AF37]/30 bg-black/40 px-4 py-3"
                  >
                    <div className="font-serif text-lg text-[#F5E6BF] tracking-wide">
                      {dev.name}
                    </div>
                    {dev.github && (
                      <a
                        href={dev.github.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#D4AF37] hover:text-[#F5E6BF] hover:underline underline-offset-2 transition-colors"
                      >
                        <GitHubIcon className="w-3.5 h-3.5" />
                        {dev.github.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
