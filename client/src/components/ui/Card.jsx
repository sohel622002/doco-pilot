export default function Card({ as: As = "div", className = "", hoverable = false, ...props }) {
  return (
    <As
      className={`bg-surface-container-low border border-outline-variant rounded-xl shadow-card p-space-md ${
        hoverable ? "hover:border-primary transition-colors cursor-pointer" : ""
      } ${className}`}
      {...props}
    />
  );
}
