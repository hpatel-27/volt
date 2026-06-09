/**
 * Atmosphere layer for the marketing + auth surfaces: a faint engineering
 * graph-paper grid, radially masked so it dissolves toward the edges, with a
 * single volt glow anchored to the corner. Purely decorative — sits behind
 * content as an absolutely-positioned, non-interactive layer.
 */
export function GridBackdrop({
  className = "",
  glow = "volt",
}: {
  className?: string;
  glow?: "volt" | "sky" | "blaze";
}) {
  const glowColor = {
    volt: "rgba(198,255,61,0.10)",
    sky: "rgba(46,139,255,0.10)",
    blaze: "rgba(243,30,75,0.10)",
  }[glow];

  const mask =
    "radial-gradient(ellipse 75% 75% at 25% 0%, black 35%, transparent 100%)";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      <div
        className="absolute -left-40 -top-40 h-128 w-lg rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
        }}
      />
    </div>
  );
}
