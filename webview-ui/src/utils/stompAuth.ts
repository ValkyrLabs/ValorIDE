import {
  assertCredentialDestination,
  assertSafeWebSocketUrl,
} from "@shared/CredentialOrigin";
import { getStoredJwtToken } from "./authTokenStorage";
import { getValkyraiHost } from "./valkyraiHost";

/** Bearers travel only in STOMP CONNECT; automatic retries recheck origin. */
export const authenticatedStompOptions = (brokerURL: string) => {
  assertSafeWebSocketUrl(brokerURL, getValkyraiHost());
  const token = getStoredJwtToken(brokerURL);
  if (!token)
    throw new Error(
      "Sign in at the selected backend before connecting to SWARM.",
    );
  const verify = () => {
    assertSafeWebSocketUrl(brokerURL, getValkyraiHost());
    assertCredentialDestination(token, brokerURL);
  };
  verify();
  return {
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${token}` },
    beforeConnect: verify,
    debug: () => {},
  };
};
