import { useEffect, useReducer, useState } from "react";
import type { CSSProperties } from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { useCommunicationService } from "@thorapi/context/CommunicationServiceContext";
import { Notice } from "./Notice";

const OfflineBanner = ({ style, onOpenSettings }: { style?: CSSProperties; onOpenSettings?: () => void }) => {
  const service = useCommunicationService() as any;
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [phase, setPhase] = useState<string>();
  useEffect(() => {
    setPhase(undefined);
    const update = (status?: { phase?: string }) => { setPhase(status?.phase); refresh(); };
    service?.on?.("status", update);
    service?.on?.("error", update);
    return () => { service?.off?.("status", update); service?.off?.("error", update); };
  }, [service]);
  const unavailable = service?.isNoop === true || service?.ready === false || !!service?.error;
  if (!unavailable) return null;
  const connecting = !service?.isNoop && !service?.error && phase === "connecting";
  return <Notice kind={connecting ? "info" : "warn"} style={style}
    action={onOpenSettings && <VSCodeButton appearance="secondary" onClick={onOpenSettings}>Connection settings</VSCodeButton>}>
    {connecting ? "Connecting shared features… Local editing remains available." : "Shared connections are unavailable. Local editing remains available."}
  </Notice>;
};
export default OfflineBanner;
