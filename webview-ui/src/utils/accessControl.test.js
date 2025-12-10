import { clearStoredPrincipal, getPrincipalRoles, readStoredPrincipal, writeStoredPrincipal, } from "./accessControl";
describe("accessControl role handling", () => {
    beforeEach(() => {
        sessionStorage.clear();
        clearStoredPrincipal();
    });
    it("stores role names (not ids) and exposes them for access checks", () => {
        const principal = {
            id: "user-123",
            username: "demo",
            roleList: [
                { roleName: "ADMIN", id: "uuid-admin" },
                { roleName: "EVERYONE", id: "uuid-everyone" },
            ],
            authorityList: [],
        };
        writeStoredPrincipal(principal);
        const storedRaw = sessionStorage.getItem("authenticatedPrincipal");
        expect(storedRaw).toBeTruthy();
        const stored = storedRaw ? JSON.parse(storedRaw) : null;
        expect(stored?.roleList).toEqual(["ADMIN", "EVERYONE"]);
        const loaded = readStoredPrincipal();
        expect(loaded?.roleList).toEqual(["ADMIN", "EVERYONE"]);
        const roles = getPrincipalRoles(loaded);
        expect(roles).toEqual(expect.arrayContaining(["ROLE_ADMIN", "ROLE_EVERYONE"]));
        expect(roles).toHaveLength(2);
    });
});
//# sourceMappingURL=accessControl.test.js.map