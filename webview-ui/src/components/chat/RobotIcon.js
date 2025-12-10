import { jsx as _jsx } from "react/jsx-runtime";
import { FaRobot } from "react-icons/fa";
const RobotIcon = ({ onClick }) => {
    return (_jsx("div", { style: {
            cursor: "pointer",
            color: "#61dafb",
            fontSize: "24px",
            marginLeft: "10px",
            alignSelf: "center",
        }, title: "Click to ping other ValorIDE instances", onClick: onClick, role: "button", tabIndex: 0, onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
            }
        }, children: _jsx(FaRobot, {}) }));
};
export default RobotIcon;
//# sourceMappingURL=RobotIcon.js.map