import * as Yup from "yup";

export const loginValidationSchema = Yup.object().shape({
  username: Yup.string()
    .trim()
    .min(4, "User Name must be minimum 4 characters")
    .max(100, "User Name must not be more than 100 characters")
    .required("User Name is required"),
  password: Yup.string().required("Password is required"),
});

type LoginFailureInput = {
  error: unknown;
  username?: string;
};

const readErrorData = (error: unknown): any => {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  return (error as any).data ?? error;
};

const readStatus = (error: unknown): number | string | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  return (error as any).status ?? (error as any).originalStatus;
};

const readMessage = (error: unknown): string => {
  const data = readErrorData(error);
  if (typeof data === "string") {
    return data;
  }
  if (typeof data?.message === "string") {
    return data.message;
  }
  if (typeof data?.error === "string") {
    return data.error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "";
};

export const formatLoginFailureMessage = ({
  error,
  username,
}: LoginFailureInput): string => {
  const status = readStatus(error);
  const message = readMessage(error);
  const normalized = message.toLowerCase();
  const userLabel = username ? ` for ${username}` : "";

  if (
    normalized.includes("session expired") ||
    normalized.includes("replaced by another login") ||
    normalized.includes("fresh token")
  ) {
    return "The stored session expired. ValorIDE cleared the stale local session; sign in again.";
  }

  if (status === 403 && normalized.includes("access denied")) {
    return `api-0 rejected the username or password${userLabel}. Verify the account credentials or reset the password.`;
  }

  if (status === 401) {
    return `api-0 did not accept the login${userLabel}. Verify the account credentials.`;
  }

  if (message) {
    return message;
  }

  return `Sign in failed${userLabel}.`;
};
