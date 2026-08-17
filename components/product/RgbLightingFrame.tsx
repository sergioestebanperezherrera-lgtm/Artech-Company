"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type RgbLightingFrameProps = {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
};

export function RgbLightingFrame({
  children,
  className,
  enabled = true,
}: RgbLightingFrameProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !frameRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );

    observer.observe(frameRef.current);

    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={frameRef}
      data-rgb-lighting="true"
      data-rgb-visible={isVisible ? "true" : "false"}
      className={cn("relative h-full rounded-card", className)}
    >
      {children}
    </div>
  );
}
