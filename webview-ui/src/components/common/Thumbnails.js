import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useLayoutEffect, memo } from "react";
import { useWindowSize } from "react-use";
import { vscode } from "@/utils/vscode";
import { FaTimes } from "react-icons/fa";
const Thumbnails = ({ images, style, setImages, onHeightChange, }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const containerRef = useRef(null);
    const { width } = useWindowSize();
    useLayoutEffect(() => {
        if (containerRef.current) {
            let height = containerRef.current.clientHeight;
            // some browsers return 0 for clientHeight
            if (!height) {
                height = containerRef.current.getBoundingClientRect().height;
            }
            onHeightChange?.(height);
        }
        setHoveredIndex(null);
    }, [images, width, onHeightChange]);
    const handleDelete = (index) => {
        setImages?.((prevImages) => prevImages.filter((_, i) => i !== index));
    };
    const isDeletable = setImages !== undefined;
    const handleImageClick = (image) => {
        vscode.postMessage({ type: "openImage", text: image });
    };
    return (_jsx("div", { ref: containerRef, style: {
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            rowGap: 3,
            ...style,
        }, children: images.map((image, index) => (_jsxs("div", { style: { position: "relative" }, onMouseEnter: () => setHoveredIndex(index), onMouseLeave: () => setHoveredIndex(null), children: [_jsx("img", { src: image, alt: `Thumbnail ${index + 1}`, style: {
                        width: 34,
                        height: 34,
                        objectFit: "cover",
                        borderRadius: 4,
                        cursor: "pointer",
                    }, onClick: () => handleImageClick(image) }), isDeletable && hoveredIndex === index && (_jsx("div", { onClick: () => handleDelete(index), style: {
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 13,
                        height: 13,
                        borderRadius: "50%",
                        backgroundColor: "var(--vscode-badge-background)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                    }, children: _jsx(FaTimes, { style: {
                            color: "var(--vscode-foreground)",
                            fontSize: 10,
                            fontWeight: "bold",
                        } }) }))] }, index))) }));
};
export default memo(Thumbnails);
//# sourceMappingURL=Thumbnails.js.map