export default function Card({ as: As = "div", className = "", hoverable = false, ...props }) {
  return (
    <As
      className={`bg-card border border-outline-variant rounded-lg p-space-md ${
        hoverable ? "hover:border-outline transition-colors cursor-pointer" : ""
      } ${className}`}
      {...props}
    />
  );
}
