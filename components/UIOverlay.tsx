import React, { useState } from "react";
import { Credits } from "./Credits";
import { Tooltip } from "./Tooltip";

interface UIOverlayProps {
  pickedNames: string[];
  resetPickedRecord: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  pickedNames,
  resetPickedRecord,
}) => {
  const [isPickedListExpanded, setIsPickedListExpanded] = useState(false);

  // Helper function to convert base64 to Blob
  // const base64ToBlob = (base64: string): Blob => {
  //   const byteString = atob(base64.split(",")[1]);
  //   const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
  //   const ab = new ArrayBuffer(byteString.length);
  //   const ia = new Uint8Array(ab);
  //   for (let i = 0; i < byteString.length; i++) {
  //     ia[i] = byteString.charCodeAt(i);
  //   }
  //   return new Blob([ab], { type: mimeString });
  // };

  // const handleCreateMine = () => {
  //   // 清除 URL 参数，刷新页面
  //   window.location.href = window.location.origin;
  // };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
      {/* Picked Names List - Left Side */}
      {pickedNames.length > 0 && (
        <div className="absolute top-24 left-8 pointer-events-auto w-[200px]">
          <div className="flex items-center justify-between mb-1">
            {isPickedListExpanded && (
              <h2 className="text-lg font-serif text-[#D4AF37] tracking-wider drop-shadow-lg">
                Picked
              </h2>
            )}
            <Tooltip
              label={isPickedListExpanded ? "Collapse" : "Expand"}
              side="right"
            >
              <button
                onClick={() => setIsPickedListExpanded(!isPickedListExpanded)}
                className="w-6 h-6 flex items-center justify-center border border-[#D4AF37] rounded-md text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                aria-label={
                  isPickedListExpanded
                    ? "Collapse picked list"
                    : "Expand picked list"
                }
              >
                <svg
                  viewBox="0 0 16 16"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M3 8h10" />
                  {!isPickedListExpanded && <path d="M8 3v10" />}
                </svg>
              </button>
            </Tooltip>
          </div>

          {isPickedListExpanded && (
            <>
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                {pickedNames.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-[#D4AF37]/40 rounded-sm animate-fade-in"
                  >
                    <span className="text-[#D4AF37] font-serif text-sm font-bold min-w-[20px]">
                      {i + 1}.
                    </span>
                    <span className="text-[#F5E6BF] font-serif text-sm tracking-wide">
                      {name}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className="w-full mt-5 px-3 py-1.5 flex items-center justify-center  border border-[#D4AF37] rounded-md text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors leading-none"
                onClick={resetPickedRecord}
              >
                Reset
              </button>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <header className="absolute top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5E6BF] to-[#D4AF37] font-serif drop-shadow-lg tracking-wider text-center">
          Lucky Draw Session
        </h1>
      </header>

      {/* Credits - bottom right */}
      <Credits />
    </div>
  );
};
