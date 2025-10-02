import { memo, useState, useCallback, useEffect, useMemo } from "react";

import { UsageTransaction, PaymentTransaction } from "@/thor/model";
import { useGetBalanceResponsesQuery } from "@/thor/redux/services/BalanceResponseService";
import { useAddUsageTransactionMutation, useGetUsageTransactionsQuery } from "@/thor/redux/services/UsageTransactionService";
import { useGetPaymentTransactionsQuery } from "@/thor/redux/services/PaymentTransactionService";
import VSCodeButtonLink from "../common/VSCodeButtonLink";
import ValorIDELogoWhite from "../../assets/ValorIDELogoWhite";
import CountUp from "react-countup";
import CreditsHistoryTable from "./CreditsHistoryTable";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { getApiMetrics } from "@shared/getApiMetrics";
import ApplicationsList from "./ApplicationsList";
import OpenAPIFilePicker from "./OpenAPIFilePicker";
import Form from "../Login/form";
import FileExplorer from "../FileExplorer/FileExplorer";

import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeLink,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import { FaAppStore, FaBackward, FaFileArchive, FaRecycle, FaUserEdit } from "react-icons/fa";
import CoolButton from "../CoolButton";
import { Card } from "react-bootstrap";
import { Login } from "@thor/model";
import { FormikHelpers } from "formik";
import { useLoginUserMutation } from "../../redux/services/AuthService";
import StatusBadge from "@/components/common/StatusBadge";
import OfflineBanner from "@/components/common/OfflineBanner";
import SystemAlerts from "@/components/SystemAlerts";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useCommunicationService } from "@/context/CommunicationServiceContext";
import UserPreferences from "./UserPreferences";

type AccountViewProps = {
  onDone: () => void;
};

