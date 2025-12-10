import { Principal } from "@thorapi/model/Principal";

export const getJwtToken = (): string | null => {
  try {
    return sessionStorage.getItem("jwtToken");
  } catch {
    return null;
  }
};

export const getCurrentPrincipal = (): Principal | null => {
  try {
    const raw = sessionStorage.getItem("authenticatedPrincipal");
    if (!raw) return null;

    // Parse and reconstruct Principal with REAL model field names
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const safe: any = {
        id: parsed.id,
        username: parsed.username,
        email: parsed.email,
        principalId: parsed.principalId,
        ownerId: parsed.ownerId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        middleName: parsed.middleName,
        phone: parsed.phone,
        bio: parsed.bio,
        avatarUrl: parsed.avatarUrl,
        // STANDARDIZE: Use exact field names from Principal model
        roleList: parsed.roleList || [],
        authorityList: parsed.authorityList || [],
      };
      Object.keys(safe).forEach((k) => safe[k] === undefined && delete safe[k]);
      return safe as Principal;
    }

    return parsed as Principal;
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => !!getJwtToken();
