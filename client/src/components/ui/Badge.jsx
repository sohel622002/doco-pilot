const TONES = {
  neutral: "bg-surface-container text-on-surface-variant",
  primary: "bg-primary-container text-on-primary-container",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-error-container text-on-error-container",
};

export default function Badge({ tone = "neutral", className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-space-sm py-1 rounded-full font-label-caps text-label-caps ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
