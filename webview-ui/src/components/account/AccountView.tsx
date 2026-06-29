import {
  memo,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import "./AccountView.css";

import { useGetAccountBalanceQuery as useGetCreditAccountBalanceQuery } from "@thorapi/services/creditsApi";
import VSCodeButtonLink from "../common/VSCodeButtonLink";
import ValorIDELogoWhite from "../../assets/ValorIDELogoWhite";
import CountUp from "react-countup";
import CreditsHistoryTable from "./CreditsHistoryTable";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import ApplicationsList from "./ApplicationsList";
import OpenAPIFilePicker from "./OpenAPIFilePicker";
import LoginForm from "../Login/form";
import SignupForm from "../Signup/form";
import FileExplorer from "../FileExplorer/FileExplorer";
import ContextPagePanel from "./ContextPagePanel";
import ReceiptTraceInspector from "./ReceiptTraceInspector";
import TenantAppGenerationPanel from "./TenantAppGenerationPanel";

import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeLink,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@thorapi/utils/vscode";
import {
  FaAppStore,
  FaBackward,
  FaBrain,
  FaFileArchive,
  FaHammer,
  FaNetworkWired,
  FaCreditCard,
  FaReceipt,
  FaRecycle,
  FaUserEdit,
  FaServer,
} from "react-icons/fa";
import ServerConsole from "../ServerConsole";
import CoolButton from "../CoolButton";
import { Card } from "react-bootstrap";
import { Login } from "@thorapi/model";
import { FormikHelpers } from "formik";
import { useLoginUserMutation } from "../../redux/services/AuthService";
import StatusBadge from "@thorapi/components/common/StatusBadge";
import OfflineBanner from "@thorapi/components/common/OfflineBanner";
import SystemAlerts from "@thorapi/components/SystemAlerts";
import LoadingSpinner from "@thorapi/components/LoadingSpinner";
import { useCommunicationService } from "@thorapi/context/CommunicationServiceContext";
import UserPreferences from "./UserPreferences";
// import BuyCredits from "@thorapi/components/BuyCredits";
import {
  clearStoredAuthSession,
  storeJwtToken,
  useAccessControl,
  writeStoredPrincipal,
  readStoredPrincipal,
} from "@thorapi/utils/accessControl";
import { getStoredJwtToken } from "@thorapi/utils/authTokenStorage";
import { CreditIntent } from "@thorapi/types/creditIntent";
import { buildAccountLoginSuccessMessage } from "./accountAuthBridge";
import { loginThroughExtensionHost } from "./extensionLogin";
import CapabilityCommandCenter from "../agentic/CapabilityCommandCenter";
import type { AgenticCapabilityCommandCenterState } from "@shared/AgenticState";

type AccountTab =
  | "login"
  | "signup"
  | "account"
  | "applications"
  | "appGeneration"
  | "contextPage"
  | "generatedFiles"
  | "receipts"
  | "swarm"
  | "agenticCommandCenter"
  | "userPreferences"
  | "serverConsole";

type AccountViewProps = {
  onDone: () => void;
  serverConsoleNeedsAttention: boolean;
  initialActiveTab?: AccountTab;
  onConsumeInitialActiveTab?: () => void;
  initialSwarmCommandResponse?: Record<string, unknown>;
  onConsumeInitialSwarmCommandResponse?: () => void;
  onClearServerConsoleNeedsAttention: () => void;
  creditIntent?: CreditIntent;
  onClearCreditIntent?: () => void;
};

const firstFiniteNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return undefined;
};

const formatCreditCount = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));

const firstNonEmptyString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const stringValue = String(value).trim();
    if (stringValue) {
      return stringValue;
    }
  }
  return undefined;
};

const resolveCreditAccountKey = (principal?: Record<string, any> | null) => {
  return firstNonEmptyString(
    principal?.customerId,
    principal?.creditAccountId,
    principal?.billingAccountId,
    principal?.accountId,
    principal?.customer?.id,
    principal?.account?.id,
  );
};

const hasUnmeteredAccountAccess = (
  principal?: Record<string, any> | null,
  balance?: Record<string, any> | null,
) => {
  const plan = firstNonEmptyString(
    balance?.plan,
    balance?.billingPlan,
    principal?.plan,
    principal?.billingPlan,
  )?.toLowerCase();
  return (
    balance?.unmetered === true ||
    principal?.unmetered === true ||
    plan === "unmetered"
  );
};

