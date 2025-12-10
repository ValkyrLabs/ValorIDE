import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const FullSizeContainer = ({ children, className = "", style = {}, }) => {
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
    return (_jsx("div", { className: `full-size-container ${className}`, style: {
            width: dimensions.width,
            height: dimensions.height,
            ...style,
        }, children: children }));
};
export default FullSizeContainer;
//# sourceMappingURL=index.js.map