import { createServiceRegistry } from "../grpc-service";
import { registerAllMethods } from "./methods";
// Create MCP service registry
const mcpService = createServiceRegistry("mcp");
export const registerMethod = mcpService.registerMethod;
// Export the request handler
export const handleMcpServiceRequest = mcpService.handleRequest;
// Register all mcp methods
registerAllMethods();
//# sourceMappingURL=index.js.map