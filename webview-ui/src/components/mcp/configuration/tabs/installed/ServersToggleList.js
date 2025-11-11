import { jsx as _jsx } from "react/jsx-runtime";
import ServerRow from "./server-row/ServerRow";
const ServersToggleList = ({ servers, isExpandable, hasTrashIcon, listGap = "medium", }) => {
    const gapClasses = {
        small: "gap-0",
        medium: "gap-2.5",
        large: "gap-5",
    };
    const gapClass = gapClasses[listGap];
    return servers.length > 0 ? (_jsx("div", { className: `flex flex-col ${gapClass}`, children: servers.map((server) => (_jsx(ServerRow, { server: server, isExpandable: isExpandable, hasTrashIcon: hasTrashIcon }, server.name))) })) : (_jsx("div", { className: "flex flex-col items-center gap-3 my-5 text-[var(--vscode-descriptionForeground)]", children: "No MCP servers installed" }));
};
export default ServersToggleList;
//# sourceMappingURL=ServersToggleList.js.map