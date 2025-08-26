import React, { useEffect } from 'react';
import { useAddUsageTransactionMutation } from '../../thor/redux/services/UsageTransactionService';
import { useGetBalanceResponsesQuery } from '../../thor/redux/services/BalanceResponseService';
import { UsageTransaction } from '../../thor/model';

interface UsageTrackingMessage {
  type: 'usage_tracking';
  action: 'track_usage' | 'request_balance';
  data: any;
}

/**
 * Component that handles usage tracking messages from the extension
 * and submits them via the RTQ system
 */
export const UsageTrackingHandler: React.FC = () => {
  const [addUsageTransaction] = useAddUsageTransactionMutation();
  const { refetch: refetchBalance } = useGetBalanceResponsesQuery();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data as UsageTrackingMessage;
      
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

  const handleTrackUsage = async (data: { transactionId: string; usageTransaction: Partial<UsageTransaction> }) => {
    try {
      const result = await addUsageTransaction(data.usageTransaction).unwrap();
      
      // Send success response back to extension
      sendResponseToExtension(data.transactionId, true, result);
    } catch (error) {
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
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const sendResponseToExtension = (transactionId: string, success: boolean, data?: any) => {
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
