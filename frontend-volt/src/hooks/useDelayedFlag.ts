import { useEffect, useState } from "react";

export function useDelayedFlag(active: boolean, delayMs: number) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setShown(true), delayMs);
    return () => {
      clearTimeout(t);
      setShown(false);
    };
  }, [active, delayMs]);

  return shown;
}
