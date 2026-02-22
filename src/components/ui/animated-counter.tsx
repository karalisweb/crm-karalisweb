"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  className,
  duration = 1,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const controls = animate(prevValue.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = Math.round(v).toString();
      },
    });

    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
