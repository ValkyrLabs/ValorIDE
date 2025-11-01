import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

import { vscode } from "@/utils/vscode";
import { useExtensionState } from "@/context/ExtensionStateContext";

export const ValorIDEAccountInfoCard = () => {
  const { authenticatedUser } = useExtensionState();
  const user = authenticatedUser;

  const handleLogin = () => {
    vscode.postMessage({ type: "accountLoginClicked" });
  };

  const handleLogout = () => {
    // First notify extension to clear API keys and state
    vscode.postMessage({ type: "accountLogoutClicked" });
    // Then sign out of valkyrai
    // handleSignOut()
  };

  const handleShowAccount = () => {
    vscode.postMessage({ type: "showAccountViewClicked" });
  };

  return (
    <div className="max-w-[600px]">
      {user ? (
        <VSCodeButton appearance="secondary" onClick={handleShowAccount}>
          View Account
        </VSCodeButton>
      ) : (
        // <div className="p-2 rounded-[2px] bg-[var(--vscode-dropdown-background)]">
        // 	<div className="flex items-center gap-3">
        // 		{user.avatarUrl ? (
        // 			<img src={user.avatarUrl} alt="Profile" className="w-[38px] h-[38px] rounded-full flex-shrink-0" />
        // 		) : (
        // 			<div className="w-[38px] h-[38px] rounded-full bg-[var(--vscode-button-background)] flex items-center justify-center text-xl text-[var(--vscode-button-foreground)] flex-shrink-0">
        // 				{user.username?.[0] || user.email?.[0] || "?"}
        // 			</div>
        // 		)}
        // 		<div className="flex flex-col gap-1 flex-1 overflow-hidden">
        // 			{user.username && (
        // 				<div className="text-[13px] font-bold text-[var(--vscode-foreground)] break-words">
        // 					{user.username}
        // 				</div>
        // 			)}
        // 			{user.email && (
        // 				<div className="text-[13px] text-[var(--vscode-descriptionForeground)] break-words overflow-hidden text-ellipsis">
        // 					{user.email}
        // 				</div>
        // 			)}
        // 			<div className="flex gap-2 flex-wrap mt-1">

        // 				<VSCodeButton
        // 					appearance="secondary"
        // 					onClick={handleLogout}
        // 					className="scale-[0.85] origin-left w-fit mt-0.5 mb-0 -mr-3">
        // 					Log out
        // 				</VSCodeButton>
        // 			</div>
        // 		</div>
        // 	</div>
        // </div>
        <div>
          <VSCodeButton onClick={handleLogin} className="mt-0">
            Create your FREE Valkyr Labs Account
          </VSCodeButton>
        </div>
      )}
    </div>
  );
};
