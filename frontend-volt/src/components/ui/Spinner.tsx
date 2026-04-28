interface SpinnerProps {
  size?: number;
  stroke?: number;
  color?: "volt" | "blaze" | "sky";
  fullscreen?: boolean;
}

const colorVar = {
  volt: "var(--color-volt-500)",
  blaze: "var(--color-blaze-500)",
  sky: "var(--color-sky-500)",
};

export function Spinner({
  size = 32,
  stroke = 3,
  color = "volt",
  fullscreen = false,
}: SpinnerProps) {
  const ring = (
    // Suggested approach (Tailwind):
    //   - a <div> sized via the `size` prop (use inline style: { width: size, height: size })
    //   - className: "rounded-full animate-spin"
    //   - border styling: borderWidth={stroke}, with three sides transparent and one side
    //     using colorVar[color]. Inline style is cleanest since the color is a CSS variable.

    <div
      className="rounded-full animate-spin border-b-transparent border-l-transparent border-r-transparent"
      aria-label="Loading"
      role="status"
      style={{
        width: size,
        height: size,
        borderWidth: stroke,
        borderTopColor: colorVar[color],
      }}
    ></div>
  );

  if (!fullscreen) return ring;

  return (
    <div className="fixed inset-0 flex items-center justify-center">{ring}</div>
  );
}
