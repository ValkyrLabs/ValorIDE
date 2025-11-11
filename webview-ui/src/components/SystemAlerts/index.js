import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-bootstrap';
import { FaSadTear, FaDollarSign, FaTimes } from 'react-icons/fa';
import { useExtensionState } from '@/context/ExtensionStateContext';
import { useGetBalanceResponsesQuery } from '@/thor/redux/services/BalanceResponseService';
import { getApiMetrics } from '@shared/getApiMetrics';
const SystemAlerts = () => {
    const { valorideMessages, jwtToken, advancedSettings } = useExtensionState();
    const [alerts, setAlerts] = useState([]);
    const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
    // Get balance data for budget alerts
    const { data: balanceData } = useGetBalanceResponsesQuery(undefined, {
        skip: !jwtToken
    });
    // Calculate current API metrics
    const apiMetrics = useMemo(() => getApiMetrics(valorideMessages || []), [valorideMessages]);
    // Calculate effective balance
    const effectiveBalance = useMemo(() => {
        const rawBalance = balanceData?.[0]?.currentBalance || 0;
        return Math.max(0, rawBalance - (apiMetrics.totalCost || 0));
    }, [balanceData, apiMetrics.totalCost]);
    // Check for budget alerts
    useEffect(() => {
        if (!jwtToken || effectiveBalance === undefined)
            return;
        const ba = advancedSettings?.budgetAlerts || { depletedThreshold: 0, criticalThreshold: 1, lowThreshold: 5, alertThreshold: 10 };
        const budgetThresholds = [
            { threshold: ba.depletedThreshold, severity: 'danger', title: 'Budget Depleted' },
            { threshold: ba.criticalThreshold, severity: 'danger', title: 'Critical Budget Alert' },
            { threshold: ba.lowThreshold, severity: 'warning', title: 'Low Budget Warning' },
            { threshold: ba.alertThreshold, severity: 'warning', title: 'Budget Alert' }
        ].sort((a, b) => a.threshold - b.threshold);
        for (const { threshold, severity, title } of budgetThresholds) {
            if (effectiveBalance <= threshold) {
                const alertId = `budget-${threshold}`;
                if (!dismissedAlerts.has(alertId)) {
                    const newAlert = {
                        id: alertId,
                        type: 'budget',
                        severity,
                        title,
                        message: effectiveBalance <= 0
                            ? 'Your account balance has been depleted. Buy credits to continue using ValorIDE services.'
                            : `Your account balance is low ($${effectiveBalance.toFixed(2)}). Consider adding credits to avoid service interruption.`,
                        timestamp: Date.now()
                    };
                    setAlerts(prev => {
                        const existing = prev.find(a => a.id === alertId);
                        if (!existing) {
                            return [...prev, newAlert];
                        }
                        return prev;
                    });
                }
                break; // Only show the most severe alert
            }
        }
    }, [effectiveBalance, jwtToken, dismissedAlerts]);
    // Check for blocker alerts (error states)
    useEffect(() => {
        if (!valorideMessages?.length)
            return;
        const lastMessage = valorideMessages[valorideMessages.length - 1];
        // Check for API failures or error states
        if (lastMessage?.type === 'ask' && lastMessage.ask === 'api_req_failed') {
            const alertId = `blocker-api-failed-${lastMessage.ts}`;
            if (!dismissedAlerts.has(alertId)) {
                const newAlert = {
                    id: alertId,
                    type: 'blocker',
                    severity: 'danger',
                    title: 'API Request Failed',
                    message: 'ValorIDE encountered an error processing your request. This may be due to network issues or service limitations.',
                    timestamp: Date.now()
                };
                setAlerts(prev => {
                    const existing = prev.find(a => a.id === alertId);
                    if (!existing) {
                        return [...prev, newAlert];
                    }
                    return prev;
                });
            }
        }
        // Check for mistake limit reached
        if (lastMessage?.type === 'ask' && lastMessage.ask === 'mistake_limit_reached') {
            const alertId = `blocker-mistakes-${lastMessage.ts}`;
            if (!dismissedAlerts.has(alertId)) {
                const newAlert = {
                    id: alertId,
                    type: 'blocker',
                    severity: 'warning',
                    title: 'Mistake Limit Reached',
                    message: 'ValorIDE has made several correction attempts. Please review the task or provide additional guidance.',
                    timestamp: Date.now()
                };
                setAlerts(prev => {
                    const existing = prev.find(a => a.id === alertId);
                    if (!existing) {
                        return [...prev, newAlert];
                    }
                    return prev;
                });
            }
        }
    }, [valorideMessages, dismissedAlerts]);
    const handleDismiss = (alertId) => {
        setDismissedAlerts(prev => new Set([...Array.from(prev), alertId]));
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    };
    const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));
    if (activeAlerts.length === 0)
        return null;
    return (_jsx("div", { style: {
            backgroundColor: 'white',
            /*position: 'fixed',
            top: '10px',
            right: '10px',*/
            zIndex: 9999,
            maxWidth: '350px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }, children: activeAlerts.map((alert) => (_jsx(Alert, { variant: alert.severity === 'danger' ? 'danger' : 'warning', 
            /* hate the style, try bare*/
            style: {
                margin: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: `1px solid var(--vscode-${alert.severity === 'danger' ? 'errorForeground' : 'warningForeground'})`,
                backgroundColor: 'white',
                color: `var(--vscode-${alert.severity === 'danger' ? 'errorForeground' : 'warningForeground'})`,
                fontSize: '14px',
                borderRadius: '6px'
            }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: '8px' }, children: [_jsx("div", { style: { marginTop: '2px' }, children: alert.type === 'budget' ? (_jsx(FaDollarSign, { size: 16 })) : (_jsx(FaSadTear, { size: 16 })) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, marginBottom: '4px' }, children: alert.title }), _jsx("div", { style: { fontSize: '13px', lineHeight: '1.4' }, children: alert.message })] }), _jsx("button", { onClick: () => handleDismiss(alert.id), style: {
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: '2px',
                            borderRadius: '4px',
                            opacity: 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }, onMouseEnter: (e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)';
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }, children: _jsx(FaTimes, { size: 18 }) })] }) }, alert.id))) }));
};
export default SystemAlerts;
//# sourceMappingURL=index.js.map