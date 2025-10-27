describe("webview accessControl persistence helpers", () => {
    let storeJwtToken;
    let hydrateStoredCredentials;
    let writeStoredPrincipal;
    let clearStoredJwtToken;
    const createStorage = () => {
        const data = new Map();
        return {
            getItem: (key) => (data.has(key) ? data.get(key) : null),
            setItem: (key, value) => {
                data.set(key, String(value));
            },
            removeItem: (key) => {
                data.delete(key);
            },
            clear: () => data.clear(),
        };
    };
    const setupBrowserGlobals = () => {
        jest.resetModules();
        const sessionStorage = createStorage();
        const localStorage = createStorage();
        const dispatchEvent = jest.fn();
        class MockCustomEvent {
            type;
            detail;
            constructor(type, init) {
                this.type = type;
                this.detail = init?.detail;
            }
        }
        Object.assign(globalThis, {
            window: {
                sessionStorage,
                localStorage,
                dispatchEvent,
            },
            sessionStorage,
            localStorage,
            CustomEvent: MockCustomEvent,
        });
        const module = require("../../webview-ui/src/utils/accessControl");
        storeJwtToken = module.storeJwtToken;
        hydrateStoredCredentials = module.hydrateStoredCredentials;
        writeStoredPrincipal = module.writeStoredPrincipal;
        clearStoredJwtToken = module.clearStoredJwtToken;
        return { dispatchEvent };
    };
    afterEach(() => {
        delete globalThis.window;
        delete globalThis.sessionStorage;
        delete globalThis.localStorage;
        delete globalThis.CustomEvent;
    });
    it("stores JWT tokens in session and local storage when persistence is enabled", () => {
        const { dispatchEvent } = setupBrowserGlobals();
        storeJwtToken("token-123", "test-case");
        expect(window.sessionStorage.getItem("jwtToken")).toBe("token-123");
        expect(window.localStorage.getItem("jwtToken")).toBe("token-123");
        expect(window.localStorage.getItem("authToken")).toBe("token-123");
        expect(dispatchEvent).toHaveBeenCalled();
    });
    it("respects persistence flag and avoids keeping tokens in localStorage when disabled", () => {
        setupBrowserGlobals();
        window.localStorage.setItem("valoride.persistJwt", "false");
        storeJwtToken("token-456", "test-case");
        expect(window.sessionStorage.getItem("jwtToken")).toBe("token-456");
        expect(window.localStorage.getItem("jwtToken")).toBeNull();
        expect(window.localStorage.getItem("authToken")).toBeNull();
    });
    it("hydrates stored credentials from localStorage into sessionStorage", () => {
        const { dispatchEvent } = setupBrowserGlobals();
        const principal = { id: "user-1", username: "persisted" };
        window.localStorage.setItem("jwtToken", "persisted-token");
        window.localStorage.setItem("authenticatedPrincipal", JSON.stringify(principal));
        const result = hydrateStoredCredentials("test-hydrate");
        expect(result.token).toBe("persisted-token");
        expect(result.principal).toMatchObject(principal);
        expect(window.sessionStorage.getItem("jwtToken")).toBe("persisted-token");
        expect(window.sessionStorage.getItem("authenticatedPrincipal")).toBe(JSON.stringify(principal));
        expect(dispatchEvent).toHaveBeenCalled();
        clearStoredJwtToken("test-cleanup");
    });
    it("writes principals to both storage targets to keep sessions sticky", () => {
        setupBrowserGlobals();
        const principal = { id: "user-2", username: "sticky" };
        writeStoredPrincipal(principal);
        const storedSession = window.sessionStorage.getItem("authenticatedPrincipal");
        const storedLocal = window.localStorage.getItem("authenticatedPrincipal");
        expect(storedSession).toBe(JSON.stringify(principal));
        expect(storedLocal).toBe(JSON.stringify(principal));
        expect(window.sessionStorage.getItem("authenticatedUser")).toBe(JSON.stringify(principal));
    });
});
//# sourceMappingURL=accessControl.webview.test.js.map
