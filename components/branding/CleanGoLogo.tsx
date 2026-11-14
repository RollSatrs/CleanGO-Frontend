
"use client";

import Image from "next/image";

type CleanGoLogoProps = {
  size?: number;
  showName?: boolean;
  showTagline?: boolean;
  className?: string;
  textColor?: string;
  priority?: boolean;
};

export default function CleanGoLogo({
  size = 64,
  showName = false,
  showTagline = false,
  className = "",
  textColor = "#102033",
  priority = false,
}: CleanGoLogoProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <Image
        src="/images/cleango/CleanGo-logo.png"
        alt="Логотип CleanGo"
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 object-contain"
        style={{
          width: size,
          height: size,
        }}
      />

      {(showName || showTagline) && (
        <div className="flex flex-col">
          {showName && (
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ color: textColor }}
            >
              Clean
              <span className="text-[#12B6A6]">
                Go
              </span>
            </span>
          )}

          {showTagline && (
            <span className="text-xs text-[#8293A4]">
              Уборка без забот
            </span>
          )}
        </div>
      )}
    </div>
  );
}
