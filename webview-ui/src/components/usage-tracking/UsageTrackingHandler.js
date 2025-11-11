import { useEffect } from 'react';
import { useAddUsageTransactionMutation } from '../../thor/redux/services/UsageTransactionService';
import { useGetBalanceResponsesQuery } from '../../thor/redux/services/BalanceResponseService';
/**
 * Component that handles usage tracking messages from the extension
 * and submits them via the RTQ system
 */
export const UsageTrackingHandler = () => {
    const [addUsageTransaction] = useAddUsageTransactionMutation();
    const { refetch: refetchBalance } = useGetBalanceResponsesQuery();
    useEffect(() => {
        const handleMessage = async (event) => {
            const message = event.data;
            if (message.type === 'usage_tracking') {
                switch (message.action) {
                    case 'track_usage':
                        await handleTrackUsage(message.data);
                        break;
                    case 'request_balance':
                        await handleRequestBalance();
                        break;
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [addUsageTransaction, refetchBalance]);
    const waitForJwtToken = async (timeoutMs = 3000) => {
        // Try immediate read
        const read = () => {
            try {
                return sessionStorage.getItem('jwtToken') || localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
            }
            catch {
                return null;
            }
        };
        let token = read();
        if (token)
            return token;
        // Wait for jwt-token-updated event
        return new Promise((resolve) => {
            let done = false;
            const onEvt = (e) => {
                try {
                    const detail = e?.detail;
                    if (detail?.token) {
                        done = true;
                        window.removeEventListener('jwt-token-updated', onEvt);
                        resolve(detail.token);
                    }
                }
                catch { /* ignore */ }
            };
            window.addEventListener('jwt-token-updated', onEvt);
            setTimeout(() => {
                if (!done) {
                    window.removeEventListener('jwt-token-updated', onEvt);
                    resolve(read());
                }
            }, timeoutMs);
        });
    };
    const handleTrackUsage = async (data) => {
        try {
            // Ensure we have a JWT before attempting
            const token = await waitForJwtToken(3000);
            if (!token) {
                throw new Error('Missing JWT token');
            }
            const result = await addUsageTransaction(data.usageTransaction).unwrap();
            // Send success response back to extension
            sendResponseToExtension(data.transactionId, true, result);
        }
        catch (error) {
            console.error('Failed to submit usage transaction:', error);
            sendResponseToExtension(data.transactionId, false, error);
        }
    };
    const handleRequestBalance = async () => {
        try {
            const result = await refetchBalance();
            // Send balance data back to extension
            if (window.parent && window.parent.postMessage) {
                window.parent.postMessage({
                    type: 'usage_tracking_response',
                    action: 'balance_updated',
                    data: result.data
                }, '*');
            }
        }
        catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    };
    const sendResponseToExtension = (transactionId, success, data) => {
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: 'usage_tracking_response',
                action: 'transaction_submitted',
                data: {
                    transactionId,
                    success,
                    result: data
                }
            }, '*');
        }
    };
    // This component doesn't render anything visible
    return null;
};
//# sourceMappingURL=UsageTrackingHandler.js.map