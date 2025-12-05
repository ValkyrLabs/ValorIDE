import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { vscode } from "@/utils/vscode";
import DOMPurify from "dompurify";
import { getSafeHostname, formatUrlForOpening, checkIfImageUrl, } from "./utils/mcpRichUtil";
import ChatErrorBoundary from "@/components/chat/ChatErrorBoundary";
// Use a class component to ensure complete isolation between instances
class ImagePreview extends React.Component {
    imgRef = React.createRef();
    timeoutId = null;
    heartbeatId = null;
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: null,
            fetchStartTime: Date.now(),
        };
    }
    // Track aspect ratio for proper display
    aspectRatio = 1;
    componentDidMount() {
        // Set up a timeout to handle cases where the image never loads or errors
        this.timeoutId = setTimeout(() => {
            console.log(`Image load timeout for ${this.props.url}`);
            if (this.state.loading) {
                this.setState({
                    loading: false,
                    error: `Timeout loading image: ${this.props.url}`,
                });
            }
        }, 15000);
        // Set up a heartbeat to update the UI with elapsed time
        this.heartbeatId = setInterval(() => {
            if (this.state.loading) {
                this.forceUpdate(); // Just update the component to show new elapsed time
            }
        }, 1000);
        // First, check the content type to verify it's actually an image
        this.checkContentType(this.props.url);
    }
    // Check if the URL is an image using content type verification
    checkContentType(url) {
        // Always verify content type, even for URLs that look like images by extension
        checkIfImageUrl(url)
            .then((isImage) => {
            if (isImage) {
                console.log(`URL is confirmed as image: ${url}`);
                this.loadImage(url);
            }
            else {
                console.log(`URL is not an image: ${url}`);
                this.handleImageError();
            }
        })
            .catch((error) => {
            console.log(`Error checking if URL is an image: ${error}`);
            // Don't fallback to direct image loading on error
            // Instead, report the error so the URL can be handled as a non-image
            this.handleImageError();
        });
    }
    // Load the image after content type check or as fallback
    loadImage(url) {
        const isSvg = /\.svg(\?.*)?$/i.test(url);
        // For SVG files, we don't need to calculate aspect ratio as they're vector-based
        if (isSvg) {
            console.log(`SVG image detected, skipping aspect ratio calculation: ${url}`);
            // Default aspect ratio for SVGs
            this.aspectRatio = 1;
            this.handleImageLoad();
            return;
        }
        // Create a test image to check if the URL loads and get dimensions
        const testImg = new Image();
        testImg.onload = () => {
            console.log(`Test image loaded successfully: ${url}`);
            // Calculate aspect ratio for proper display
            if (testImg.width > 0 && testImg.height > 0) {
                this.aspectRatio = testImg.width / testImg.height;
            }
            this.handleImageLoad();
        };
        testImg.onerror = () => {
            console.log(`Test image failed to load: ${url}`);
            this.handleImageError();
        };
        // Force CORS mode to be anonymous to avoid CORS issues
        testImg.crossOrigin = "anonymous";
    }
    componentWillUnmount() {
        this.cleanup();
    }
    cleanup() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.heartbeatId) {
            clearInterval(this.heartbeatId);
            this.heartbeatId = null;
        }
    }
    // Handle image load event
    handleImageLoad = () => {
        console.log(`Image loaded successfully: ${this.props.url}`);
        this.setState({ loading: false });
        this.cleanup();
    };
    // Handle image error event
    handleImageError = () => {
        console.log(`Image failed to load: ${this.props.url}`);
        this.setState({
            loading: false,
            error: `Failed to load image: ${this.props.url}`,
        });
        this.cleanup();
    };
    render() {
        const { url } = this.props;
        const { loading, error, fetchStartTime } = this.state;
        // Calculate elapsed time for loading state
        const elapsedSeconds = loading
            ? Math.floor((Date.now() - fetchStartTime) / 1000)
            : 0;
        // Fallback display while loading
        if (loading) {
            return (_jsxs("div", { className: "image-preview-loading", style: {
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--vscode-editorWidget-border, rgba(127, 127, 127, 0.3))",
                    borderRadius: "4px",
                    height: "128px",
                    maxWidth: "512px",
                }, children: [_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                        }, children: [_jsx("div", { className: "loading-spinner", style: {
                                    marginRight: "8px",
                                    width: "16px",
                                    height: "16px",
                                    border: "2px solid rgba(127, 127, 127, 0.3)",
                                    borderTopColor: "var(--vscode-textLink-foreground, #3794ff)",
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                } }), _jsx("style", { children: `
								@keyframes spin {
									to { transform: rotate(360deg); }
								}
							` }), "Loading image from ", getSafeHostname(url), "..."] }), elapsedSeconds > 3 && (_jsx("div", { style: {
                            fontSize: "11px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: elapsedSeconds > 60
                            ? `Waiting for ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s...`
                            : `Waiting for ${elapsedSeconds}s...` })), /\.svg(\?.*)?$/i.test(url) ? (_jsx("object", { type: "image/svg+xml", data: DOMPurify.sanitize(url), style: { display: "none" }, onLoad: this.handleImageLoad, onError: this.handleImageError })) : (_jsx("img", { src: DOMPurify.sanitize(url), alt: "", ref: this.imgRef, onLoad: this.handleImageLoad, onError: this.handleImageError, style: { display: "none" } }))] }));
        }
        // Handle error state
        if (error) {
            return (_jsxs("div", { className: "image-preview-error", style: {
                    padding: "12px",
                    border: "1px solid var(--vscode-editorWidget-border, rgba(127, 127, 127, 0.3))",
                    borderRadius: "4px",
                    color: "var(--vscode-errorForeground)",
                }, onClick: () => {
                    vscode.postMessage({
                        type: "openInBrowser",
                        url: DOMPurify.sanitize(url),
                    });
                }, children: [_jsx("div", { style: { fontWeight: "bold" }, children: "Failed to load image" }), _jsx("div", { style: { fontSize: "12px", marginTop: "4px" }, children: getSafeHostname(url) }), _jsx("div", { style: {
                            fontSize: "11px",
                            marginTop: "8px",
                            color: "var(--vscode-textLink-foreground)",
                        }, children: "Click to open in browser" })] }));
        }
        // Render the image
        return (_jsx("div", { className: "image-preview", style: {
                margin: "10px 0",
                maxWidth: "100%",
                cursor: "pointer",
            }, onClick: () => {
                vscode.postMessage({
                    type: "openInBrowser",
                    url: DOMPurify.sanitize(formatUrlForOpening(url)),
                });
            }, children: /\.svg(\?.*)?$/i.test(url) ? (
            // Special handling for SVG images
            _jsx("object", { type: "image/svg+xml", data: DOMPurify.sanitize(url), style: {
                    width: "85%",
                    height: "auto",
                    borderRadius: "4px",
                }, "aria-label": `SVG from ${getSafeHostname(url)}`, children: _jsx("img", { src: DOMPurify.sanitize(url), alt: `SVG from ${getSafeHostname(url)}`, style: {
                        width: "85%",
                        height: "auto",
                        borderRadius: "4px",
                    } }) })) : (_jsx("img", { src: DOMPurify.sanitize(url), alt: `Image from ${getSafeHostname(url)}`, style: {
                    width: "85%",
                    height: "auto",
                    borderRadius: "4px",
                    // Use contain only for very extreme aspect ratios, otherwise use cover
                    objectFit: this.aspectRatio > 3 || this.aspectRatio < 0.33
                        ? "contain"
                        : "cover",
                }, loading: "eager", onLoad: (e) => {
                    // Double-check aspect ratio from the actual loaded image
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        const newAspectRatio = img.naturalWidth / img.naturalHeight;
                        // Update object-fit based on actual aspect ratio
                        // Use contain only for very extreme aspect ratios, otherwise use cover
                        if (newAspectRatio > 3 || newAspectRatio < 0.33) {
                            img.style.objectFit = "contain";
                        }
                        else {
                            img.style.objectFit = "cover";
                        }
                    }
                } })) }));
    }
}
// Create a wrapper component that memoizes the ImagePreview to prevent unnecessary re-renders
const MemoizedImagePreview = React.memo((props) => _jsx(ImagePreview, { ...props }), (prevProps, nextProps) => prevProps.url === nextProps.url);
// Wrap the ImagePreview component with an error boundary
const ImagePreviewWithErrorBoundary = (props) => {
    return (_jsx(ChatErrorBoundary, { errorTitle: "Something went wrong displaying this image", children: _jsx(MemoizedImagePreview, { ...props }) }));
};
export default ImagePreviewWithErrorBoundary;
//# sourceMappingURL=ImagePreview.js.map