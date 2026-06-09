import { useEffect, useRef } from "react";

type Format = (value: number) => string;

const defaultFormat: Format = (v) => Math.round(v).toLocaleString();

/**
 * Animates a number from 0 → `target` over `duration` ms on mount, writing the
 * formatted value straight to the DOM node via the returned ref each frame.
 * Because it mutates `textContent` imperatively, the animation never triggers a
 * React re-render — it stays off React's render path the way Motion/GSAP do.
 * Honors `prefers-reduced-motion` by snapping to the target.
 *
 * Attach the returned ref to the element that shows the number, and give that
 * element initial children of "0" — shown before the first frame and as the
 * reduced-motion / no-JS baseline.
 */
export function useCountUp<T extends HTMLElement>(
  target: number,
  duration = 1400,
  format: Format = defaultFormat,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const write = (value: number) => {
      node.textContent = format(value);
    };

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      write(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1); // linear 0 → 1
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      write(eased * target);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, format]);

  return ref;
}