const AccountView = ({
  onDone,
  serverConsoleNeedsAttention,
  onClearServerConsoleNeedsAttention,
  initialActiveTab,
  onConsumeInitialActiveTab,
  initialSwarmCommandResponse,
  onConsumeInitialSwarmCommandResponse,
  creditIntent,
  onClearCreditIntent,
}: AccountViewProps) => {
  const {
    userInfo,
    authenticatedUser,
    isLoggedIn,
    jwtToken,
    advancedSettings,
    agenticState,
  } = useExtensionState();
  // Local immediate login flag to reveal tabs before context updates
  const [didLogin, setDidLogin] = useState(false);

  // Also consider stored credentials to avoid auth hydration timing gaps.
  const storedAuth = useMemo(() => {
    try {
      const storedPrincipal = readStoredPrincipal();
      const storedToken = getStoredJwtToken();
      return {
        hasStoredJwt: Boolean(storedPrincipal && storedToken),
        storedToken,
        storedPrincipal,
      };
    } catch {
      return { hasStoredJwt: false, storedToken: null, storedPrincipal: null };
    }
  }, [jwtToken, didLogin]);

  const { hasStoredJwt, storedPrincipal, storedToken } = storedAuth;
  const hasAuthIdentity = Boolean(
    authenticatedUser || userInfo || hasStoredJwt,
  );
  const hasBackendAuth = Boolean(jwtToken || didLogin || hasStoredJwt);
  const authed = hasAuthIdentity && hasBackendAuth;

  // Default to login tab when unauthenticated, otherwise account
  const [activeTab, setActiveTab] = useState<AccountTab>(
    authed ? "account" : "login",
  );
  const tabRefs = useRef<Partial<Record<AccountTab, HTMLButtonElement | null>>>(
    {},
  );

  // Keep active tab in sync with authentication state
  useEffect(() => {
    if (authed) {
      setActiveTab((tab) =>
        tab === "login" || tab === "signup" ? "account" : tab,
      );
    } else {
      setActiveTab((tab) =>
        tab === "login" || tab === "signup" ? tab : "login",
      );
    }
  }, [authed]);

  useEffect(() => {
    if (!initialActiveTab) return;
    if (
      !authed &&
      initialActiveTab !== "login" &&
      initialActiveTab !== "signup"
    ) {
      setActiveTab("login");
    } else {
      setActiveTab(initialActiveTab);
    }
    onConsumeInitialActiveTab?.();
  }, [authed, initialActiveTab, onConsumeInitialActiveTab]);

  useEffect(() => {
    if (!initialSwarmCommandResponse) return;
    setActiveTab(authed ? "receipts" : "login");
  }, [authed, initialSwarmCommandResponse]);

  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (!activeTabElement?.scrollIntoView) {
      return;
    }
    activeTabElement.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeTab]);

  const { principal: resolvedPrincipal } = useAccessControl(
    authenticatedUser || userInfo || storedPrincipal,
  );
  const accountId =
    resolveCreditAccountKey(resolvedPrincipal as Record<string, any>) ||
    (hasBackendAuth ? "me" : "");
  const balanceAccountId = accountId || (hasBackendAuth ? "me" : "");
  const {
    data: creditBalanceData,
    isLoading: isCreditBalanceLoading,
    isFetching: isCreditBalanceFetching,
    error: creditBalanceError,
    refetch: refetchCreditBalance,
  } = useGetCreditAccountBalanceQuery(balanceAccountId, {
    skip: !balanceAccountId || !hasBackendAuth,
  });

  const lastBalanceRefreshKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!balanceAccountId || !hasBackendAuth) {
      lastBalanceRefreshKeyRef.current = undefined;
      return;
    }

    const refreshKey = `${balanceAccountId}:${jwtToken || storedToken || "session"}`;
    if (lastBalanceRefreshKeyRef.current === refreshKey) {
      return;
    }
    lastBalanceRefreshKeyRef.current = refreshKey;
    void refetchCreditBalance();
  }, [
    balanceAccountId,
    hasBackendAuth,
    jwtToken,
    refetchCreditBalance,
    storedToken,
  ]);

  // Combined loading state
  const loading = isCreditBalanceLoading || isCreditBalanceFetching;
  const usageData = creditBalanceData?.usageTransactions || [];
  const paymentsData = creditBalanceData?.payments || [];
  const hasUnmeteredAccess = hasUnmeteredAccountAccess(
    resolvedPrincipal as Record<string, any>,
    creditBalanceData as Record<string, any>,
  );

  const effectiveBalance = useMemo(() => {
    const rawBalance =
      firstFiniteNumber(creditBalanceData?.currentBalance) ?? 0;
    return Math.max(0, rawBalance);
  }, [creditBalanceData?.currentBalance]);
  const criticalBalanceThreshold =
    advancedSettings?.budgetAlerts?.criticalThreshold;
  const shouldShowBuyCredits =
    !hasUnmeteredAccess &&
    (creditIntent ||
      criticalBalanceThreshold === undefined ||
      effectiveBalance <= Number(criticalBalanceThreshold));

  const [loginUser] = useLoginUserMutation();
  const handleLogin = async (
    values: Login,
    { setSubmitting }: FormikHelpers<Login>,
  ) => {
    try {
      const result = vscode.isAvailable()
        ? await loginThroughExtensionHost(values)
        : await loginUser(values).unwrap();
      if (result.token) {
        storeJwtToken(result.token, "account-login");
      }
      if (result.user) {
        writeStoredPrincipal(result.user as any);
      }
      vscode.postMessage(buildAccountLoginSuccessMessage(result));

      try {
        const instanceId = (() => {
          try {
            return (
              localStorage.getItem("valoride.instanceId") ||
              (() => {
                const id = `valoride-${Math.random()
                  .toString(36)
                  .substring(2, 12)}`;
                localStorage.setItem("valoride.instanceId", id);
                return id;
              })()
            );
          } catch {
            return `valoride-${Math.random().toString(36).substring(2, 12)}`;
          }
        })();

        const send = (type: string, payload: any) => {
          const appMessage = {
            type,
            payload,
            senderId: instanceId,
            messageId: Math.random().toString(36).slice(2, 12),
            timestamp: Date.now(),
          };
          window.dispatchEvent(
            new CustomEvent("websocket-send", { detail: appMessage }),
          );
        };

        send("presence:join", { id: instanceId });
        send("auth:ack", { id: instanceId });
        send("presence:rollcall", { id: instanceId });
      } catch {
        // ignore transport issues
      }

      setDidLogin(true);
      setActiveTab("account");
    } catch (error) {
      console.error("Login failed:", error);
      try {
        const instanceId = localStorage.getItem("valoride.instanceId") || "";
        const appMessage = {
          type: "auth:nack",
          payload: { id: instanceId },
          senderId: instanceId || "",
          messageId: Math.random().toString(36).slice(2, 12),
          timestamp: Date.now(),
        } as any;
        window.dispatchEvent(
          new CustomEvent("websocket-send", { detail: appMessage }),
        );
      } catch {
        // ignore transport issues
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearStoredAuthSession("account-logout");
    vscode.postMessage({ type: "accountLogoutClicked" });
    setDidLogin(false);
    setActiveTab("login");
  };

  const handleFileSelect = useCallback((filePath: string) => {
    vscode.postMessage({
      type: "openMention",
      text: filePath,
    });
  }, []);

  const handleOpenAPIFileSelected = useCallback((file: File) => {
    console.log("OpenAPI file selected:", file.name);
  }, []);

  const communicationService = useCommunicationService() as any;
  const [peers, setPeers] = useState<string[]>([]);
  const [phase, setPhase] = useState<string | undefined>(undefined);
  const ready = !!communicationService?.ready;
  const hasError = !!communicationService?.error;
  const hubConnected = !!communicationService?.hubConnected;
  const thorConnected = !!communicationService?.thorConnected;
  useEffect(() => {
    if (!communicationService) {
      return undefined;
    }
    const handlePresence = (list: string[]) => setPeers(list);
    const handleStatus = (s: any) => setPhase(s?.phase);
    communicationService.on?.("presence", handlePresence);
    communicationService.on?.("status", handleStatus);
    return () => {
      communicationService.off?.("presence", handlePresence);
      communicationService.off?.("status", handleStatus);
    };
  }, [communicationService]);
  const value = ready
    ? hubConnected && thorConnected
      ? "Online (Hub+Server)"
      : hubConnected
        ? "Online (Local)"
        : "Online (Server)"
    : hasError
      ? "Error"
      : phase === "connecting"
        ? "Connecting..."
        : "Offline";
  const kind = ready ? "ok" : hasError ? "error" : "warn";
  const typedAgenticState = agenticState as
    | AgenticCapabilityCommandCenterState
    | undefined;
  const swarmStatus = typedAgenticState?.swarm?.status ?? "offline";
  const swarmKind =
    swarmStatus === "online" || swarmStatus === "busy"
      ? "ok"
      : swarmStatus === "error" || swarmStatus === "rejected"
        ? "error"
        : "warn";
  const swarmLabel = swarmStatus
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const swarmDetail =
    typedAgenticState?.swarm?.instanceId ||
    typedAgenticState?.swarm?.lastError ||
    "No SWARM registration ACK yet.";
  const accountTabs = useMemo<
    Array<{
      key: Exclude<AccountTab, "login">;
      label: string;
      title: string;
      icon: ReactNode;
      needsAttention?: boolean;
    }>
  >(
    () => [
      {
        key: "account",
        label: "Account",
        title: "Account",
        icon: <FaUserEdit />,
      },
      {
        key: "applications",
        label: "Apps",
        title: "Applications",
        icon: <FaAppStore />,
      },
      {
        key: "appGeneration",
        label: "Build",
        title: "App Generation",
        icon: <FaHammer />,
      },
      {
        key: "contextPage",
        label: "Context",
        title: "Context Pages",
        icon: <FaBrain />,
      },
      {
        key: "generatedFiles",
        label: "Files",
        title: "Generated Files",
        icon: <FaFileArchive />,
      },
      {
        key: "receipts",
        label: "Receipts",
        title: "Receipts",
        icon: <FaReceipt />,
      },
      {
        key: "swarm",
        label: "SWARM",
        title: "SWARM",
        icon: <FaNetworkWired />,
      },
      {
        key: "agenticCommandCenter",
        label: "Command",
        title: "Agentic Command Center",
        icon: <FaBrain />,
      },
      {
        key: "serverConsole",
        label: "Console",
        title: "Server Console",
        icon: <FaServer />,
        needsAttention: serverConsoleNeedsAttention,
      },
      {
        key: "userPreferences",
        label: "Prefs",
        title: "User Preferences",
        icon: <FaUserEdit />,
      },
    ],
    [serverConsoleNeedsAttention],
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        margin: "1em",
        padding: ".5em",
        position: "relative",
      }}
    >
      <SystemAlerts />

      {peers.length > 0 && (
        <div className="border border-solid border-(--vscode-panel-border) rounded-md p-2.5 mb-3 bg-(--vscode-panel-background) text-(--vscode-foreground)">
          <div className="mb-2 font-semibold">Active instances</div>
          <div className="flex flex-wrap gap-2">
            {peers.map((id) => (
              <span
                key={id}
                style={{
                  border: "1px solid var(--vscode-panel-border)",
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 12,
                  background: "var(--vscode-editor-background)",
                }}
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      {authed && (
        <nav className="lcars-account-tab-container" aria-label="Account tabs">
          <div className="lcars-account-tabs lcars-variant-cyan" role="tablist">
            {accountTabs.map((tab) => (
              <button
                key={tab.key}
                ref={(element) => {
                  tabRefs.current[tab.key] = element;
                }}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`lcars-account-tab-link ${activeTab === tab.key ? "active" : ""} ${tab.needsAttention ? "needs-attention" : ""}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === "serverConsole") {
                    onClearServerConsoleNeedsAttention();
                  }
                }}
                title={tab.title}
                aria-label={tab.title}
              >
                {tab.icon}
                <span className="account-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Tab content */}
      {activeTab === "login" ? (
        <div className="flex justify-center">
          {!authed && (
            <Card>
              {/* Removed "Login to Access Your Account" header as requested */}
              <Card.Body>
                <LoginForm onSubmit={handleLogin} isLoggedIn={false} />
              </Card.Body>
              <Card.Footer>
                <div
                  style={{
                    fontSize: "0.85em",
                    color: "var(--vscode-descriptionForeground)",
                  }}
                >
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("signup")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--vscode-textLink-foreground)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Signup Now
                  </button>
                  <br />
                  Forgot your username?{" "}
                  <VSCodeLink
                    href="https://valkyrlabs.com/forgot-password"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Forgot Password
                  </VSCodeLink>
                </div>
              </Card.Footer>
            </Card>
          )}
          {/* When authenticated, login view is hidden and tab list updates */}
        </div>
      ) : activeTab === "signup" ? (
        <div className="flex justify-center">
          {!authed && (
            <Card>
              <Card.Body>
                <SignupForm />
              </Card.Body>
              <Card.Footer>
                <div
                  style={{
                    fontSize: "0.85em",
                    color: "var(--vscode-descriptionForeground)",
                  }}
                >
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--vscode-textLink-foreground)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Sign in
                  </button>
                </div>
              </Card.Footer>
            </Card>
          )}
        </div>
      ) : activeTab === "applications" ? (
        <div className="account-applications-panel h-full flex flex-col pr-3 overflow-hidden">
          {loading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "200px",
              }}
            >
              <LoadingSpinner label="Loading applications..." size={32} />
            </div>
          )}
          <div className="account-applications-content">
            <OpenAPIFilePicker
              onFileSelected={handleOpenAPIFileSelected}
              onOpenEditor={() =>
                vscode.postMessage({ type: "openOpenAPIEditor" })
              }
            />
            <ApplicationsList showTitle={true} title="Applications" />
          </div>
        </div>
      ) : activeTab === "appGeneration" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <TenantAppGenerationPanel accountId={accountId} />
        </div>
      ) : activeTab === "contextPage" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <ContextPagePanel accountId={accountId} />
        </div>
      ) : activeTab === "generatedFiles" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <div className="grow flex flex-col min-h-0">
            <h3 style={{ marginBottom: "16px" }}>Generated Files</h3>
            <FileExplorer
              onFileSelect={handleFileSelect}
              highlightNewFiles={true}
              autoRefresh={true}
              refreshInterval={5000}
            />
          </div>
        </div>
      ) : activeTab === "receipts" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <ReceiptTraceInspector
            accountId={accountId}
            initialSwarmCommandResponse={initialSwarmCommandResponse}
            onConsumeInitialSwarmCommandResponse={
              onConsumeInitialSwarmCommandResponse
            }
          />
        </div>
      ) : activeTab === "swarm" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <div className="grow flex flex-col min-h-0">
            <h3 style={{ marginBottom: "16px" }}>SWARM</h3>
            <div
              style={{
                border: "1px solid var(--vscode-panel-border)",
                borderRadius: 6,
                padding: 12,
                background: "var(--vscode-panel-background)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <strong>Local Agent Registration</strong>
                <StatusBadge
                  label="Status"
                  value={swarmLabel || "Offline"}
                  kind={swarmKind as any}
                  title={swarmDetail}
                />
              </div>
              <p
                style={{
                  color: "var(--vscode-descriptionForeground)",
                  fontSize: 12,
                  marginBottom: 12,
                  overflowWrap: "anywhere",
                }}
              >
                {swarmDetail}
              </p>
              <VSCodeButton
                appearance="secondary"
                onClick={() => vscode.postMessage({ type: "webviewDidLaunch" })}
              >
                Retry SWARM
              </VSCodeButton>
            </div>
          </div>
        </div>
      ) : activeTab === "agenticCommandCenter" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <div className="grow flex flex-col min-h-0">
            <h3 style={{ marginBottom: "16px" }}>Agentic Command Center</h3>
            <CapabilityCommandCenter />
          </div>
        </div>
      ) : activeTab === "userPreferences" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <div className="grow flex flex-col min-h-0">
            <h3 style={{ marginBottom: "16px" }}>User Preferences</h3>
            <UserPreferences />
          </div>
        </div>
      ) : activeTab === "serverConsole" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <ServerConsole />
        </div>
      ) : activeTab === "account" ? (
        <>
          <div className="h-full flex flex-col pr-3 overflow-y-auto">
            <div className="w-full flex gap-2 flex-col min-[225px]:flex-row mt-4">
              <div className="w-full min-[225px]:w-1/2">
                <VSCodeButtonLink
                  href="https://valkyrlabs.com/dashboard"
                  appearance="primary"
                  className="w-full"
                >
                  Dashboard
                </VSCodeButtonLink>
              </div>
              <VSCodeButton
                aria-label="Log out"
                appearance="secondary"
                title="Log out"
                onClick={handleLogout}
                className="w-full min-[225px]:w-1/2"
              >
                <FaBackward />
              </VSCodeButton>
            </div>

            <div className="w-full flex flex-col items-center">
              <div className="text-sm text-(--vscode-descriptionForeground) mb-3">
                CURRENT BALANCE
              </div>

              <div className="text-4xl font-bold text-(--vscode-foreground) mb-6 flex items-center gap-2">
                {loading ? (
                  <LoadingSpinner label="Loading balance..." size={28} />
                ) : (
                  <>
                    <FaCreditCard aria-hidden="true" />
                    {creditBalanceError ? (
                      <span style={{ fontSize: "0.45em" }}>Unable to load</span>
                    ) : hasUnmeteredAccess ? (
                      <span data-testid="unmetered-balance">Unlimited</span>
                    ) : (
                      <CountUp
                        end={effectiveBalance}
                        duration={0.66}
                        decimals={0}
                        separator=","
                      />
                    )}
                    {!hasUnmeteredAccess && (
                      <VSCodeButton
                        appearance="icon"
                        className="mt-1"
                        disabled={!balanceAccountId && !authed}
                        onClick={async () => {
                          if (balanceAccountId) {
                            await refetchCreditBalance();
                          }
                        }}
                      >
                        <FaRecycle />
                      </VSCodeButton>
                    )}
                  </>
                )}
              </div>

              <div className="w-full flex flex-col items-center">
                {creditIntent && (
                  <div
                    data-testid="credit-intent-panel"
                    style={{
                      border: "1px solid var(--vscode-panel-border)",
                      borderRadius: 8,
                      padding: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                      Finish this action: {creditIntent.actionName}
                    </div>
                    <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                      Balance {formatCreditCount(creditIntent.currentBalance)} ·
                      Need {formatCreditCount(creditIntent.requiredCredits)} ·
                      Suggested top-up{" "}
                      {formatCreditCount(
                        Math.max(5, Math.ceil(creditIntent.requiredCredits)),
                      )}
                    </div>
                    {(creditIntent.resumeUrl || creditIntent.originView) && (
                      <VSCodeButton
                        appearance="secondary"
                        onClick={() => {
                          if (creditIntent.resumeUrl) {
                            vscode.postMessage({
                              type: "openInBrowser",
                              url: creditIntent.resumeUrl,
                            });
                          }
                          onClearCreditIntent?.();
                          onDone();
                        }}
                      >
                        {creditIntent.resumeLabel || "Resume"}
                      </VSCodeButton>
                    )}
                  </div>
                )}
                {shouldShowBuyCredits && (
                  <VSCodeButton
                    appearance="primary"
                    className="w-full mt-2"
                    style={{
                      width: "100%",
                      backgroundColor: "#0f5132",
                      borderColor: "#198754",
                      color: "#fff",
                    }}
                    onClick={() => {
                      vscode.postMessage({
                        type: "openInBrowser",
                        url: "https://valkyrlabs.com/buy-credits",
                      });
                    }}
                    data-testid="buy-credits-btn"
                  >
                    Buy Credits
                  </VSCodeButton>
                )}
              </div>
            </div>

            <VSCodeDivider className="mt-6 mb-3 w-full" />

            <div className="grow flex flex-col min-h-0 pb-0">
              <CreditsHistoryTable
                isLoading={loading}
                error={creditBalanceError}
                usageData={usageData || []}
                paymentsData={paymentsData || []}
              />
            </div>
          </div>
        </>
      ) : (
        <>nothing selected</>
      )}
    </div>
  );
};

export default memo(AccountView);
