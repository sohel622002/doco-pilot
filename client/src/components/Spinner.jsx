export default function Spinner({
  size = 20,
  borderWidth = 3,
  color = "#121212",
  speed = "1s",
}) {
  const spinnerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    border: `${borderWidth}px solid ${color}`,
    borderBottomColor: "transparent",
    borderRadius: "50%",
    display: "inline-block",
    boxSizing: "border-box",
    animation: `rotation ${speed} linear infinite`,
  };

  return (
    <>
      <style>
        {`
          @keyframes rotation {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <span style={spinnerStyle}></span>
    </>
  );
}
