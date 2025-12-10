import { createServiceRegistry } from "../grpc-service";
import { registerAllMethods } from "./methods";
// Create browser service registry
const browserService = createServiceRegistry("browser");
export const registerMethod = browserService.registerMethod;
// Export the request handler
export const handleBrowserServiceRequest = browserService.handleRequest;
// Register all browser methods
registerAllMethods();
//# sourceMappingURL=index.js.map