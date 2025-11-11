// tslint:disable
import * as runtime from '../src/runtime';
import { ChatResponseFromJSON, ChatResponseToJSON, } from '../model';
/**
 * Deletes a specific ChatResponse.
 * Delete a ChatResponse.
 */
function deleteChatResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteChatResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ChatResponse.
* Delete a ChatResponse.
*/
export function deleteChatResponse(requestParameters, requestConfig) {
    return deleteChatResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ChatResponse for a specific uid.
 * Retrieve a single ChatResponse
 */
function getChatResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getChatResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ChatResponseFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ChatResponse for a specific uid.
* Retrieve a single ChatResponse
*/
export function getChatResponse(requestParameters, requestConfig) {
    return getChatResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ChatResponses.
 * Retrieve a list of ChatResponses
 */
function getChatResponseListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ChatResponse`,
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
        config.transform = (body, text) => requestTransform(body.map(ChatResponseFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ChatResponses.
* Retrieve a list of ChatResponses
*/
export function getChatResponseList(requestParameters, requestConfig) {
    return getChatResponseListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ChatResponse.
 * Create a new ChatResponse
 */
function postChatResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.chatResponse === null || requestParameters.chatResponse === undefined) {
        throw new runtime.RequiredError('chatResponse', 'Required parameter requestParameters.chatResponse was null or undefined when calling postChatResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatResponse`,
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
        body: queryParameters || ChatResponseToJSON(requestParameters.chatResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ChatResponse.
* Create a new ChatResponse
*/
export function postChatResponse(requestParameters, requestConfig) {
    return postChatResponseRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ChatResponse.
 * Update an existing ChatResponse
 */
function updateChatResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateChatResponse.');
    }
    if (requestParameters.chatResponse === null || requestParameters.chatResponse === undefined) {
        throw new runtime.RequiredError('chatResponse', 'Required parameter requestParameters.chatResponse was null or undefined when calling updateChatResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ChatResponseToJSON(requestParameters.chatResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatResponseFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ChatResponse.
* Update an existing ChatResponse
*/
export function updateChatResponse(requestParameters, requestConfig) {
    return updateChatResponseRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ChatResponseApi.js.map