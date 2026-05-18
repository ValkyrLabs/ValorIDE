import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  writeStoredPrincipal,
  storeJwtToken,
  hydrateStoredCredentials,
  clearStoredPrincipal,
  clearStoredJwtToken,
} from "../accessControl";
// Mock storage for Node.js environment
const createMockStorage = () => {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key: (index) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};
describe("Sticky Auth Persistence", () => {
  beforeEach(() => {
    // Setup mock storage
    global.localStorage = createMockStorage();
    global.sessionStorage = createMockStorage();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  describe("storeJwtToken", () => {
    it("should store JWT token in both sessionStorage and localStorage", () => {
      const token = "test-jwt-token-12345";
      storeJwtToken(token, "test-source");
      expect(sessionStorage.getItem("jwtToken")).toBe(token);
      expect(localStorage.getItem("jwtToken")).toBe(token);
    });
    it("should clear token when null is passed", () => {
      const token = "test-jwt-token-12345";
      storeJwtToken(token, "test-source");
      storeJwtToken(null, "test-source");
      expect(sessionStorage.getItem("jwtToken")).toBeNull();
      expect(localStorage.getItem("jwtToken")).toBeNull();
    });
  });
  describe("writeStoredPrincipal", () => {
    it("should store principal in both sessionStorage and localStorage", () => {
      const principal = {
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        password: "",
        roleList: [],
        authorityList: [],
      };
      writeStoredPrincipal(principal);
      const storedSession = sessionStorage.getItem("authenticatedPrincipal");
      const storedLocal = localStorage.getItem("authenticatedPrincipal");
      expect(storedSession).not.toBeNull();
      expect(storedLocal).not.toBeNull();
      expect(storedSession).toBe(storedLocal);
    });
    it("should clear principal when null is passed", () => {
      const principal = {
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        password: "",
        roleList: [],
        authorityList: [],
      };
      writeStoredPrincipal(principal);
      writeStoredPrincipal(null);
      expect(sessionStorage.getItem("authenticatedPrincipal")).toBeNull();
      expect(localStorage.getItem("authenticatedPrincipal")).toBeNull();
    });
  });
  describe("hydrateStoredCredentials", () => {
    it("should restore JWT token from localStorage to sessionStorage", () => {
      const token = "restored-jwt-token";
      localStorage.setItem("jwtToken", token);
      const { token: restoredToken } = hydrateStoredCredentials("test");
      expect(restoredToken).toBe(token);
      expect(sessionStorage.getItem("jwtToken")).toBe(token);
    });
    it("should restore principal from localStorage to sessionStorage", () => {
      const principal = {
        id: "user-456",
        username: "restoreduser",
        email: "restored@example.com",
        password: "",
        roleList: [],
        authorityList: [],
      };
      localStorage.setItem("authenticatedPrincipal", JSON.stringify(principal));
      const { principal: restoredPrincipal } = hydrateStoredCredentials("test");
      expect(restoredPrincipal).not.toBeNull();
      expect(restoredPrincipal?.id).toBe(principal.id);
      expect(restoredPrincipal?.username).toBe(principal.username);
    });
    it("should return both token and principal when both exist", () => {
      const token = "test-token";
      const principal = {
        id: "user-789",
        username: "fulluser",
        email: "full@example.com",
        password: "",
        roleList: [],
        authorityList: [],
      };
      localStorage.setItem("jwtToken", token);
      localStorage.setItem("authenticatedPrincipal", JSON.stringify(principal));
      const { token: restoredToken, principal: restoredPrincipal } =
        hydrateStoredCredentials("test");
      expect(restoredToken).toBe(token);
      expect(restoredPrincipal?.id).toBe(principal.id);
    });
  });
  describe("clearStoredJwtToken", () => {
    it("should clear JWT token from both storages", () => {
      const token = "token-to-clear";
      storeJwtToken(token, "test");
      clearStoredJwtToken("test");
      expect(sessionStorage.getItem("jwtToken")).toBeNull();
      expect(localStorage.getItem("jwtToken")).toBeNull();
    });
  });
  describe("clearStoredPrincipal", () => {
    it("should clear principal from both storages", () => {
      const principal = {
        id: "user-to-clear",
        username: "clearuser",
        email: "clear@example.com",
        password: "",
        roleList: [],
        authorityList: [],
      };
      writeStoredPrincipal(principal);
      clearStoredPrincipal("test");
      expect(sessionStorage.getItem("authenticatedPrincipal")).toBeNull();
      expect(localStorage.getItem("authenticatedPrincipal")).toBeNull();
    });
  });
  describe("Sticky Auth Scenario", () => {
    it("should maintain auth across page reload simulation", () => {
      // Step 1: User logs in
      const token = "persistent-jwt-token";
      const principal = {
        id: "user-persistent",
        username: "persistentuser",
        email: "persistent@example.com",
        password: "",
        roleList: [],
        authorityList: [],
      };
      storeJwtToken(token, "login");
      writeStoredPrincipal(principal);
      // Verify credentials are stored
      expect(localStorage.getItem("jwtToken")).toBe(token);
      expect(localStorage.getItem("authenticatedPrincipal")).not.toBeNull();
      // Step 2: Clear sessionStorage (simulating page reload)
      sessionStorage.clear();
      // Step 3: App initializes and hydrates from localStorage
      const { token: restoredToken, principal: restoredPrincipal } =
        hydrateStoredCredentials("app-init");
      expect(restoredToken).toBe(token);
      expect(restoredPrincipal?.id).toBe(principal.id);
      expect(restoredPrincipal?.username).toBe(principal.username);
      // Step 4: SessionStorage is now populated
      expect(sessionStorage.getItem("jwtToken")).toBe(token);
      expect(sessionStorage.getItem("authenticatedPrincipal")).not.toBeNull();
    });
    it("should allow logout to clear all auth", () => {
      // Setup
      const token = "logout-test-token";
      const principal = {
        id: "user-logout",
        username: "logoutuser",
        email: "logout@example.com",
        password: "",
        roleList: [],
        authorityList: [],
      };
      storeJwtToken(token, "login");
      writeStoredPrincipal(principal);
      // Verify stored
      expect(localStorage.getItem("jwtToken")).not.toBeNull();
      expect(localStorage.getItem("authenticatedPrincipal")).not.toBeNull();
      // Logout
      clearStoredJwtToken("logout");
      clearStoredPrincipal("logout");
      // Verify cleared
      expect(sessionStorage.getItem("jwtToken")).toBeNull();
      expect(localStorage.getItem("jwtToken")).toBeNull();
      expect(sessionStorage.getItem("authenticatedPrincipal")).toBeNull();
      expect(localStorage.getItem("authenticatedPrincipal")).toBeNull();
    });
  });
});
//# sourceMappingURL=stickyAuth.test.js.map
