export default function Card({ as: As = "div", className = "", hoverable = false, ...props }) {
  return (
    <As
      className={`bg-[#232222] rounded-md p-space-md ${
        hoverable ? "hover:border-primary transition-colors cursor-pointer" : ""
      } ${className}`}
      {...props}
    />
  );
}
