"use client";

import React from "react";
import Image from "next/image";

export interface LogoProps {
  /**
   * - "full": Complete official mark + wordmark ("EduSphere AI")
   * - "icon": Standalone 3D graduation cap 'E' mark
   * - "wordmark": Standalone "EduSphere AI" typographic wordmark
   */
  variant?: "full" | "icon" | "wordmark";
  /**
   * Predefined size presets or custom styling via className
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
}

const FULL_DIMENSIONS: Record<string, { width: number; height: number; classStr: string }> = {
  xs: { width: 100, height: 27, classStr: "h-6 w-auto" },
  sm: { width: 125, height: 34, classStr: "h-7 w-auto" },
  md: { width: 154, height: 42, classStr: "h-9 w-auto" },
  lg: { width: 190, height: 52, classStr: "h-11 w-auto" },
  xl: { width: 240, height: 65, classStr: "h-14 w-auto" },
};

const ICON_DIMENSIONS: Record<string, { width: number; height: number; classStr: string }> = {
  xs: { width: 22, height: 22, classStr: "w-5.5 h-5.5" },
  sm: { width: 28, height: 28, classStr: "w-7 h-7" },
  md: { width: 36, height: 36, classStr: "w-9 h-9" },
  lg: { width: 48, height: 48, classStr: "w-12 h-12" },
  xl: { width: 64, height: 64, classStr: "w-16 h-16" },
};

export function Logo({
  variant = "full",
  size = "md",
  className = "",
  priority = false,
}: LogoProps) {
  if (variant === "icon") {
    const dim = ICON_DIMENSIONS[size] || ICON_DIMENSIONS.md;
    return (
      <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
        <Image
          src="/brand/logo-icon.png"
          alt="EduSphere AI Mark"
          width={dim.width}
          height={dim.height}
          priority={priority}
          className={`object-contain ${dim.classStr}`}
        />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={`relative inline-flex items-center flex-shrink-0 ${className}`}>
        <Image
          src="/brand/logo-wordmark.png"
          alt="EduSphere AI"
          width={180}
          height={46}
          priority={priority}
          className="h-7 w-auto object-contain"
        />
      </div>
    );
  }

  // Default: Full official logo (Icon + Wordmark)
  const dim = FULL_DIMENSIONS[size] || FULL_DIMENSIONS.md;
  return (
    <div className={`relative inline-flex items-center flex-shrink-0 select-none ${className}`}>
      <Image
        src="/brand/logo-trimmed.png"
        alt="EduSphere AI"
        width={dim.width}
        height={dim.height}
        priority={priority}
        className={`object-contain ${dim.classStr}`}
      />
    </div>
  );
}

export default Logo;
