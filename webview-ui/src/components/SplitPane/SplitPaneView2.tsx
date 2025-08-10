import FullSizeContainer from "../FullSizeContainer";
import SplitPane, {
  Divider,
  SplitPaneLeft,
  SplitPaneRight,
  SplitPaneTop,
} from "./index";

import "./index.css";

const SplitPaneView2 = ({ children }: { children: React.ReactNode[] }) => {
  return (
    <FullSizeContainer className="split-pane">
      <SplitPane className="split-pane-row">
        <SplitPaneLeft className="split-pane-left">{children[0]}</SplitPaneLeft>
        <Divider className="separator-col" />
        <SplitPaneRight>
          <SplitPaneTop>{children[1]}</SplitPaneTop>
          <Divider className="separator-row" />
          {/* Add a SplitPaneBottom if needed */}
        </SplitPaneRight>
      </SplitPane>
    </FullSizeContainer>
  );
};

export default SplitPaneView2;
