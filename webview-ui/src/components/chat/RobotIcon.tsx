import React from "react";
import { FaRobot } from "react-icons/fa";

interface RobotIconProps {
  onClick: () => void;
}

const RobotIcon: React.FC<RobotIconProps> = ({ onClick }) => {
  return (
    <div
      style={{
        cursor: "pointer",
        color: "#61dafb",
        fontSize: "24px",
        marginLeft: "10px",
        alignSelf: "center",
      }}
      title="Click to ping other ValorIDE instances"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <FaRobot />
    </div>
  );
};

export default RobotIcon;
