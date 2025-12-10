import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ContentDataFlipBoard } from "./index";
/**
 * Example 1: Basic Usage
 * Simplest possible integration with default props.
 */
export function BasicExample() {
    return (_jsxs("div", { style: { maxWidth: "1200px", margin: "0 auto" }, children: [_jsx("h1", { children: "Content Gallery" }), _jsx(ContentDataFlipBoard, {})] }));
}
/**
 * Example 2: Customized with Props
 * Adjust carousel behavior via props.
 */
export function CustomizedExample() {
    return (_jsxs("div", { style: { maxWidth: "1000px", margin: "0 auto" }, children: [_jsx("h1", { children: "Featured Content" }), _jsx(ContentDataFlipBoard, { itemsPerPage: 8, autoScroll: true, autoScrollInterval: 4000 })] }));
}
/**
 * Example 3: Manual Control
 * Disable auto-scroll for user-controlled browsing.
 */
export function ManualControlExample() {
    return (_jsxs("div", { style: { maxWidth: "900px", margin: "0 auto" }, children: [_jsx("h1", { children: "Browse Content" }), _jsx("p", { children: "Use the navigation buttons to explore" }), _jsx(ContentDataFlipBoard, { itemsPerPage: 6, autoScroll: false })] }));
}
/**
 * Example 4: Responsive Container
 * Adaptive sizing for different screen sizes.
 */
export function ResponsiveExample() {
    return (_jsx("div", { style: {
            width: "100%",
            height: "600px",
            maxWidth: "1200px",
            margin: "0 auto",
        }, children: _jsx(ContentDataFlipBoard, { itemsPerPage: 5, autoScroll: true, autoScrollInterval: 5000 }) }));
}
/**
 * Example 5: Landing Page Section
 * Premium presentation on landing page.
 */
export function LandingPageExample() {
    return (_jsx("section", { style: {
            padding: "60px 20px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
        }, children: _jsxs("div", { style: {
                maxWidth: "1200px",
                margin: "0 auto",
            }, children: [_jsx("h1", { style: {
                        textAlign: "center",
                        marginBottom: "10px",
                        fontSize: "36px",
                        fontWeight: "bold",
                    }, children: "Explore Our Content Library" }), _jsx("p", { style: {
                        textAlign: "center",
                        marginBottom: "40px",
                        fontSize: "16px",
                        opacity: 0.9,
                    }, children: "Browse through our curated collection of premium content" }), _jsx("div", { style: {
                        height: "500px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                    }, children: _jsx(ContentDataFlipBoard, { itemsPerPage: 6, autoScroll: true, autoScrollInterval: 5000 }) }), _jsx("div", { style: {
                        marginTop: "40px",
                        textAlign: "center",
                    }, children: _jsx("button", { style: {
                            padding: "12px 30px",
                            background: "white",
                            color: "#667eea",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "16px",
                            fontWeight: "bold",
                            cursor: "pointer",
                        }, children: "View All Content" }) })] }) }));
}
/**
 * Export all examples for storybook or demo purposes
 */
export const Examples = {
    Basic: BasicExample,
    Customized: CustomizedExample,
    ManualControl: ManualControlExample,
    Responsive: ResponsiveExample,
    LandingPage: LandingPageExample,
};
//# sourceMappingURL=USAGE_EXAMPLE.js.map