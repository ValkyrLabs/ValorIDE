import {
  DEFAULT_VALKYRAI_HOST,
  deriveWsUrlFromHost,
  getValkyraiHost,
} from "@/utils/valkyraiHost";
export const getValkyraiBasePath = () => getValkyraiHost();
export const getValkyraiWsBase = () =>
  deriveWsUrlFromHost(getValkyraiHost()) ?? "ws://localhost:8080";
export const getDefaultValkyraiHost = () => DEFAULT_VALKYRAI_HOST;
//# sourceMappingURL=serverValkyraiHost.js.map
