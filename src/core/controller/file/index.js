import { createServiceRegistry } from "../grpc-service";
import { registerAllMethods } from "./methods";
// Create file service registry
const fileService = createServiceRegistry("file");
export const registerMethod = fileService.registerMethod;
// Export the request handler
export const handleFileServiceRequest = fileService.handleRequest;
// Register all file methods
registerAllMethods();
//# sourceMappingURL=index.js.map