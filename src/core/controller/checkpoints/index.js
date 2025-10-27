import { createServiceRegistry } from "../grpc-service";
import { registerAllMethods } from "./methods";
// Create checkpoints service registry
const checkpointsService = createServiceRegistry("checkpoints");
export const registerMethod = checkpointsService.registerMethod;
// Export the request handler
export const handleCheckpointsServiceRequest = checkpointsService.handleRequest;
// Register all checkpoints methods
registerAllMethods();
//# sourceMappingURL=index.js.map