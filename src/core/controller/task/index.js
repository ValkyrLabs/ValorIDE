import { createServiceRegistry } from "../grpc-service";
import { registerAllMethods } from "./methods";
// Create task service registry
const taskService = createServiceRegistry("task");
export const registerMethod = taskService.registerMethod;
// Export the request handler
export const handleTaskServiceRequest = taskService.handleRequest;
// Register all task methods
registerAllMethods();
//# sourceMappingURL=index.js.map