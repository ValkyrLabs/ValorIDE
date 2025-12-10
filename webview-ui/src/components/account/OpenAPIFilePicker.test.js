import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OpenAPIFilePicker from "./OpenAPIFilePicker";
import * as vscodeModule from "../../utils/vscode";
// Polyfill File.text for the jsdom environment
if (!File.prototype.text) {
    Object.defineProperty(File.prototype, "text", {
        value: function text() {
            if (typeof FileReader !== "undefined") {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsText(this);
                });
            }
            return Promise.resolve("");
        },
    });
}
// Mock vscode
vi.mock("../../utils/vscode", () => ({
    vscode: {
        postMessage: vi.fn(),
    },
}));
describe("OpenAPIFilePicker - Validation & Upload", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe("Component Rendering", () => {
        it("should render component with Select File button", () => {
            render(_jsx(OpenAPIFilePicker, {}));
            expect(screen.getByText("Select File")).toBeInTheDocument();
            expect(screen.getByText("Import Application from OpenAPI")).toBeInTheDocument();
        });
    });
    describe("File Extension Validation", () => {
        it("should reject .txt files", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(["invalid"], "test.txt", { type: "text/plain" });
            fireEvent.change(fileInput, { target: { files: [file] } });
            await waitFor(() => {
                expect(screen.getByText(/Please select a valid OpenAPI spec file/)).toBeInTheDocument();
            });
        });
        it("should reject .pdf files", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(["pdf data"], "test.pdf", {
                type: "application/pdf",
            });
            fireEvent.change(fileInput, { target: { files: [file] } });
            await waitFor(() => {
                expect(screen.getByText(/Please select a valid OpenAPI spec file/)).toBeInTheDocument();
            });
        });
    });
    describe("JSON Upload & Validation", () => {
        it("should send valid JSON OpenAPI spec to extension", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const validJson = JSON.stringify({
                openapi: "3.0.0",
                info: { title: "Test API", version: "1.0.0" },
                paths: { "/test": { get: {} } },
            });
            const file = new File([validJson], "test.json", {
                type: "application/json",
            });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(vscodeModule.vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    type: "uploadOpenAPISpec",
                    filename: "test.json",
                    fileContent: validJson,
                }));
            });
        });
        it("should reject JSON without openapi version", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const invalidJson = JSON.stringify({
                info: { title: "Test" },
                paths: {},
            });
            const file = new File([invalidJson], "test.json", {
                type: "application/json",
            });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(screen.getByText(/missing 'openapi' or 'swagger' version/i)).toBeInTheDocument();
            });
        });
        it("should reject malformed JSON", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const malformedJson = '{"invalid": "json"';
            const file = new File([malformedJson], "test.json", {
                type: "application/json",
            });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(screen.getByText(/Invalid file format/)).toBeInTheDocument();
            });
        });
    });
    describe("YAML Upload & Validation", () => {
        it("should send valid YAML OpenAPI spec to extension", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const yamlContent = "openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0\npaths: {}";
            const file = new File([yamlContent], "test.yaml", { type: "text/yaml" });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(vscodeModule.vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    type: "uploadOpenAPISpec",
                    filename: "test.yaml",
                    fileContent: yamlContent,
                }));
            });
        });
        it("should send valid YML (alternate extension) to extension", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const ymlContent = "openapi: 3.0.0\ninfo:\n  title: API\n  version: 1.0\npaths: {}";
            const file = new File([ymlContent], "test.yml", { type: "text/yaml" });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(vscodeModule.vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    type: "uploadOpenAPISpec",
                    filename: "test.yml",
                }));
            });
        });
        it("should reject empty YAML", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const emptyYaml = "";
            const file = new File([emptyYaml], "test.yaml", { type: "text/yaml" });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(screen.getByText(/empty/i)).toBeInTheDocument();
            });
        });
        it("should reject YAML without openapi/swagger key", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const invalidYaml = "info:\n  title: Test\n  version: 1.0\npaths: {}";
            const file = new File([invalidYaml], "test.yaml", { type: "text/yaml" });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(screen.getByText(/does not appear to be an OpenAPI specification/)).toBeInTheDocument();
            });
        });
        it("should accept Swagger 2.0 YAML format", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const swaggerYaml = 'swagger: "2.0"\ninfo:\n  title: Test\n  version: 1.0\npaths: {}';
            const file = new File([swaggerYaml], "test.yaml", { type: "text/yaml" });
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                expect(vscodeModule.vscode.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    type: "uploadOpenAPISpec",
                }));
            });
        });
    });
    describe("Message Dispatch Structure", () => {
        it("should include jwtToken in the message when available", async () => {
            window.sessionStorage.setItem("jwtToken", "test-jwt-token");
            vi.spyOn(window.sessionStorage, "getItem").mockReturnValue("test-jwt-token");
            globalThis.__TEST_JWT__ = "test-jwt-token";
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const content = "openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0\npaths: {}";
            const file = new File([content], "spec.yaml");
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                const call = vscodeModule.vscode.postMessage.mock.calls[0][0];
                expect(call).toHaveProperty("jwtToken", "test-jwt-token");
            });
        });
        it("should include filename, fileContent, and fileSize in message", async () => {
            render(_jsx(OpenAPIFilePicker, {}));
            const fileInput = document.querySelector('input[type="file"]');
            const content = "openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0\npaths: {}";
            const file = new File([content], "spec.yaml");
            fireEvent.change(fileInput, { target: { files: [file] } });
            const uploadButton = screen.getByText("Upload");
            fireEvent.click(uploadButton);
            await waitFor(() => {
                const call = vscodeModule.vscode.postMessage.mock.calls[0][0];
                expect(call).toHaveProperty("type", "uploadOpenAPISpec");
                expect(call).toHaveProperty("filename", "spec.yaml");
                expect(call).toHaveProperty("fileContent", content);
                expect(call).toHaveProperty("fileSize");
                expect(typeof call.fileSize).toBe("number");
            });
        });
    });
});
//# sourceMappingURL=OpenAPIFilePicker.test.js.map