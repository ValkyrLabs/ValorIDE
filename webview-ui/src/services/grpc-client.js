import { vscode } from "../utils/vscode";
import { v4 as uuidv4 } from "uuid";
import { BrowserServiceDefinition } from "@shared/proto/browser";
import { CheckpointsServiceDefinition } from "@shared/proto/checkpoints";
import { FileServiceDefinition } from "@shared/proto/file";
import { TaskServiceDefinition } from "@shared/proto/task";
import { McpServiceDefinition } from "@shared/proto/mcp";
// Create a client for any protobuf service with inferred types
function createGrpcClient(service) {
    const client = {};
    // For each method in the service
    Object.values(service.methods).forEach((method) => {
        // Create a function that matches the method signature
        client[method.name] = ((request) => {
            return new Promise((resolve, reject) => {
                const requestId = uuidv4();
                // Set up one-time listener for this specific request
                const handleResponse = (event) => {
                    const message = event.data;
                    if (message.type === "grpc_response" &&
                        message.grpc_response?.request_id === requestId) {
                        // Remove listener once we get our response
                        window.removeEventListener("message", handleResponse);
                        if (message.grpc_response.error) {
                            reject(new Error(message.grpc_response.error));
                        }
                        else {
                            // Convert JSON back to protobuf message
                            const responseType = method.responseType;
                            const response = responseType.fromJSON(message.grpc_response.message);
                            console.log("[DEBUG] grpc-client sending response:", response);
                            resolve(response);
                        }
                    }
                };
                window.addEventListener("message", handleResponse);
                let encodedRequest = {};
                // Handle different types of requests
                if (request === null || request === undefined) {
                    // Empty request
                    encodedRequest = {};
                }
                else if (typeof request.toJSON === "function") {
                    // Proper protobuf object
                    encodedRequest = request.toJSON();
                }
                else if (typeof request === "object") {
                    // Plain JavaScript object
                    encodedRequest = { ...request };
                }
                else {
                    // Fallback
                    encodedRequest = { value: request };
                }
                // Send the request
                vscode.postMessage({
                    type: "grpc_request",
                    grpc_request: {
                        service: service.fullName,
                        method: method.name,
                        message: encodedRequest, // Convert protobuf to JSON
                        request_id: requestId,
                    },
                });
            });
        });
    });
    return client;
}
const BrowserServiceClient = createGrpcClient(BrowserServiceDefinition);
const CheckpointsServiceClient = createGrpcClient(CheckpointsServiceDefinition);
const FileServiceClient = createGrpcClient(FileServiceDefinition);
const TaskServiceClient = createGrpcClient(TaskServiceDefinition);
const McpServiceClient = createGrpcClient(McpServiceDefinition);
export { BrowserServiceClient, CheckpointsServiceClient, FileServiceClient, TaskServiceClient, McpServiceClient, };
//# sourceMappingURL=grpc-client.js.map