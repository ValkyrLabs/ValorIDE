import { memo, useState } from "react";

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

  // Use the computed authentication state from ExtensionStateContext
  // This ensures consistency with the backend state and handles all authentication scenarios
  const isAuthenticated = Boolean(
    isLoggedIn || authenticatedPrincipal || userInfo || jwtToken,
  );
  const currentUser = authenticatedPrincipal || userInfo;

  // Debug logging to help identify the issue
  console.log("AccountView render:", {
    userInfo,
    authenticatedPrincipal,
    isLoggedIn,
    jwtToken: !!jwtToken,
    isAuthenticated,
    currentUser,
  });

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

  // Combine loading states
  const loading = isBalanceLoading || isUsageLoading || isPaymentsLoading;

  const handleLogin = () => {
    vscode.postMessage({ type: "accountLoginClicked" });
  };

  const handleLogout = () => {
    vscode.postMessage({ type: "accountLogoutClicked" });
  };

  if (isAuthenticated) {
    return (
      <div className="h-full flex flex-col pr-3 overflow-y-auto">
        <div className="max-h-48 overflow-y-auto mb-4">
          <ApplicationsList showTitle={true} title="Available Applications" />
        </div>

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
    );
  }

  return (
    <div className="flex flex-col items-center pr-3">
      <ValorIDELogoWhite className="size-16 mb-4" />

      <div className="flex justify-between items-center mb-[17px] pr-[17px]">
        <Form />
      </div>
    </div>
  );
};

export default memo(AccountView);
