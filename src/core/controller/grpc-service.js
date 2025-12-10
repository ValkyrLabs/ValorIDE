/**
 * Generic service registry for gRPC services
 */
export class ServiceRegistry {
    serviceName;
    methodRegistry = {};
    /**
     * Create a new service registry
     * @param serviceName The name of the service (used for logging)
     */
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    /**
     * Register a method handler
     * @param methodName The name of the method to register
     * @param handler The handler function for the method
     */
    registerMethod(methodName, handler) {
        this.methodRegistry[methodName] = handler;
        console.log(`Registered ${this.serviceName} method: ${methodName}`);
    }
    /**
     * Handle a service request
     * @param controller The controller instance
     * @param method The method name
     * @param message The request message
     * @returns The response message
     */
    async handleRequest(controller, method, message) {
        const handler = this.methodRegistry[method];
        if (!handler) {
            throw new Error(`Unknown ${this.serviceName} method: ${method}`);
        }
        return handler(controller, message);
    }
}
/**
 * Create a service registry factory function
 * @param serviceName The name of the service
 * @returns An object with register and handle functions
 */
export function createServiceRegistry(serviceName) {
    const registry = new ServiceRegistry(serviceName);
    return {
        registerMethod: (methodName, handler) => registry.registerMethod(methodName, handler),
        handleRequest: (controller, method, message) => registry.handleRequest(controller, method, message),
    };
}
//# sourceMappingURL=grpc-service.js.map