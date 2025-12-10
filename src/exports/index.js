import { getGlobalState } from "@core/storage/state";
export function createValorIDEAPI(outputChannel, sidebarController) {
    const api = {
        setCustomInstructions: async (value) => {
            await sidebarController.updateCustomInstructions(value);
            outputChannel.appendLine("Custom instructions set");
        },
        getCustomInstructions: async () => {
            return (await getGlobalState(sidebarController.context, "customInstructions"));
        },
        startNewTask: async (task, images) => {
            outputChannel.appendLine("Starting new task");
            await sidebarController.clearTask();
            await sidebarController.postStateToWebview();
            await sidebarController.postMessageToWebview({
                type: "action",
                action: "chatButtonClicked",
            });
            await sidebarController.postMessageToWebview({
                type: "invoke",
                invoke: "sendMessage",
                text: task,
                images: images,
            });
            outputChannel.appendLine(`Task started with message: ${task ? `"${task}"` : "undefined"} and ${images?.length || 0} image(s)`);
        },
        sendMessage: async (message, images) => {
            outputChannel.appendLine(`Sending message: ${message ? `"${message}"` : "undefined"} with ${images?.length || 0} image(s)`);
            await sidebarController.postMessageToWebview({
                type: "invoke",
                invoke: "sendMessage",
                text: message,
                images: images,
            });
        },
        pressPrimaryButton: async () => {
            outputChannel.appendLine("Pressing primary button");
            await sidebarController.postMessageToWebview({
                type: "invoke",
                invoke: "primaryButtonClick",
            });
        },
        pressSecondaryButton: async () => {
            outputChannel.appendLine("Pressing secondary button");
            await sidebarController.postMessageToWebview({
                type: "invoke",
                invoke: "secondaryButtonClick",
            });
        },
    };
    return api;
}
//# sourceMappingURL=index.js.map