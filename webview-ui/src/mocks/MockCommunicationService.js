// This is a mock service for testing purposes.
// It simulates the behavior of the actual CommunicationService.
export class MockCommunicationService {
    isNoop;
    constructor() {
        // Default to false, meaning the service is considered available
        this.isNoop = false;
    }
}
// Export a default instance or a factory if needed by your tests
// For this specific test, we are mocking the hook directly and returning an instance of this class.
export default MockCommunicationService;
//# sourceMappingURL=MockCommunicationService.js.map