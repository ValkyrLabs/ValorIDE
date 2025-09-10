import { memo, useState, useCallback, useEffect, useMemo } from "react";

import { UsageTransaction, PaymentTransaction } from "@/thor/model";
import { useGetBalanceResponsesQuery } from "@/thor/redux/services/BalanceResponseService";
import { useGetUsageTransactionsQuery } from "@/thor/redux/services/UsageTransactionService";
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
import { FaBackward, FaRecycle } from "react-icons/fa";
import CoolButton from "../CoolButton";
import { Card } from "react-bootstrap";
import { Login } from "@thor/model";
import { FormikHelpers } from "formik";
import { useLoginUserMutation } from "../../redux/services/AuthService";
import StatusBadge from "@/components/common/StatusBadge";
import OfflineBanner from "@/components/common/OfflineBanner";
import { useCommunicationService } from "@/context/CommunicationServiceContext";

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

  // Local immediate login flag to reveal tabs before context updates
  const [didLogin, setDidLogin] = useState(false);
  const authed = isAuthenticated || didLogin;

  // Default to login tab when unauthenticated, otherwise account
  const [activeTab, setActiveTab] = useState<
    "login" | "account" | "applications" | "generatedFiles"
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
      skip: !isAuthenticated,
    });
  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    refetch: refetchPayments,
  } = useGetPaymentTransactionsQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Combined loading state
  const loading = isBalanceLoading || isUsageLoading || isPaymentsLoading;

  const [loginUser] = useLoginUserMutation();

  const handleLogin = async (
    values: Login,
    { setSubmitting }: FormikHelpers<Login>,
  ) => {
    try {
      const result = await loginUser(values).unwrap();
      if (result.token) {
        sessionStorage.setItem("jwtToken", result.token);
        try {
          window.dispatchEvent(
            new CustomEvent("jwt-token-updated", {
              detail: { token: result.token, timestamp: Date.now(), source: "account-login" },
            }),
          );
        } catch {}
        sessionStorage.setItem(
          "authenticatedUser",
          JSON.stringify(result.user),
        );
        setDidLogin(true);
        setActiveTab("account");
      }
    } catch (error) {
      console.error("Login failed:", error);
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
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ color: "var(--vscode-foreground)" }}>Account</div>
        <StatusBadge label="Telecom" value={value} kind={kind as any} title={hasError ? String(communicationService.error) : undefined} />
      </div>
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
          {!authed && (
            <div
              className={`nav-link ${activeTab === "login" ? "active" : ""}`}
              onClick={() => setActiveTab("login")}
              style={{ cursor: "pointer" }}
            >
              Login
            </div>
          )}
          {authed && (
            <>
              <div
                className={`nav-link ${activeTab === "account" ? "active" : ""}`}
                onClick={() => setActiveTab("account")}
                style={{ cursor: "pointer" }}
              >
                Account
              </div>
              <div
                className={`nav-link ${activeTab === "applications" ? "active" : ""}`}
                onClick={() => setActiveTab("applications")}
                style={{ cursor: "pointer" }}
              >
                Applications
              </div>
              <div
                className={`nav-link ${activeTab === "generatedFiles" ? "active" : ""}`}
                onClick={() => setActiveTab("generatedFiles")}
                style={{ cursor: "pointer" }}
              >
                Generated Files
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
              <Card.Header>
                <h3>Login to Access Your Account</h3>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleLogin} isLoggedIn={false} />
              </Card.Body>
              <Card.Footer>
                <div
                  style={{ fontSize: "0.85em", color: "var(--vscode-descriptionForeground)" }}
                >
                  Don't have an account?{" "}
                  <VSCodeLink
                    href="https://valkyrlabs.com/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Signup Now
                  </VSCodeLink>
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
          {/* Applications List */}
          <div style={{ marginBottom: "32px" }}>
            {/* OpenAPI File Picker */}
            <div style={{ marginBottom: "32px" }}>
              <OpenAPIFilePicker onFileSelected={handleOpenAPIFileSelected} />
            </div>
            <ApplicationsList showTitle={true} title="Available Applications" />
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
      ) : (
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
                  <div className="text-[var(--vscode-descriptionForeground)]">
                    Loading...
                  </div>
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
                        if (isAuthenticated) {
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
      )}
    </div>
  );
};

export default memo(AccountView);
