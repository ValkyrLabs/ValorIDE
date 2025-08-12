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
import Form from "../Login/form";
import FileExplorer from "../FileExplorer/FileExplorer";

import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeLink,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";

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
  const [activeTab, setActiveTab] = useState<"login" | "account">(
    isAuthenticated ? "account" : "login",
  );

  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useGetBalanceResponsesQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: usageData, isLoading: isUsageLoading } =
    useGetUsageTransactionsQuery(undefined, {
      skip: !isAuthenticated,
    });
  const { data: paymentsData, isLoading: isPaymentsLoading } =
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

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab navigation */}
      <div className="flex gap-2 mb-4">
        <VSCodeButton
          appearance={activeTab === "login" ? "primary" : "secondary"}
          onClick={() => setActiveTab("login")}
        >
          Login
        </VSCodeButton>
        <VSCodeButton
          appearance={activeTab === "account" ? "primary" : "secondary"}
          onClick={() => setActiveTab("account")}
          disabled={false}
        >
          Account
        </VSCodeButton>
      </div>

      {/* Tab content */}
      {activeTab === "login" ? (
        <div className="flex justify-center items-center flex-grow pr-3">
          <Form isLoggedIn={isLoggedIn} />
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
                      end={balanceData?.[0]?.currentBalance || 0}
                      duration={0.66}
                      decimals={2}
                    />
                    <VSCodeButton
                      appearance="icon"
                      className="mt-1"
                      onClick={() => refetchBalance()}
                    >
                      <span className="codicon codicon-refresh"></span>
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

          <FileExplorer
            onFileSelect={handleFileSelect}
            highlightNewFiles={true}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </>
      )}
    </div>
  );
};

export default memo(AccountView);
