import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useGetContentDatasPagedQuery } from "../..//redux/services/ContentDataService";
import LoadingSpinner from "../LoadingSpinner";
import CoolButton from "../CoolButton";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./ContentDataFlipBoard.css";
const ContentDataFlipBoard = ({ itemsPerPage = 5, autoScroll = true, autoScrollInterval = 5000, }) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const cardsRef = useRef([]);
    const animationIdRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredCardIndex, setHoveredCardIndex] = useState(null);
    // Fetch ContentData
    const { data: pageData = [], isLoading: isFetching } = useGetContentDatasPagedQuery({ page: 1 });
    // Transform ContentData to CardData
    useEffect(() => {
        if (pageData && Array.isArray(pageData)) {
            const transformedCards = pageData.slice(0, itemsPerPage).map((item) => ({
                id: item.id || item.keyHash || Math.random().toString(),
                title: item.title || "Untitled",
                description: item.contentData || item.description || "No description",
                imageUrl: item.thumbnailImage || item.largeImage || undefined,
                category: item.category || "Other",
                status: item.status || "unknown",
            }));
            setCards(transformedCards);
            setIsLoading(false);
        }
    }, [pageData, itemsPerPage]);
    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current)
            return undefined;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e27);
        sceneRef.current = scene;
        // Camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        cameraRef.current = camera;
        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        const pointLight = new THREE.PointLight(0x00ff88, 0.5);
        pointLight.position.set(-5, 3, 2);
        scene.add(pointLight);
        // Create card meshes
        cardsRef.current = [];
        const cardGeometry = new THREE.BoxGeometry(2.8, 3.5, 0.1);
        const textCanvas = document.createElement("canvas");
        textCanvas.width = 1024;
        textCanvas.height = 1280;
        const ctx = textCanvas.getContext("2d");
        if (!ctx)
            return undefined;
        cards.forEach((card, index) => {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, 1024, 1280);
            // Border
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 4;
            ctx.strokeRect(20, 20, 984, 1240);
            // Title
            ctx.fillStyle = "#00ff88";
            ctx.font = "bold 48px Inter, sans-serif";
            ctx.textAlign = "left";
            const titleLines = card.title.split(" ").reduce((lines, word) => {
                const lastLine = lines[lines.length - 1] || "";
                const testLine = lastLine ? `${lastLine} ${word}` : word;
                if (ctx.measureText(testLine).width > 900) {
                    lines.push(word);
                }
                else {
                    lines[lines.length - 1] = testLine;
                }
                return lines;
            }, []);
            titleLines.forEach((line, i) => {
                ctx.fillText(line, 60, 120 + i * 60);
            });
            // Category badge
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(60, 320, 200, 50);
            ctx.fillStyle = "#00ff88";
            ctx.font = "14px Inter, sans-serif";
            ctx.fillText(card.category.toUpperCase(), 75, 350);
            // Description
            ctx.fillStyle = "#cbd5e1";
            ctx.font = "18px Inter, sans-serif";
            ctx.textAlign = "left";
            const descLines = card.description.substring(0, 150).split(" ");
            let currentLine = "";
            let yOffset = 420;
            descLines.forEach((word) => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (ctx.measureText(testLine).width > 900) {
                    ctx.fillText(currentLine, 60, yOffset);
                    currentLine = word;
                    yOffset += 30;
                }
                else {
                    currentLine = testLine;
                }
            });
            if (currentLine)
                ctx.fillText(currentLine, 60, yOffset);
            // Status indicator
            const statusColor = card.status === "published" ? "#10b981" : "#f59e0b";
            ctx.fillStyle = statusColor;
            ctx.beginPath();
            ctx.arc(80, 1100, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "16px Inter, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(card.status.charAt(0).toUpperCase() + card.status.slice(1), 120, 1110);
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(textCanvas);
            const cardMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.3,
                roughness: 0.6,
                emissive: 0x003d2a,
                emissiveIntensity: 0.2,
            });
            const backMaterial = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                metalness: 0.4,
                roughness: 0.5,
            });
            const edgeMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff88,
                metalness: 0.7,
                roughness: 0.3,
            });
            const materials = [
                edgeMaterial,
                edgeMaterial,
                edgeMaterial,
                edgeMaterial,
                cardMaterial,
                backMaterial,
            ];
            const card3d = new THREE.Mesh(cardGeometry, materials);
            card3d.castShadow = true;
            card3d.receiveShadow = true;
            // Position cards in a curved carousel
            const angle = (index / cards.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 6;
            card3d.position.x = Math.cos(angle) * radius;
            card3d.position.y = Math.sin(angle) * radius * 0.3;
            card3d.position.z = Math.sin(angle) * 2;
            card3d.rotation.y = angle + Math.PI / 2;
            card3d.userData.baseRotation = { ...card3d.rotation };
            card3d.userData.basePosition = { ...card3d.position };
            card3d.userData.index = index;
            scene.add(card3d);
            cardsRef.current.push(card3d);
        });
        // Animation loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            cardsRef.current.forEach((card, idx) => {
                const distance = Math.abs(idx - currentIndex);
                const isCurrent = idx === currentIndex;
                const targetScale = isCurrent ? 1.1 : 0.85;
                const targetOpacity = distance > 2 ? 0.3 : 1;
                card.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
                if (card.material instanceof Array) {
                    card.material.forEach((mat) => {
                        if (mat instanceof THREE.MeshStandardMaterial) {
                            mat.opacity = targetOpacity;
                            mat.transparent = true;
                        }
                    });
                }
                // Gentle floating animation
                const time = Date.now() * 0.001;
                card.position.y =
                    (card.userData.basePosition?.y || 0) + Math.sin(time + idx) * 0.1;
                // Hover rotation
                if (hoveredCardIndex === idx) {
                    card.rotation.x += 0.02;
                }
                else {
                    card.rotation.x *= 0.95;
                }
            });
            renderer.render(scene, camera);
        };
        animate();
        // Handle resize
        const handleResize = () => {
            if (!containerRef.current)
                return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
            renderer.dispose();
        };
    }, [currentIndex, hoveredCardIndex, cards]);
    // Auto-scroll effect
    useEffect(() => {
        if (!autoScroll || cards.length === 0)
            return undefined;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % cards.length);
        }, autoScrollInterval);
        return () => clearInterval(interval);
    }, [autoScroll, autoScrollInterval, cards.length]);
    const handlePrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, [cards.length]);
    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, [cards.length]);
    if (isLoading || isFetching) {
        return (_jsx("div", { className: "flipboard-loading", children: _jsx(LoadingSpinner, { label: "Loading content carousel..." }) }));
    }
    if (cards.length === 0) {
        return (_jsx("div", { className: "flipboard-empty", children: _jsx("p", { children: "No content available" }) }));
    }
    return (_jsxs("div", { className: "flipboard-container", ref: containerRef, children: [_jsx("canvas", { ref: canvasRef, className: "flipboard-canvas" }), _jsxs("div", { className: "flipboard-controls", children: [_jsx(CoolButton, { variant: "dark", onClick: handlePrevious, className: "flipboard-nav-btn flipboard-prev", "aria-label": "Previous", children: _jsx(FaChevronLeft, { size: 20 }) }), _jsx("div", { className: "flipboard-indicators", children: cards.map((_, idx) => (_jsx("div", { className: `indicator ${idx === currentIndex ? "active" : ""}`, onClick: () => setCurrentIndex(idx) }, idx))) }), _jsx(CoolButton, { variant: "dark", onClick: handleNext, className: "flipboard-nav-btn flipboard-next", "aria-label": "Next", children: _jsx(FaChevronRight, { size: 20 }) })] }), cards[currentIndex] && (_jsxs("div", { className: "flipboard-info", children: [_jsx("h2", { children: cards[currentIndex].title }), _jsx("p", { className: "flipboard-category", children: cards[currentIndex].category }), _jsxs("p", { className: "flipboard-description", children: [cards[currentIndex].description.substring(0, 200), "..."] }), _jsxs("div", { className: "flipboard-meta", children: [_jsx("span", { className: "flipboard-status", children: cards[currentIndex].status }), _jsxs("span", { className: "flipboard-count", children: [currentIndex + 1, " / ", cards.length] })] })] }))] }));
};
export default ContentDataFlipBoard;
//# sourceMappingURL=ContentDataFlipBoard.js.map