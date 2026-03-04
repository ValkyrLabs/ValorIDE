import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGetContentDatasPagedQuery } from "@thorapi/redux/services/ContentDataService";
import LoadingSpinner from "../LoadingSpinner";
import CoolButton from "../CoolButton";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./ContentFlipCard.css";

interface CardData {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    category?: string;
    status?: string;
}

const ContentFlipCard: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const animRef = useRef<number | null>(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [cards, setCards] = useState<CardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFlipping, setIsFlipping] = useState(false);

    const { data: pageData = [], isLoading: isFetching } = useGetContentDatasPagedQuery({ page: 1 });

    useEffect(() => {
        if (pageData && Array.isArray(pageData)) {
            const transformed = pageData.slice(0, 6).map((item: any) => ({
                id: item.id || item.keyHash || Math.random().toString(),
                title: item.title || "Untitled",
                description: item.contentData || item.description || "No description",
                imageUrl: item.thumbnailImage || item.largeImage || undefined,
                category: item.category || "Other",
                status: item.status || "unknown",
            }));
            setCards(transformed);
            setIsLoading(false);
        }
    }, [pageData]);

    useEffect(() => {
        if (!containerRef.current) { return null; }
        const width = containerRef.current.clientWidth || 400;
        const height = 320;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Attach canvas
        const canvas = renderer.domElement;
        if (containerRef.current) {
            containerRef.current.innerHTML = "";
            containerRef.current.appendChild(canvas);
        }

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.5);
        dir.position.set(5, 5, 5);
        scene.add(dir);

        // Card geometry
        const geometry = new THREE.BoxGeometry(3, 2, 0.1);

        const createTextureForIndex = (index: number): THREE.Texture => {
            const canvasTex = document.createElement("canvas");
            const ctx = canvasTex.getContext("2d");
            canvasTex.width = 1024;
            canvasTex.height = 680;
            if (!ctx) return new THREE.Texture();

            // Background aurora gradient
            const g = ctx.createLinearGradient(0, 0, 1024, 680);
            g.addColorStop(0, "#0f0f15");
            g.addColorStop(0.4, "#07172b");
            g.addColorStop(1, "#07172b");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 1024, 680);

            ctx.fillStyle = "rgba(0,255,136,0.06)";
            ctx.fillRect(0, 0, 1024, 680);

            // Title
            const item = cards[index];
            if (item) {
                ctx.fillStyle = "#00ff88";
                ctx.font = "bold 48px Inter, sans-serif";
                ctx.fillText(item.title.substring(0, 40), 60, 120);

                // description
                ctx.fillStyle = "#cbd5e1";
                ctx.font = "18px Inter, sans-serif";
                const desc = item.description?.substring(0, 200) || "";
                ctx.fillText(desc, 60, 160);

                // category badge
                ctx.fillStyle = "#0b1220";
                ctx.fillRect(60, 200, 160, 36);
                ctx.fillStyle = "#00ff88";
                ctx.font = "14px Inter, sans-serif";
                ctx.fillText((item.category || "").toUpperCase(), 70, 226);
            } else {
                ctx.fillStyle = "#00ff88";
                ctx.fillText("No content", 60, 120);
            }

            const texture = new THREE.CanvasTexture(canvasTex);
            texture.needsUpdate = true;
            return texture;
        };

        const materials = [new THREE.MeshStandardMaterial({ color: 0x001f1f }), new THREE.MeshStandardMaterial({ color: 0x001f1f }), new THREE.MeshStandardMaterial({ color: 0x001f1f }), new THREE.MeshStandardMaterial({ color: 0x001f1f }), new THREE.MeshStandardMaterial({ map: createTextureForIndex(currentIndex) }), new THREE.MeshStandardMaterial({ color: 0x081826 })];

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.rotation.y = 0;
        scene.add(mesh);

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        meshRef.current = mesh;

        const animate = () => {
            animRef.current = requestAnimationFrame(animate);
            // hover subtle rotation
            mesh.rotation.y += 0.01 * (isFlipping ? 2 : 1);
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            const w = containerRef.current?.clientWidth || 400;
            const h = height;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (animRef.current) cancelAnimationFrame(animRef.current);
            renderer.dispose();
        };
    }, [cards, currentIndex, isFlipping]);

    const flipToIndex = (idx: number) => {
        if (isFlipping || cards.length === 0) return;
        setIsFlipping(true);
        const targetIndex = ((idx % cards.length) + cards.length) % cards.length;

        // Animate rotation by 180deg
        const mesh = meshRef.current;
        if (!mesh || !rendererRef.current || !cameraRef.current || !sceneRef.current) {
            setIsFlipping(false);
            setCurrentIndex(targetIndex);
            return;
        }

        const duration = 700; // ms
        const start = performance.now();
        const initialRotation = mesh.rotation.y;
        const finalRotation = initialRotation + Math.PI;

        const animate = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            mesh.rotation.y = initialRotation + (finalRotation - initialRotation) * easeInOutCubic(p);

            // At halfway, update texture to next content
            if (p >= 0.5 && mesh.material instanceof Array) {
                (mesh.material as THREE.Material[])[4]['map'] = createCanvasTextureForIndex(targetIndex, cards);
                ((mesh.material as THREE.Material[])[4] as any).map.needsUpdate = true;
            }

            if (p < 1) requestAnimationFrame(animate);
            else {
                setIsFlipping(false);
                setCurrentIndex(targetIndex);
            }
        };

        requestAnimationFrame(animate);
    };

    const handleNext = () => {
        flipToIndex(currentIndex + 1);
    };

    const handlePrevious = () => {
        flipToIndex(currentIndex - 1);
    };

    if (isLoading || isFetching) {
        return <div style={{ display: "flex", justifyContent: "center" }}><LoadingSpinner label="Loading flip card..." /></div>;
    }

    if (cards.length === 0) {
        return <div className="contentflip-empty">No content</div>;
    }

    return (
        <div className="contentflip-wrapper">
            <div className="contentflip-header">
                <h4>Spotlight</h4>
                <div>
                    <CoolButton className="me-2" onClick={handlePrevious}><FaChevronLeft /></CoolButton>
                    <CoolButton onClick={handleNext}><FaChevronRight /></CoolButton>
                </div>
            </div>
            <div className="contentflip-canvas" ref={containerRef} />
            <div className="contentflip-footer">
                <div className="contentflip-title">{cards[currentIndex]?.title}</div>
                <div className="contentflip-desc">{cards[currentIndex]?.description?.substring(0, 110)}...</div>
            </div>
        </div>
    );
};

function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createCanvasTextureForIndex(index: number, cards: CardData[]) {
    const canvasTex = document.createElement("canvas");
    canvasTex.width = 1024;
    canvasTex.height = 680;
    const ctx = canvasTex.getContext("2d");
    if (!ctx) return new THREE.Texture();
    ctx.fillStyle = "#07172b";
    ctx.fillRect(0, 0, 1024, 680);
    const item = cards[index];
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 48px Inter, sans-serif";
    ctx.fillText(item?.title?.substring(0, 40) || "Untitled", 60, 120);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px Inter, sans-serif";
    ctx.fillText(item?.description?.substring(0, 200) || "", 60, 160);
    const texture = new THREE.CanvasTexture(canvasTex);
    texture.needsUpdate = true;
    return texture;
}

export default ContentFlipCard;
