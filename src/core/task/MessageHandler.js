import pWaitFor from "p-wait-for";
/**
 * Handles ask/say message communication between Task and webview
 */
export class MessageHandler {
    saveValorIDEMessagesAndUpdateHistory;
    postStateToWebview;
    postMessageToWebview;
    valorideMessages = [];
    askResponse;
    askResponseText;
    askResponseImages;
    lastMessageTs;
    abort = false;
    constructor(saveValorIDEMessagesAndUpdateHistory, postStateToWebview, postMessageToWebview) {
        this.saveValorIDEMessagesAndUpdateHistory = saveValorIDEMessagesAndUpdateHistory;
        this.postStateToWebview = postStateToWebview;
        this.postMessageToWebview = postMessageToWebview;
    }
    setValorIDEMessages(messages) {
        this.valorideMessages = messages;
    }
    getValorIDEMessages() {
        return this.valorideMessages;
    }
    setAbort(abort) {
        this.abort = abort;
    }
    setLastMessageTs(ts) {
        this.lastMessageTs = ts;
    }
    getLastMessageTs() {
        return this.lastMessageTs;
    }
    async addToValorIDEMessages(message) {
        this.valorideMessages.push(message);
        await this.saveValorIDEMessagesAndUpdateHistory();
    }
    async overwriteValorIDEMessages(newMessages) {
        this.valorideMessages = newMessages;
        await this.saveValorIDEMessagesAndUpdateHistory();
    }
    async handleWebviewAskResponse(askResponse, text, images) {
        this.askResponse = askResponse;
        this.askResponseText = text;
        this.askResponseImages = images;
    }
    // partial has three valid states true (partial message), false (completion of partial message), undefined (individual complete message)
    async ask(type, text, partial) {
        // If this ValorIDE instance was aborted by the provider, then the only thing keeping us alive is a promise still running in the background, in which case we don't want to send its result to the webview as it is attached to a new instance of ValorIDE now. So we can safely ignore the result of any active promises, and this class will be deallocated. (Although we set ValorIDE = undefined in provider, that simply removes the reference to this instance, but the instance is still alive until this promise resolves or rejects.)
        if (this.abort) {
            throw new Error("ValorIDE instance aborted");
        }
        let askTs;
        if (partial !== undefined) {
            const lastMessage = this.valorideMessages.at(-1);
            const isUpdatingPreviousPartial = lastMessage &&
                lastMessage.partial &&
                lastMessage.type === "ask" &&
                lastMessage.ask === type;
            if (partial) {
                if (isUpdatingPreviousPartial) {
                    // existing partial message, so update it
                    lastMessage.text = text;
                    lastMessage.partial = partial;
                    // todo be more efficient about saving and posting only new data or one whole message at a time so ignore partial for saves, and only post parts of partial message instead of whole array in new listener
                    // await this.saveValorIDEMessagesAndUpdateHistory()
                    // await this.postStateToWebview()
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    });
                    throw new Error("Current ask promise was ignored 1");
                }
                else {
                    // this is a new partial message, so add it with partial state
                    // this.askResponse = undefined
                    // this.askResponseText = undefined
                    // this.askResponseImages = undefined
                    askTs = Date.now();
                    this.lastMessageTs = askTs;
                    await this.addToValorIDEMessages({
                        ts: askTs,
                        type: "ask",
                        ask: type,
                        text,
                        partial,
                    });
                    await this.postStateToWebview();
                    throw new Error("Current ask promise was ignored 2");
                }
            }
            else {
                // partial=false means its a complete version of a previously partial message
                if (isUpdatingPreviousPartial) {
                    // this is the complete version of a previously partial message, so replace the partial with the complete version
                    this.askResponse = undefined;
                    this.askResponseText = undefined;
                    this.askResponseImages = undefined;
                    /*
                              Bug for the history books:
                              In the webview we use the ts as the chatrow key for the virtuoso list. Since we would update this ts right at the end of streaming, it would cause the view to flicker. The key prop has to be stable otherwise react has trouble reconciling items between renders, causing unmounting and remounting of components (flickering).
                              The lesson here is if you see flickering when rendering lists, it's likely because the key prop is not stable.
                              So in this case we must make sure that the message ts is never altered after first setting it.
                              */
                    askTs = lastMessage.ts;
                    this.lastMessageTs = askTs;
                    // lastMessage.ts = askTs
                    lastMessage.text = text;
                    lastMessage.partial = false;
                    await this.saveValorIDEMessagesAndUpdateHistory();
                    // await this.postStateToWebview()
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    });
                }
                else {
                    // this is a new partial=false message, so add it like normal
                    this.askResponse = undefined;
                    this.askResponseText = undefined;
                    this.askResponseImages = undefined;
                    askTs = Date.now();
                    this.lastMessageTs = askTs;
                    await this.addToValorIDEMessages({
                        ts: askTs,
                        type: "ask",
                        ask: type,
                        text,
                    });
                    await this.postStateToWebview();
                }
            }
        }
        else {
            // this is a new non-partial message, so add it like normal
            // const lastMessage = this.valorideMessages.at(-1)
            this.askResponse = undefined;
            this.askResponseText = undefined;
            this.askResponseImages = undefined;
            askTs = Date.now();
            this.lastMessageTs = askTs;
            await this.addToValorIDEMessages({
                ts: askTs,
                type: "ask",
                ask: type,
                text,
            });
            await this.postStateToWebview();
        }
        await pWaitFor(() => this.askResponse !== undefined || this.lastMessageTs !== askTs, { interval: 100 });
        if (this.lastMessageTs !== askTs) {
            throw new Error("Current ask promise was ignored"); // could happen if we send multiple asks in a row i.e. with command_output. It's important that when we know an ask could fail, it is handled gracefully
        }
        const result = {
            response: this.askResponse,
            text: this.askResponseText,
            images: this.askResponseImages,
        };
        this.askResponse = undefined;
        this.askResponseText = undefined;
        this.askResponseImages = undefined;
        return result;
    }
    async say(type, text, images, partial) {
        if (this.abort) {
            throw new Error("ValorIDE instance aborted");
        }
        if (partial !== undefined) {
            const lastMessage = this.valorideMessages.at(-1);
            const isUpdatingPreviousPartial = lastMessage &&
                lastMessage.partial &&
                lastMessage.type === "say" &&
                lastMessage.say === type;
            if (partial) {
                if (isUpdatingPreviousPartial) {
                    // existing partial message, so update it
                    lastMessage.text = text;
                    lastMessage.images = images;
                    lastMessage.partial = partial;
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    });
                }
                else {
                    // this is a new partial message, so add it with partial state
                    const sayTs = Date.now();
                    this.lastMessageTs = sayTs;
                    await this.addToValorIDEMessages({
                        ts: sayTs,
                        type: "say",
                        say: type,
                        text,
                        images,
                        partial,
                    });
                    await this.postStateToWebview();
                }
            }
            else {
                // partial=false means its a complete version of a previously partial message
                if (isUpdatingPreviousPartial) {
                    // this is the complete version of a previously partial message, so replace the partial with the complete version
                    this.lastMessageTs = lastMessage.ts;
                    // lastMessage.ts = sayTs
                    lastMessage.text = text;
                    lastMessage.images = images;
                    lastMessage.partial = false;
                    // instead of streaming partialMessage events, we do a save and post like normal to persist to disk
                    await this.saveValorIDEMessagesAndUpdateHistory();
                    // await this.postStateToWebview()
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    }); // more performant than an entire postStateToWebview
                }
                else {
                    // this is a new partial=false message, so add it like normal
                    const sayTs = Date.now();
                    this.lastMessageTs = sayTs;
                    await this.addToValorIDEMessages({
                        ts: sayTs,
                        type: "say",
                        say: type,
                        text,
                        images,
                    });
                    await this.postStateToWebview();
                }
            }
        }
        else {
            // this is a new non-partial message, so add it like normal
            const sayTs = Date.now();
            this.lastMessageTs = sayTs;
            await this.addToValorIDEMessages({
                ts: sayTs,
                type: "say",
                say: type,
                text,
                images,
            });
            await this.postStateToWebview();
        }
    }
    async removeLastPartialMessageIfExistsWithType(type, askOrSay) {
        const lastMessage = this.valorideMessages.at(-1);
        if (lastMessage?.partial &&
            lastMessage.type === type &&
            (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)) {
            this.valorideMessages.pop();
            await this.saveValorIDEMessagesAndUpdateHistory();
            await this.postStateToWebview();
        }
    }
}
//# sourceMappingURL=MessageHandler.js.map