const AccountView = ({ onDone }: AccountViewProps) => {
  const { userInfo, authenticatedUser, isLoggedIn, jwtToken } =
    useExtensionState();
  // Read live messages once at top-level to respect Hooks rules
  const { valorideMessages } = useExtensionState();
  // Compute API metrics from messages once using useMemo
  const apiMetrics = useMemo(() => getApiMetrics(valorideMessages || []), [valorideMessages]);

  // Determine authenticated status
  const isAuthenticated = Boolean(
    isLoggedIn || authenticatedUser || userInfo || jwtToken,
  );

  // Also consider presence of a stored JWT to avoid timing gaps
  const hasStoredJwt = useMemo(() => {
    try {
      return Boolean(
        sessionStorage.getItem("jwtToken") ||
        localStorage.getItem("jwtToken") ||
        localStorage.getItem("authToken")
      );
    } catch {
      return false;
    }
  }, [jwtToken]);

  // Local immediate login flag to reveal tabs before context updates
  const [didLogin, setDidLogin] = useState(false);
  const authed = isAuthenticated || didLogin || hasStoredJwt;

  // Default to login tab when unauthenticated, otherwise account
  const [activeTab, setActiveTab] = useState<
    "login" | "account" | "applications" | "generatedFiles" | "userPreferences"
  >(authed ? "account" : "login");

  // Keep active tab in sync with authentication state
  useEffect(() => {
    if (authed) {
      setActiveTab((tab) => (tab === "login" ? "account" : tab));
    } else {
      setActiveTab("login");
    }
  }, [authed]);

  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useGetBalanceResponsesQuery(undefined, {
    skip: false, // Always attempt to fetch applications
    // skip: !isAuthenticated,
  });

  const { data: usageData, isLoading: isUsageLoading, refetch: refetchUsage } =
    useGetUsageTransactionsQuery(undefined, {
      // Use broader auth signal so queries mount as soon as a token exists
      skip: !authed,
    });
  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    refetch: refetchPayments,
  } = useGetPaymentTransactionsQuery(undefined, {
    // Use broader auth signal so queries mount as soon as a token exists
    skip: !authed,
  });

  // Combined loading state
  const loading = isBalanceLoading || isUsageLoading || isPaymentsLoading;

  const [loginUser] = useLoginUserMutation();
  const [addUsageTransaction] = useAddUsageTransactionMutation();

  const handleLogin = async (
    values: Login,
    { setSubmitting }: FormikHelpers<Login>,
  ) => {
    try {
      const result = await loginUser(values).unwrap();
      if (result.token) {
        sessionStorage.setItem("jwtToken", result.token);
        // Persist to localStorage if enabled (default true)
        try {
          const persist = (() => {
            try { const v = localStorage.getItem("valoride.persistJwt"); return v === null ? true : v === "true"; } catch { return true; }
          })();
          if (persist) {
            localStorage.setItem("jwtToken", result.token);
          }
        } catch { /* ignore */ }
        try {
          window.dispatchEvent(
            new CustomEvent("jwt-token-updated", {
              detail: { token: result.token, timestamp: Date.now(), source: "account-login" },
            }),
          );
        } catch { }
        sessionStorage.setItem(
          "authenticatedUser",
          JSON.stringify(result.user),
        );
        // Announce presence + login ACK over websocket
        try {
          const instanceId = (() => {
            try { return localStorage.getItem("valoride.instanceId") || (() => { const id = `valoride-${Math.random().toString(36).substring(2, 12)}`; localStorage.setItem("valoride.instanceId", id); return id; })(); } catch { return `valoride-${Math.random().toString(36).substring(2, 12)}`; }
          })();
          const send = (type: string, payload: any) => {
            const appMessage = {
              type,
              payload,
              senderId: instanceId,
              messageId: Math.random().toString(36).slice(2, 12),
              timestamp: Date.now(),
            };
            window.dispatchEvent(new CustomEvent("websocket-send", { detail: appMessage }));
          };
          send("presence:join", { id: instanceId });
          send("auth:ack", { id: instanceId });
          // Optional roll call broadcast
          send("presence:rollcall", { id: instanceId });
        } catch { /* ignore */ }
        setDidLogin(true);
        setActiveTab("account");

        // Bill a $0.01 "connect" debit once login is established
        try {
          const debit = {
            spentAt: new Date(),
            credits: 0.01,
            modelProvider: "valoride",
            model: "login-connect",
            promptTokens: 0,
            completionTokens: 0,
          } as any;
          await addUsageTransaction(debit).unwrap();
        } catch (e) {
          console.warn("Usage debit failed post-login:", e);
        }
      }
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
        window.dispatchEvent(new CustomEvent("websocket-send", { detail: appMessage }));
      } catch { /* ignore */ }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    vscode.postMessage({ type: "accountLogoutClicked" });
    setDidLogin(false);
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
    if (!communicationService) return;
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
      : phase === "connecting" ? "Connecting..." : "Offline";
  const kind = ready ? "ok" : hasError ? "error" : "warn";

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
        <div className="border border-solid border-[var(--vscode-panel-border)] rounded-md p-[10px] mb-3 bg-[var(--vscode-panel-background)] text-[var(--vscode-foreground)]">
          <div className="mb-2 font-semibold">Active instances</div>
          <div className="flex flex-wrap gap-2">
            {peers.map((id) => (
              <span key={id} style={{
                border: "1px solid var(--vscode-panel-border)",
                borderRadius: 6,
                padding: "2px 6px",
                fontSize: 12,
                background: "var(--vscode-editor-background)",
              }}>{id}</span>
            ))}
          </div>
        </div>
      )}
      <OfflineBanner />
      {/* Tab navigation */}
      <div className="scroll-tabs-container">
        <div className="nav-tabs scroll-tabs">
          {/* Removed Login tab button as requested */}
          {authed && (
            <>
              <div
                className={`nav-link ${activeTab === "account" ? "active" : ""}`}
                onClick={() => setActiveTab("account")}
                style={{ cursor: "pointer" }}
              >
                <FaUserEdit /> Account
              </div>
              <div
                className={`nav-link ${activeTab === "applications" ? "active" : ""}`}
                onClick={() => setActiveTab("applications")}
                style={{ cursor: "pointer" }}
              >
                <FaAppStore /> Applications
              </div>
              <div
                className={`nav-link ${activeTab === "generatedFiles" ? "active" : ""}`}
                onClick={() => setActiveTab("generatedFiles")}
                style={{ cursor: "pointer" }}
              >
                <FaFileArchive /> Files
              </div>
              <div
                className={`nav-link ${activeTab === "userPreferences" ? "active" : ""}`}
                onClick={() => setActiveTab("userPreferences")}
                style={{ cursor: "pointer" }}
              >
                <FaUserEdit /> Preferences
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "login" ? (
        <div className="flex justify-center">
          {!authed && (
            <Card>
              {/* Removed "Login to Access Your Account" header as requested */}
              <Card.Body>
                <Form onSubmit={handleLogin} isLoggedIn={false} />
              </Card.Body>
              <Card.Footer>
                <div
                  style={{ fontSize: "0.85em", color: "var(--vscode-descriptionForeground)" }}
                >
                  Don't have an account?{" "}
                  <VSCodeLink
                    href="https://valkyrlabs.com/sign-up"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Signup Now
                  </VSCodeLink>
                  <br />
                  Forgot your username or password?{" "}
                  <VSCodeLink
                    href="https://valkyrlabs.com/restore-access"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Restore Access
                  </VSCodeLink>
                </div>
              </Card.Footer>
            </Card>
          )}
          {/* When authenticated, login view is hidden and tab list updates */}
        </div>
      ) : activeTab === "applications" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          {loading && (
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px"
            }}>
              <LoadingSpinner label="Loading applications..." size={32} />
            </div>
          )}
          {/* Applications List */}
          <div style={{ marginBottom: "1em" }}>
            <ApplicationsList showTitle={true} title="Available Applications" />
            {/* OpenAPI File Picker */}
            <div style={{ marginBottom: "1em" }}>
              <OpenAPIFilePicker onFileSelected={handleOpenAPIFileSelected} />
            </div>
          </div>
        </div>
      ) : activeTab === "generatedFiles" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <div className="flex-grow flex flex-col min-h-0">
            <h3 style={{ marginBottom: "16px" }}>Generated Files</h3>
            <FileExplorer
              onFileSelect={handleFileSelect}
              highlightNewFiles={true}
              autoRefresh={true}
              refreshInterval={5000}
            />
          </div>
        </div>
      ) : activeTab === "userPreferences" ? (
        <div className="h-full flex flex-col pr-3 overflow-y-auto">
          <div className="flex-grow flex flex-col min-h-0">
            <h3 style={{ marginBottom: "16px" }}>User Preferences</h3>
            <UserPreferences />
          </div>
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
                appearance="secondary"
                onClick={handleLogout}
                className="w-full min-[225px]:w-1/2"
              >
                <FaBackward />
              </VSCodeButton>
            </div>

            <div className="w-full flex flex-col items-center">
              <div className="text-sm text-[var(--vscode-descriptionForeground)] mb-3">
                CURRENT BALANCE
              </div>

              <div className="text-4xl font-bold text-[var(--vscode-foreground)] mb-6 flex items-center gap-2">
                {loading ? (
                  <LoadingSpinner label="Loading balance..." size={28} />
                ) : (
                  <>
                    {(() => {
                      const rawBalance = balanceData?.[0]?.currentBalance || 0;
                      const effectiveBalance = Math.max(0, rawBalance - (apiMetrics.totalCost || 0));
                      return (
                        <>
                          <span>$</span>
                          <CountUp end={effectiveBalance} duration={0.66} decimals={2} />
                        </>
                      );
                    })()}
                    <VSCodeButton
                      appearance="icon"
                      className="mt-1"
                      onClick={() => {
                        refetchBalance();
                        if (authed) {
                          refetchUsage();
                          refetchPayments();
                        }
                      }}
                    >
                      <FaRecycle />
                    </VSCodeButton>
                  </>
                )}
              </div>

              <div className="w-full">
                <VSCodeButtonLink
                  href="https://app.valkyrlabs.com/v1/credits/#buy"
                  className="w-full"
                >
                  Add Credits
                </VSCodeButtonLink>
              </div>
            </div>

            <VSCodeDivider className="mt-6 mb-3 w-full" />

            <div className="flex-grow flex flex-col min-h-0 pb-[0px]">
              <CreditsHistoryTable
                isLoading={loading}
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
