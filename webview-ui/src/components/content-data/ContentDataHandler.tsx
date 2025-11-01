import React, { useEffect } from 'react';
import { useAddContentDataMutation } from '../../thor/redux/services/ContentDataService';
import { ContentData } from '../../thor/model';

interface ContentDataMessage {
  type: 'content_data';
  action: 'create';
  data: {
    transactionId: string;
    contentData: Partial<ContentData>;
  };
}

/**
 * Component that handles content data messages from the extension
 * and submits them via the RTK Query system
 */
export const ContentDataHandler: React.FC = () => {
  const [addContentData] = useAddContentDataMutation();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data as ContentDataMessage;
      
      if (message.type === 'content_data' && message.action === 'create') {
        await handleCreateContentData(message.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addContentData]);

  const waitForJwtToken = async (timeoutMs = 3000): Promise<string | null> => {
    // Try immediate read
    const read = (): string | null => {
      try {
        return sessionStorage.getItem('jwtToken') || localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
      } catch { return null; }
    };
    let token = read();
    if (token) return token;
    // Wait for jwt-token-updated event
    return new Promise((resolve) => {
      let done = false;
      const onEvt = (e: Event) => {
        try {
          const detail = (e as CustomEvent)?.detail;
          if (detail?.token) {
            done = true;
            window.removeEventListener('jwt-token-updated', onEvt as any);
            resolve(detail.token as string);
          }
        } catch { /* ignore */ }
      };
      window.addEventListener('jwt-token-updated', onEvt as any);
      setTimeout(() => {
        if (!done) {
          window.removeEventListener('jwt-token-updated', onEvt as any);
          resolve(read());
        }
      }, timeoutMs);
    });
  };

  const handleCreateContentData = async (data: { transactionId: string; contentData: Partial<ContentData> }) => {
    try {
      // Ensure we have a JWT before attempting
      const token = await waitForJwtToken(3000);
      if (!token) {
        throw new Error('Missing JWT token');
      }
      
      const result = await addContentData(data.contentData).unwrap();
      
      // Send success response back to extension
      sendResponseToExtension(data.transactionId, true, result);
    } catch (error) {
      console.error('Failed to submit content data:', error);
      sendResponseToExtension(data.transactionId, false, error);
    }
  };

  const sendResponseToExtension = (transactionId: string, success: boolean, data?: any) => {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'content_data_response',
        action: 'create_result',
        data: {
          transactionId,
          success,
          item: data
        }
      }, '*');
    }
  };

  // This component doesn't render anything visible
  return null;
};
