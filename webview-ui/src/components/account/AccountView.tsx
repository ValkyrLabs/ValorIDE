import { memo, useState, useCallback } from "react";

import { UsageTransaction, PaymentTransaction } from "@/thor/model";
import { useGetBalanceResponsesQuery } from "@/thor/redux/services/BalanceResponseService";
import { useGetUsageTransactionsQuery } from "@/thor/redux/services/UsageTransactionService";
import { useGetPaymentTransactionsQuery } from "@/thor/redux/services/PaymentTransactionService";
import VSCodeButtonLink from "../common/VSCodeButtonLink";
import ValorIDELogoWhite from "../../assets/ValorIDELogoWhite";
import CountUp from "react-countup";
import CreditsHistoryTable from "./CreditsHistoryTable";
import { useExtensionState } from "@/context/ExtensionStateContext";
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
import { FaRecycle } from "react-icons/fa";
import CoolButton from "../CoolButton";
import { Card } from "react-bootstrap";

type AccountViewProps = {
  onDone: () => void;
};

const AccountView = ({ onDone }: AccountViewProps) => {
  const { userInfo, authenticatedPrincipal, isLoggedIn, jwtToken } =
    useExtensionState();

  // Determine authenticated status
  const isAuthenticated = Boolean(
    isLoggedIn || authenticatedPrincipal || userInfo || jwtToken,
  );

  // Default to login tab when unauthenticated, otherwise account
  const [activeTab, setActiveTab] = useState<"login" | "account" | "applications" | "generatedFiles">(
    isAuthenticated ? "account" : "login",
  );

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
  const { data: paymentsData, isLoading: isPaymentsLoading, refetch: refetchPayments } =
    useGetPaymentTransactionsQuery(undefined, {
      skip: !isAuthenticated,
    });

  // Combined loading state
  const loading = isBalanceLoading || isUsageLoading || isPaymentsLoading;

  const handleLogin = () => {
    vscode.postMessage({ type: "accountLoginClicked" });
  };

  const handleLogout = () => {
    vscode.postMessage({ type: "accountLogoutClicked" });
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

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", margin: "1em", padding: ".5em" }}>
      {/* Tab navigation */}
      <div className="scroll-tabs-container">
        <div className="nav-tabs scroll-tabs">
          <div 
            className={`nav-link ${activeTab === "login" ? "active" : ""}`}
            onClick={() => setActiveTab("login")}
            style={{ cursor: "pointer" }}
          >
            Login
          </div>
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
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "login" ? (
        <div className="flex justify-center">
          {authenticatedPrincipal === null && (
            <Card>
              <Card.Header>
                <h3>Login to Access Your Account</h3>
              </Card.Header>
              <Card.Body>
                <Form isLoggedIn={isLoggedIn} />
              </Card.Body>
              <Card.Footer>
                <div style={{ fontSize: "0.85em", color: "var(--vscode-descriptionForeground)" }}>
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
          {isLoggedIn && (
            <CoolButton>Log Out</CoolButton>
          )}

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
                Log out
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
                    <span>$</span>
                    <CountUp
                      end={balanceData?.[0]?.currentBalance || .10}
                      duration={0.66}
                      decimals={2}
                    />
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
