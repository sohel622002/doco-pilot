const TONES = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  primary: "bg-primary-container text-on-primary-container",
  success: "bg-[#173626] text-[#5fd696]",
  warning: "bg-[#3a2c10] text-[#e8b458]",
  error: "bg-error-container text-on-error-container",
};

export default function Badge({ tone = "neutral", className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full font-label-caps text-label-caps ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
