import { Login, Principal } from "@thorapi/model";
import { vscode } from "@thorapi/utils/vscode";

export interface ExtensionLoginResult {
  token: string;
  user?: Principal;
}

const REQUEST_TIMEOUT_MS = 20000;

const parsePrincipal = (value: unknown): Principal | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Principal;
    } catch {
      return undefined;
    }
  }
  return value as Principal;
};

const createRequestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `account-login-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const loginThroughExtensionHost = (
  values: Pick<Login, "username" | "password">,
): Promise<ExtensionLoginResult> => {
  const requestId = createRequestId();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Login request timed out."));
    }, REQUEST_TIMEOUT_MS);

    function onMessage(event: MessageEvent) {
      const message = event.data;
      if (
        message?.type !== "accountLoginResult" ||
        message?.requestId !== requestId
      ) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);

      if (!message.success) {
        reject(new Error(message.error || "Login failed."));
        return;
      }

      const token = message.token || message.customToken;
      if (!token) {
        reject(new Error("Login response did not include a token."));
        return;
      }

      resolve({
        token,
        user: parsePrincipal(message.authenticatedPrincipal),
      });
    }

    window.addEventListener("message", onMessage);
    vscode.postMessage({
      type: "accountLoginRequest",
      requestId,
      username: values.username,
      password: values.password,
    });
  });
};
