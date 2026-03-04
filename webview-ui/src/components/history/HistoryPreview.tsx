import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import { vscode } from "@thorapi/utils/vscode";
import { memo } from "react";
import { formatLargeNumber } from "@thorapi/utils/format";
import { FaComments, FaDollarSign, FaHistory } from "react-icons/fa";
import CoolButton from "../CoolButton";
import { Card } from "react-bootstrap";

type HistoryPreviewProps = {
  showHistoryView: () => void;
};

const HistoryPreview = ({ showHistoryView }: HistoryPreviewProps) => {
  const { taskHistory } = useExtensionState();
  const handleHistorySelect = (id: string) => {
    vscode.postMessage({ type: "showTaskWithId", text: id });
  };

  const formatDate = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);

    // Normalize to midnight for day comparisons
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Format just the time portion
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (date >= today) {
      return `TODAY AT: ${timeStr}`;
    }

    if (date >= yesterday && date < today) {
      return `YESTERDAY AT: ${timeStr}`;
    }

    // Fallback: full formatted date
    return date
      .toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(", ", " ")
      .toUpperCase();
  };

  return (
    <div style={{ padding: "1em", flexShrink: 0 }}>
      {/* Using global aurora .history-preview-item styles */}

      <h4>
        <FaComments />{" "} Recent Tasks
      </h4>

      <div style={{ padding: "1em" }}>
        {taskHistory
          .filter((item) => item.ts && item.task)
          .slice(0, 3)
          .map((item) => (
            <Card
              style={{ cursor: "pointer", maxHeight: "8em", margin: "1em" }}
              key={item.id}
              /*className="history-preview-item"*/
              onClick={() => handleHistorySelect(item.id)}
            >

              <Card.Header style={{ cursor: "pointer", maxHeight: ".5em", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span
                  className="timestamp"
                >
                  {formatDate(item.ts)}
                </span>

              </Card.Header>

              <Card.Body
                style={{ cursor: "pointer", fontSize: "0.8em", padding: "1em" }}
              >
                <span className="task-text">{item.task}</span>
                <span>
                  Tokens: ↑{formatLargeNumber(item.tokensIn || 0)} ↓
                  {formatLargeNumber(item.tokensOut || 0)}
                </span>
                {!!item.cacheWrites && (
                  <>
                    {" • "}
                    <span>
                      Cache: +{formatLargeNumber(item.cacheWrites || 0)} →{" "}
                      {formatLargeNumber(item.cacheReads || 0)}
                    </span>
                  </>
                )}
                {!!item.totalCost && (
                  <b>
                    {" • "}
                    <span>
                      <FaDollarSign />
                      API Cost: ${item.totalCost?.toFixed(4)}
                    </span>
                  </b>
                )}
              </Card.Body>

            </Card>
          ))}
        <div
          style={{
            marginTop: "5em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CoolButton
            onClick={() => showHistoryView()}
            customStyle={{
              width: "100%",
              fontSize: "1em",
              fontWeight: "bold",
              color: "black"
            }}
          >
            <FaHistory /> View all history
          </CoolButton>
        </div>
      </div>
    </div>
  );
};

export default memo(HistoryPreview);
