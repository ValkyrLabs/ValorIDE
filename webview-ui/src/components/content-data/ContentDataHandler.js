import { useEffect } from 'react';
import { useLazyGetContentDatasPagedQuery } from '../../thor/redux/services/ContentDataService';
export const ContentDataHandler = () => {
    const [triggerPaged] = useLazyGetContentDatasPagedQuery();
    useEffect(() => {
        const onMessage = async (event) => {
            const msg = event.data;
            if (msg?.type !== 'content_data')
                return;
            switch (msg.action) {
                case 'list': {
                    const { transactionId, page = 0, size = 20 } = msg.data || {};
                    try {
                        const res = await triggerPaged({ page, size }).unwrap();
                        if (window.parent?.postMessage) {
                            window.parent.postMessage({
                                type: 'content_data_response',
                                action: 'list_result',
                                data: { transactionId, success: true, items: res },
                            }, '*');
                        }
                    }
                    catch (error) {
                        if (window.parent?.postMessage) {
                            window.parent.postMessage({
                                type: 'content_data_response',
                                action: 'list_result',
                                data: { transactionId: msg.data?.transactionId, success: false, error: String(error) },
                            }, '*');
                        }
                    }
                    break;
                }
                default:
                    break;
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [triggerPaged]);
    return null;
};
//# sourceMappingURL=ContentDataHandler.js.map