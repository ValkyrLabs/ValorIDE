import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { useGetBalanceResponsesQuery } from "@/thor/redux/services/BalanceResponseService";
import { useAddUsageTransactionMutation, useGetUsageTransactionsQuery } from "@/thor/redux/services/UsageTransactionService";
import { useGetPaymentTransactionsQuery } from "@/thor/redux/services/PaymentTransactionService";
import VSCodeButtonLink from "../common/VSCodeButtonLink";
import CountUp from "react-countup";
import CreditsHistoryTable from "./CreditsHistoryTable";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { getApiMetrics } from "@shared/getApiMetrics";
import ApplicationsList from "./ApplicationsList";
import OpenAPIFilePicker from "./OpenAPIFilePicker";
import Form from "../Login/form";
import FileExplorer from "../FileExplorer/FileExplorer";
import { VSCodeButton, VSCodeDivider, VSCodeLink, } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import { FaAppStore, FaBackward, FaFileArchive, FaRecycle, FaUserEdit } from "react-icons/fa";
import { Card } from "react-bootstrap";
import { useLoginUserMutation } from "../../redux/services/AuthService";
import OfflineBanner from "@/components/common/OfflineBanner";
import SystemAlerts from "@/components/SystemAlerts";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useCommunicationService } from "@/context/CommunicationServiceContext";
import UserPreferences from "./UserPreferences";
import BuyCredits from "../BuyCredits";
import { storeJwtToken, writeStoredPrincipal } from "@/utils/accessControl";
const AccountView = ({ onDone }) => {
    const { userInfo, authenticatedUser, isLoggedIn, jwtToken } = useExtensionState();
    // Read live messages once at top-level to respect Hooks rules
    const { valorideMessages } = useExtensionState();
    // Compute API metrics from messages once using useMemo
    const apiMetrics = useMemo(() => getApiMetrics(valorideMessages || []), [valorideMessages]);
    // Determine authenticated status
    const isAuthenticated = Boolean(isLoggedIn || authenticatedUser || userInfo || jwtToken);
    // Also consider presence of a stored JWT to avoid timing gaps
    const hasStoredJwt = useMemo(() => {
        try {
            return Boolean(sessionStorage.getItem("jwtToken") ||
                localStorage.getItem("jwtToken") ||
                localStorage.getItem("authToken"));
        }
        catch {
            return false;
        }
    }, [jwtToken]);
    // Local immediate login flag to reveal tabs before context updates
    const [didLogin, setDidLogin] = useState(false);
    const authed = isAuthenticated || didLogin || hasStoredJwt;
    // Default to login tab when unauthenticated, otherwise account
    const [activeTab, setActiveTab] = useState(authed ? "account" : "login");
    // Keep active tab in sync with authentication state
    useEffect(() => {
        if (authed) {
            setActiveTab((tab) => (tab === "login" ? "account" : tab));
        }
        else {
            setActiveTab("login");
        }
    }, [authed]);
    const { data: balanceData, isLoading: isBalanceLoading, refetch: refetchBalance, } = useGetBalanceResponsesQuery(undefined, {
        skip: false, // Always attempt to fetch applications
        // skip: !isAuthenticated,
    });
    const { data: usageData, isLoading: isUsageLoading, refetch: refetchUsage } = useGetUsageTransactionsQuery(undefined, {
        // Use broader auth signal so queries mount as soon as a token exists
        skip: !authed,
    });
    const { data: paymentsData, isLoading: isPaymentsLoading, refetch: refetchPayments, } = useGetPaymentTransactionsQuery(undefined, {
        // Use broader auth signal so queries mount as soon as a token exists
        skip: !authed,
    });
    // Combined loading state
    const loading = isBalanceLoading || isUsageLoading || isPaymentsLoading;
    const [loginUser] = useLoginUserMutation();
    const [addUsageTransaction] = useAddUsageTransactionMutation();
    const handleLogin = async (values, { setSubmitting }) => {
        try {
            const result = await loginUser(values).unwrap();
            if (result.token) {
                storeJwtToken(result.token, "account-login");
            }
            if (result.user) {
                writeStoredPrincipal(result.user);
            }
            try {
                const instanceId = (() => {
                    try {
                        return (localStorage.getItem("valoride.instanceId") ||
                            (() => {
                                const id = `valoride-${Math.random()
                                    .toString(36)
                                    .substring(2, 12)}`;
                                localStorage.setItem("valoride.instanceId", id);
                                return id;
                            })());
                    }
                    catch {
                        return `valoride-${Math.random()
                            .toString(36)
                            .substring(2, 12)}`;
                    }
                })();
                const send = (type, payload) => {
                    const appMessage = {
                        type,
                        payload,
                        senderId: instanceId,
                        messageId: Math.random().toString(36).slice(2, 12),
                        timestamp: Date.now(),
                    };
                    window.dispatchEvent(new CustomEvent("websocket-send", { detail: appMessage }));
                };
                send("presence:join", { id: instanceId });
                send("auth:ack", { id: instanceId });
                send("presence:rollcall", { id: instanceId });
            }
            catch {
                // ignore transport issues
            }
            setDidLogin(true);
            setActiveTab("account");
            try {
                const debit = {
                    spentAt: new Date(),
                    credits: 0.01,
                    modelProvider: "valoride",
                    model: "login-connect",
                    promptTokens: 0,
                    completionTokens: 0,
                };
                await addUsageTransaction(debit).unwrap();
            }
            catch (e) {
                console.warn("Usage debit failed post-login:", e);
            }
        }
        catch (error) {
            console.error("Login failed:", error);
            try {
                const instanceId = localStorage.getItem("valoride.instanceId") || "";
                const appMessage = {
                    type: "auth:nack",
                    payload: { id: instanceId },
                    senderId: instanceId || "",
                    messageId: Math.random().toString(36).slice(2, 12),
                    timestamp: Date.now(),
                };
                window.dispatchEvent(new CustomEvent("websocket-send", { detail: appMessage }));
            }
            catch {
                // ignore transport issues
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleLogout = () => {
        vscode.postMessage({ type: "accountLogoutClicked" });
        setDidLogin(false);
    };
    const handleFileSelect = useCallback((filePath) => {
        vscode.postMessage({
            type: "openMention",
            text: filePath,
        });
    }, []);
    const handleOpenAPIFileSelected = useCallback((file) => {
        console.log("OpenAPI file selected:", file.name);
    }, []);
    const communicationService = useCommunicationService();
    const [peers, setPeers] = useState([]);
    const [phase, setPhase] = useState(undefined);
    const ready = !!communicationService?.ready;
    const hasError = !!communicationService?.error;
    const hubConnected = !!communicationService?.hubConnected;
    const thorConnected = !!communicationService?.thorConnected;
    useEffect(() => {
        if (!communicationService) {
            return undefined;
        }
        const handlePresence = (list) => setPeers(list);
        const handleStatus = (s) => setPhase(s?.phase);
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
    return (_jsxs("div", { style: {
            height: "100%",
            display: "flex",
            flexDirection: "column",
            margin: "1em",
            padding: ".5em",
            position: "relative",
        }, children: [_jsx(SystemAlerts, {}), peers.length > 0 && (_jsxs("div", { className: "border border-solid border-[var(--vscode-panel-border)] rounded-md p-[10px] mb-3 bg-[var(--vscode-panel-background)] text-[var(--vscode-foreground)]", children: [_jsx("div", { className: "mb-2 font-semibold", children: "Active instances" }), _jsx("div", { className: "flex flex-wrap gap-2", children: peers.map((id) => (_jsx("span", { style: {
                                border: "1px solid var(--vscode-panel-border)",
                                borderRadius: 6,
                                padding: "2px 6px",
                                fontSize: 12,
                                background: "var(--vscode-editor-background)",
                            }, children: id }, id))) })] })), _jsx(OfflineBanner, {}), _jsx("div", { className: "scroll-tabs-container", children: _jsx("div", { className: "nav-tabs scroll-tabs", children: authed && (_jsxs(_Fragment, { children: [_jsx("div", { className: `nav-link ${activeTab === "account" ? "active" : ""}`, onClick: () => setActiveTab("account"), style: { cursor: "pointer" }, children: _jsx(FaUserEdit, {}) }), _jsx("div", { className: `nav-link ${activeTab === "applications" ? "active" : ""}`, onClick: () => setActiveTab("applications"), style: { cursor: "pointer" }, children: _jsx(FaAppStore, {}) }), _jsx("div", { className: `nav-link ${activeTab === "generatedFiles" ? "active" : ""}`, onClick: () => setActiveTab("generatedFiles"), style: { cursor: "pointer" }, children: _jsx(FaFileArchive, {}) }), _jsx("div", { className: `nav-link ${activeTab === "userPreferences" ? "active" : ""}`, onClick: () => setActiveTab("userPreferences"), style: { cursor: "pointer" }, children: _jsx(FaUserEdit, {}) })] })) }) }), activeTab === "login" ? (_jsx("div", { className: "flex justify-center", children: !authed && (_jsxs(Card, { children: [_jsx(Card.Body, { children: _jsx(Form, { onSubmit: handleLogin, isLoggedIn: false }) }), _jsx(Card.Footer, { children: _jsxs("div", { style: { fontSize: "0.85em", color: "var(--vscode-descriptionForeground)" }, children: ["Don't have an account?", " ", _jsx(VSCodeLink, { href: "https://valkyrlabs.com/sign-up", target: "_blank", rel: "noopener noreferrer", children: "Signup Now" }), _jsx("br", {}), "Forgot your username?", " ", _jsx(VSCodeLink, { href: "https://valkyrlabs.com/restore-access", target: "_blank", rel: "noopener noreferrer", children: "Restore Access" })] }) })] })) })) : activeTab === "applications" ? (_jsxs("div", { className: "h-full flex flex-col pr-3 overflow-y-auto", children: [loading && (_jsx("div", { style: {
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "200px"
                        }, children: _jsx(LoadingSpinner, { label: "Loading applications...", size: 32 }) })), _jsxs("div", { style: { marginBottom: "1em" }, children: [_jsx(OpenAPIFilePicker, { onFileSelected: handleOpenAPIFileSelected }), _jsx(ApplicationsList, { showTitle: true, title: "Available Applications" })] })] })) : activeTab === "generatedFiles" ? (_jsx("div", { className: "h-full flex flex-col pr-3 overflow-y-auto", children: _jsxs("div", { className: "flex-grow flex flex-col min-h-0", children: [_jsx("h3", { style: { marginBottom: "16px" }, children: "Generated Files" }), _jsx(FileExplorer, { onFileSelect: handleFileSelect, highlightNewFiles: true, autoRefresh: true, refreshInterval: 5000 })] }) })) : activeTab === "userPreferences" ? (_jsx("div", { className: "h-full flex flex-col pr-3 overflow-y-auto", children: _jsxs("div", { className: "flex-grow flex flex-col min-h-0", children: [_jsx("h3", { style: { marginBottom: "16px" }, children: "User Preferences" }), _jsx(UserPreferences, {})] }) })) : activeTab === "account" ? (_jsx(_Fragment, { children: _jsxs("div", { className: "h-full flex flex-col pr-3 overflow-y-auto", children: [_jsxs("div", { className: "w-full flex gap-2 flex-col min-[225px]:flex-row mt-4", children: [_jsx("div", { className: "w-full min-[225px]:w-1/2", children: _jsx(VSCodeButtonLink, { href: "https://valkyrlabs.com/dashboard", appearance: "primary", className: "w-full", children: "Dashboard" }) }), _jsx(VSCodeButton, { appearance: "secondary", onClick: handleLogout, className: "w-full min-[225px]:w-1/2", children: _jsx(FaBackward, {}) })] }), _jsxs("div", { className: "w-full flex flex-col items-center", children: [_jsx("div", { className: "text-sm text-[var(--vscode-descriptionForeground)] mb-3", children: "CURRENT BALANCE" }), _jsx("div", { className: "text-4xl font-bold text-[var(--vscode-foreground)] mb-6 flex items-center gap-2", children: loading ? (_jsx(LoadingSpinner, { label: "Loading balance...", size: 28 })) : (_jsxs(_Fragment, { children: [(() => {
                                                const rawBalance = balanceData?.[0]?.currentBalance || 0;
                                                const effectiveBalance = Math.max(0, rawBalance - (apiMetrics.totalCost || 0));
                                                return (_jsxs(_Fragment, { children: [_jsx("span", { children: "$" }), _jsx(CountUp, { end: effectiveBalance, duration: 0.66, decimals: 2 })] }));
                                            })(), _jsx(VSCodeButton, { appearance: "icon", className: "mt-1", onClick: () => {
                                                    refetchBalance();
                                                    if (authed) {
                                                        refetchUsage();
                                                        refetchPayments();
                                                    }
                                                }, children: _jsx(FaRecycle, {}) })] })) }), _jsxs("div", { className: "w-full", children: [_jsx(VSCodeButtonLink, { href: "https://app.valkyrlabs.com/v1/credits/#buy", className: "w-full", children: "Buy Credits" }), _jsx(BuyCredits, {})] })] }), _jsx(VSCodeDivider, { className: "mt-6 mb-3 w-full" }), _jsx("div", { className: "flex-grow flex flex-col min-h-0 pb-[0px]", children: _jsx(CreditsHistoryTable, { isLoading: loading, usageData: usageData || [], paymentsData: paymentsData || [] }) })] }) })) : (_jsx(_Fragment, { children: "nothing selected" }))] }));
};
export default memo(AccountView);
//# sourceMappingURL=AccountView.js.map