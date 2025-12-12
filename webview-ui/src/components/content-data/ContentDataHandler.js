import { useEffect } from "react";
import { useAddContentDataMutation } from "@thorapi/redux/services/ContentDataService";
/**
 * Component that handles content data messages from the extension
 * and submits them via the RTK Query system
 */
export const ContentDataHandler = () => {
    const [addContentData] = useAddContentDataMutation();
    useEffect(() => {
        const handleMessage = async (event) => {
            const message = event.data;
            if (message.type === "content_data" && message.action === "create") {
                await handleCreateContentData(message.data);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [addContentData]);
    const waitForJwtToken = async (timeoutMs = 3000) => {
        // Try immediate read
        const read = () => {
            try {
                return (sessionStorage.getItem("jwtToken") ||
                    localStorage.getItem("jwtToken") ||
                    localStorage.getItem("authToken"));
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
                        window.removeEventListener("jwt-token-updated", onEvt);
                        resolve(detail.token);
                    }
                }
                catch {
                    /* ignore */
                }
            };
            window.addEventListener("jwt-token-updated", onEvt);
            setTimeout(() => {
                if (!done) {
                    window.removeEventListener("jwt-token-updated", onEvt);
                    resolve(read());
                }
            }, timeoutMs);
        });
    };
    const handleCreateContentData = async (data) => {
        try {
            // Ensure we have a JWT before attempting
            const token = await waitForJwtToken(3000);
            if (!token) {
                throw new Error("Missing JWT token");
            }
            const result = await addContentData(data.contentData).unwrap();
            // Send success response back to extension
            sendResponseToExtension(data.transactionId, true, result);
        }
        catch (error) {
            console.error("Failed to submit content data:", error);
            sendResponseToExtension(data.transactionId, false, error);
        }
    };
    const sendResponseToExtension = (transactionId, success, data) => {
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: "content_data_response",
                action: "create_result",
                data: {
                    transactionId,
                    success,
                    item: data,
                },
            }, "*");
        }
    };
    // This component doesn't render anything visible
    return null;
};
//# sourceMappingURL=ContentDataHandler.js.map