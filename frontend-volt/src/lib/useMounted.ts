import { useEffect, useState } from "react";

/**
 * Returns `false` on the first paint, then flips to `true` on the next frame.
 * Drives mount-entrance transitions: render elements in their "from" state,
 * then toggle a class once `mounted` is true so CSS animates them in.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return mounted;
}
