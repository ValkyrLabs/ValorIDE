import type { WebviewMessage } from "@shared/WebviewMessage";

export interface AccountLoginSuccessResult {
  token?: string;
  user?: unknown;
}

export const buildAccountLoginSuccessMessage = ({
  token,
  user,
}: AccountLoginSuccessResult): WebviewMessage => ({
  authenticatedPrincipal: user,
  customToken: token,
  type: "accountLoginSuccess",
});
