import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContentDataFlipBoard from "./ContentDataFlipBoard";
import * as contentDataService from "../..//redux/services/ContentDataService";
// Mock the service
vi.mock("../..//redux/services/ContentDataService", () => ({
    useGetContentDatasPagedQuery: vi.fn(),
}));
// Mock three.js
vi.mock("three", () => {
    return {
        Scene: vi.fn(() => ({ add: vi.fn(), background: null })),
        PerspectiveCamera: vi.fn(() => ({
            position: { z: 5 },
            aspect: 1,
            updateProjectionMatrix: vi.fn(),
        })),
        WebGLRenderer: vi.fn(() => ({
            setSize: vi.fn(),
            setPixelRatio: vi.fn(),
            render: vi.fn(),
            dispose: vi.fn(),
            shadowMap: { enabled: false },
        })),
        BoxGeometry: vi.fn(),
        MeshStandardMaterial: vi.fn(() => ({
            opacity: 1,
            transparent: false,
        })),
        Mesh: vi.fn(() => ({
            scale: { lerp: vi.fn() },
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            material: [],
            castShadow: false,
            receiveShadow: false,
            userData: {},
        })),
        AmbientLight: vi.fn(() => ({})),
        DirectionalLight: vi.fn(() => ({
            position: { set: vi.fn() },
            castShadow: false,
        })),
        PointLight: vi.fn(() => ({
            position: { set: vi.fn() },
        })),
        CanvasTexture: vi.fn(),
        Vector3: vi.fn((x, y, z) => ({ x, y, z, lerp: vi.fn() })),
        Color: vi.fn(),
    };
});
const mockContentData = [
    {
        id: "1",
        title: "Test Content 1",
        contentData: "This is test content 1",
        category: "CodeGen",
        status: "published",
        thumbnailImage: undefined,
    },
    {
        id: "2",
        title: "Test Content 2",
        contentData: "This is test content 2",
        category: "Tutorial",
        status: "draft",
        largeImage: undefined,
    },
    {
        id: "3",
        title: "Test Content 3",
        contentData: "This is test content 3",
        category: "Guide",
        status: "published",
        thumbnailImage: undefined,
    },
];
describe("ContentDataFlipBoard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock canvas context to silence jsdom warnings
        Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
            value: vi.fn(() => null),
            writable: true,
        });
    });
    it("renders loading spinner when fetching data", () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: [],
            isLoading: true,
            isFetching: true,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        expect(screen.getByText(/Loading content carousel/i)).toBeInTheDocument();
    });
    it("renders empty state when no data available", () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: [],
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        expect(screen.getByText(/No content available/i)).toBeInTheDocument();
    });
    it("renders flipboard container with canvas", () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        const { container } = render(_jsx(ContentDataFlipBoard, {}));
        const canvasElement = container.querySelector("canvas");
        expect(canvasElement).toBeInTheDocument();
    });
    it("displays current card info", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            expect(screen.getByText("Test Content 1")).toBeInTheDocument();
            expect(screen.getByText(/codegen/i)).toBeInTheDocument();
        });
    });
    it("displays navigation indicators", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        const { container } = render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            const indicators = container.querySelectorAll(".indicator");
            expect(indicators.length).toBe(3);
        });
    });
    it("handles next button click", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            expect(screen.getByText("Test Content 1")).toBeInTheDocument();
        }, { timeout: 2000 });
        const nextButton = screen.getByLabelText(/next/i);
        fireEvent.click(nextButton);
        await waitFor(() => {
            expect(screen.getByText("Test Content 2")).toBeInTheDocument();
        }, { timeout: 2000 });
    });
    it("handles previous button click", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            expect(screen.getByText("Test Content 1")).toBeInTheDocument();
        }, { timeout: 2000 });
        // Click next to go to second item
        const nextButton = screen.getByLabelText("Next");
        fireEvent.click(nextButton);
        await waitFor(() => {
            expect(screen.getByText("Test Content 2")).toBeInTheDocument();
        }, { timeout: 2000 });
        // Click previous to go back
        const prevButton = screen.getByLabelText(/previous/i);
        fireEvent.click(prevButton);
        await waitFor(() => {
            expect(screen.getByText("Test Content 1")).toBeInTheDocument();
        }, { timeout: 2000 });
    });
    it("respects itemsPerPage prop", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        const { container } = render(_jsx(ContentDataFlipBoard, { itemsPerPage: 2 }));
        await waitFor(() => {
            const indicators = container.querySelectorAll(".indicator");
            expect(indicators.length).toBe(2);
        });
    });
    it("disables autoScroll when prop is false", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, { autoScroll: false }));
        await waitFor(() => {
            expect(screen.getByText("Test Content 1")).toBeInTheDocument();
        });
        // Wait a bit longer than typical auto-scroll interval
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Should still be on first item if autoScroll is disabled
        expect(screen.getByText("Test Content 1")).toBeInTheDocument();
    });
    it("handles indicator click for navigation", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        const { container } = render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            expect(screen.getByText("Test Content 1")).toBeInTheDocument();
        });
        // Click on the third indicator
        const indicators = container.querySelectorAll(".indicator");
        fireEvent.click(indicators[2]);
        await waitFor(() => {
            expect(screen.getByText("Test Content 3")).toBeInTheDocument();
        });
    });
    it("displays card count correctly", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            expect(screen.getByText("1 / 3")).toBeInTheDocument();
        });
    });
    it("displays status badge for published content", async () => {
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: mockContentData,
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            expect(screen.getByText("published")).toBeInTheDocument();
        });
    });
    it("handles missing data gracefully", async () => {
        const incompleteData = [
            {
                id: "1",
                // Missing title
            },
        ];
        vi.mocked(contentDataService.useGetContentDatasPagedQuery).mockReturnValue({
            data: incompleteData,
            isLoading: false,
            isFetching: false,
        });
        render(_jsx(ContentDataFlipBoard, {}));
        await waitFor(() => {
            expect(screen.getByText("Untitled")).toBeInTheDocument();
        });
    });
});
//# sourceMappingURL=ContentDataFlipBoard.test.js.map