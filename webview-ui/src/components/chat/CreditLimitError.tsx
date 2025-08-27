import React from "react";
import VSCodeButtonLink from "@/components/common/VSCodeButtonLink";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import { Invoke } from "@shared/ExtensionMessage";
import { FaCreditCard, FaRecycle } from "react-icons/fa";

interface CreditLimitErrorProps {
  currentBalance: number;
  totalSpent: number;
  totalPromotions: number;
  message: string;
}

const CreditLimitError: React.FC<CreditLimitErrorProps> = ({
  currentBalance,
  totalSpent,
  totalPromotions,
  message,
}) => {
  return (
    <div
      style={{
        backgroundColor: "var(--vscode-textBlockQuote-background)",
        padding: "12px",
        borderRadius: "4px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{ color: "var(--vscode-errorForeground)", marginBottom: "8px" }}
      >
        {message}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: "var(--vscode-foreground)" }}>
          Current Balance:{" "}
          <span style={{ fontWeight: "bold" }}>
            ${currentBalance.toFixed(2)}
          </span>
        </div>
        <div style={{ color: "var(--vscode-foreground)" }}>
          Total Spent: ${totalSpent.toFixed(2)}
        </div>
        <div style={{ color: "var(--vscode-foreground)" }}>
          Total Promotions: ${totalPromotions.toFixed(2)}
        </div>
      </div>

      <VSCodeButtonLink
        href="https://app.valkyrlabs.com/v1/credits/#buy"
        style={{
          width: "100%",
          marginBottom: "8px",
        }}
      >
        <FaCreditCard />
        Buy Credits
      </VSCodeButtonLink>

      <VSCodeButton
        onClick={() => {
          vscode.postMessage({
            type: "invoke",
            text: "primaryButtonClick" satisfies Invoke,
          });
        }}
        appearance="secondary"
        style={{
          width: "100%",
        }}
      >
        <FaRecycle />
        Retry Request
      </VSCodeButton>
    </div>
  );
};

export default CreditLimitError;
