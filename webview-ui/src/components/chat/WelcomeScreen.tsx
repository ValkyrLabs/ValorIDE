import React from "react";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import TelemetryBanner from "@thorapi/components/common/TelemetryBanner";
import Announcement from "@thorapi/components/chat/Announcement";
import HistoryPreview from "@thorapi/components/history/HistoryPreview";
import AutoApproveMenu from "@thorapi/components/chat/AutoApproveMenu";
import ValorMark from "../../assets/ValorIDELogoWhite";

interface WelcomeScreenProps {
  version: string;
  telemetrySetting: string;
  showAnnouncement: boolean;
  hideAnnouncement: () => void;
  taskHistory: any[];
  showHistoryView: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  version,
  telemetrySetting,
  showAnnouncement,
  hideAnnouncement,
  taskHistory,
  showHistoryView,
}) => {
  return (
    <>
      <div
        style={{
          flex: "1",
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "10px",
        }}
      >
        {telemetrySetting === "unset" && <TelemetryBanner />}
        {showAnnouncement && (
          <Announcement version={version} hideAnnouncement={hideAnnouncement} />
        )}
        <section className="valoride-chat-welcome" aria-labelledby="chat-welcome-title">
          <a className="valoride-wordmark" href="https://valkyrlabs.com/valoride"><ValorMark aria-hidden="true" />ValorIDE</a>
          <h2 id="chat-welcome-title">What are we building?</h2>
          <p>Describe a change, ask about your code, or bring a file into the conversation.</p>
          <VSCodeLink href="https://valkyrlabs.com/thorapi">Explore ThorAPI</VSCodeLink>
        </section>
        {taskHistory.length > 0 && (
          <HistoryPreview showHistoryView={showHistoryView} />
        )}
      </div>

      <AutoApproveMenu
        style={{
          marginBottom: -2,
          flex: "0 1 auto",
          minHeight: 0,
        }}
      />
    </>
  );
};

export default WelcomeScreen;
