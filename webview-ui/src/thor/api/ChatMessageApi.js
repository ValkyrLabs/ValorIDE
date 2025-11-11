// tslint:disable
import * as runtime from '../src/runtime';
import { ChatMessageFromJSON, ChatMessageToJSON, } from '../model';
/**
 * Deletes a specific ChatMessage.
 * Delete a ChatMessage.
 */
function deleteChatMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteChatMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatMessage/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'DELETE',
            headers: headerParameters,
        },
        body: queryParameters,
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
    }
    return config;
}
/**
* Deletes a specific ChatMessage.
* Delete a ChatMessage.
*/
export function deleteChatMessage(requestParameters, requestConfig) {
    return deleteChatMessageRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ChatMessage for a specific uid.
 * Retrieve a single ChatMessage
 */
function getChatMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getChatMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatMessage/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'GET',
            headers: headerParameters,
        },
        body: queryParameters,
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatMessageFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ChatMessage for a specific uid.
* Retrieve a single ChatMessage
*/
export function getChatMessage(requestParameters, requestConfig) {
    return getChatMessageRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ChatMessages.
 * Retrieve a list of ChatMessages
 */
function getChatMessageListRaw(requestParameters, requestConfig = {}) {
    let queryParameters = null;
    queryParameters = {};
    if (requestParameters.page !== undefined) {
        queryParameters['page'] = requestParameters.page;
    }
    if (requestParameters.size !== undefined) {
        queryParameters['size'] = requestParameters.size;
    }
    if (requestParameters.sort) {
        queryParameters['sort'] = requestParameters.sort;
    }
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatMessage`,
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'GET',
            headers: headerParameters,
        },
        body: queryParameters,
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(body.map(ChatMessageFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ChatMessages.
* Retrieve a list of ChatMessages
*/
export function getChatMessageList(requestParameters, requestConfig) {
    return getChatMessageListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ChatMessage.
 * Create a new ChatMessage
 */
function postChatMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.chatMessage === null || requestParameters.chatMessage === undefined) {
        throw new runtime.RequiredError('chatMessage', 'Required parameter requestParameters.chatMessage was null or undefined when calling postChatMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatMessage`,
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'POST',
            headers: headerParameters,
        },
        body: queryParameters || ChatMessageToJSON(requestParameters.chatMessage),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatMessageFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ChatMessage.
* Create a new ChatMessage
*/
export function postChatMessage(requestParameters, requestConfig) {
    return postChatMessageRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ChatMessage.
 * Update an existing ChatMessage
 */
function updateChatMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateChatMessage.');
    }
    if (requestParameters.chatMessage === null || requestParameters.chatMessage === undefined) {
        throw new runtime.RequiredError('chatMessage', 'Required parameter requestParameters.chatMessage was null or undefined when calling updateChatMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatMessage/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'PUT',
            headers: headerParameters,
        },
        body: queryParameters || ChatMessageToJSON(requestParameters.chatMessage),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatMessageFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ChatMessage.
* Update an existing ChatMessage
*/
export function updateChatMessage(requestParameters, requestConfig) {
    return updateChatMessageRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ChatMessageApi.js.map