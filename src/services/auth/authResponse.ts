import { AxiosResponseHeaders } from "axios";
import type { AuthenticatedUser, AuthTokens } from "./TokenStorageService";

const TOKEN_BODY_FIELDS = [
  "token",
  "jwtToken",
  "jwt",
  "accessToken",
  "access_token",
  "jwtSession",
  "sessionToken",
  "authToken",
  "idToken",
  "id_token",
];

const TOKEN_HEADER_FIELDS = [
  "authorization",
  "jwtSession",
  "x-jwt-token",
  "x-auth-token",
  "x-access-token",
];

const REFRESH_TOKEN_FIELDS = ["refreshToken", "refresh_token"];

const AUTH_BODY_CONTAINERS = [
  undefined,
  "data",
  "result",
  "auth",
  "session",
  "tokens",
];

const getCaseInsensitive = (
  source: Record<string, any> | AxiosResponseHeaders | undefined,
  key: string,
) => {
  if (!source) {
    return undefined;
  }

  const direct = (source as any)[key];
  if (direct !== undefined) {
    return direct;
  }

  const lowerKey = key.toLowerCase();
  const matchingKey = Object.keys(source).find(
    (candidate) => candidate.toLowerCase() === lowerKey,
  );
  return matchingKey ? (source as any)[matchingKey] : undefined;
};

const asTokenString = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  return bearerMatch ? bearerMatch[1].trim() : trimmed;
};

const candidateBodies = (body: any) =>
  AUTH_BODY_CONTAINERS.map((container) =>
    container ? body?.[container] : body,
  ).filter(Boolean);

const extractStringField = (body: any, fields: string[]) => {
  for (const candidate of candidateBodies(body)) {
    for (const field of fields) {
      const value = asTokenString(candidate?.[field]);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
};

export const extractAuthToken = (
  body: any,
  headers?: AxiosResponseHeaders | Record<string, any>,
) => {
  const bodyToken = extractStringField(body, TOKEN_BODY_FIELDS);
  if (bodyToken) {
    return bodyToken;
  }

  for (const field of TOKEN_HEADER_FIELDS) {
    const token = asTokenString(getCaseInsensitive(headers, field));
    if (token) {
      return token;
    }
  }

  return undefined;
};

export const extractRefreshToken = (body: any) =>
  extractStringField(body, REFRESH_TOKEN_FIELDS);

export const extractExpiresAt = (body: any): number | undefined => {
  for (const candidate of candidateBodies(body)) {
    const value = candidate?.expiresAt ?? candidate?.expires_at;
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }

      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) {
        return timestamp;
      }
    }
  }
  return undefined;
};

export const normalizeAuthenticatedUser = (
  value: unknown,
): AuthenticatedUser | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as AuthenticatedUser;
    } catch {
      return undefined;
    }
  }
  return value as AuthenticatedUser;
};

export const extractAuthenticatedUser = (body: any) => {
  for (const candidate of candidateBodies(body)) {
    const user = normalizeAuthenticatedUser(
      candidate?.user ||
        candidate?.principal ||
        candidate?.authenticatedPrincipal,
    );
    if (user) {
      return user;
    }
  }
  return undefined;
};

export const buildAuthTokensFromResponse = (
  body: any,
  headers?: AxiosResponseHeaders | Record<string, any>,
): AuthTokens | undefined => {
  const jwtToken = extractAuthToken(body, headers);
  if (!jwtToken) {
    return undefined;
  }

  return {
    jwtToken,
    apiKey: extractStringField(body, ["apiKey", "api_key"]),
    refreshToken: extractRefreshToken(body),
    expiresAt: extractExpiresAt(body),
  };
};
