import {
  clearStoredPrincipal,
  getPrincipalRoles,
  readStoredPrincipal,
  writeStoredPrincipal,
} from "./accessControl";

describe("accessControl role handling", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearStoredPrincipal();
  });

  it("stores role names (not ids) and exposes them for access checks", () => {
    const principal = {
      id: "user-123",
      username: "demo",
      roles: [
        { roleName: "ADMIN", id: "uuid-admin" },
        { roleName: "EVERYONE", id: "uuid-everyone" },
      ],
      grantedAuthorities: [],
    };

    writeStoredPrincipal(principal as any);

    const storedRaw = sessionStorage.getItem("authenticatedPrincipal");
    expect(storedRaw).toBeTruthy();

    const stored = storedRaw ? JSON.parse(storedRaw) : null;
    expect(stored?.roles).toEqual(["ADMIN", "EVERYONE"]);

    const loaded = readStoredPrincipal();
    expect(loaded?.roles).toEqual(["ADMIN", "EVERYONE"]);

    const roles = getPrincipalRoles(loaded);
    expect(roles).toEqual(
      expect.arrayContaining(["ROLE_ADMIN", "ROLE_EVERYONE"]),
    );
    expect(roles).toHaveLength(2);
  });

  it("preserves billing account identifiers needed for credit balance lookups", () => {
    writeStoredPrincipal({
      id: "user-123",
      username: "demo",
      customerId: "customer-456",
      creditAccountId: "credit-789",
      roles: [],
      grantedAuthorities: [],
    } as any);

    const loaded = readStoredPrincipal() as any;

    expect(loaded?.customerId).toBe("customer-456");
    expect(loaded?.creditAccountId).toBe("credit-789");
  });
});
