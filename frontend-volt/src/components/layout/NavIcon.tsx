const stroke = "stroke-current";

export const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-5 h-5 ${stroke}`}
  >
    <path d={d} />
  </svg>
);
