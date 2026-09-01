const VARIANTS = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary:
    "bg-surface-container-high text-on-surface border border-outline-variant hover:border-outline",
  ghost: "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
};

const SIZES = {
  sm: "px-space-sm py-1.5 text-[13px]",
  md: "px-space-md py-2 text-body-main",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-space-xs rounded-md font-medium transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
