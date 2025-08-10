import { ReactNode, useEffect, useState } from "react";
const FullSizeContainer = ({
  children,
  className = "",
  style = {},
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      const parent = document.documentElement; // Default to the viewport
      setDimensions({
        width: parent.clientWidth,
        height: parent.clientHeight,
      });
    };

    handleResize(); // Initialize dimensions on mount
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={`full-size-container ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default FullSizeContainer;
