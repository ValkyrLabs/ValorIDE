// tslint:disable
import * as runtime from '../src/runtime';
import { ChatCompletionRequestFromJSON, ChatCompletionRequestToJSON, } from '../model';
/**
 * Deletes a specific ChatCompletionRequest.
 * Delete a ChatCompletionRequest.
 */
function deleteChatCompletionRequestRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteChatCompletionRequest.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionRequest/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ChatCompletionRequest.
* Delete a ChatCompletionRequest.
*/
export function deleteChatCompletionRequest(requestParameters, requestConfig) {
    return deleteChatCompletionRequestRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ChatCompletionRequest for a specific uid.
 * Retrieve a single ChatCompletionRequest
 */
function getChatCompletionRequestRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getChatCompletionRequest.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionRequest/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ChatCompletionRequestFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ChatCompletionRequest for a specific uid.
* Retrieve a single ChatCompletionRequest
*/
export function getChatCompletionRequest(requestParameters, requestConfig) {
    return getChatCompletionRequestRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ChatCompletionRequests.
 * Retrieve a list of ChatCompletionRequests
 */
function getChatCompletionRequestListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ChatCompletionRequest`,
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
        config.transform = (body, text) => requestTransform(body.map(ChatCompletionRequestFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ChatCompletionRequests.
* Retrieve a list of ChatCompletionRequests
*/
export function getChatCompletionRequestList(requestParameters, requestConfig) {
    return getChatCompletionRequestListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ChatCompletionRequest.
 * Create a new ChatCompletionRequest
 */
function postChatCompletionRequestRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.chatCompletionRequest === null || requestParameters.chatCompletionRequest === undefined) {
        throw new runtime.RequiredError('chatCompletionRequest', 'Required parameter requestParameters.chatCompletionRequest was null or undefined when calling postChatCompletionRequest.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionRequest`,
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
        body: queryParameters || ChatCompletionRequestToJSON(requestParameters.chatCompletionRequest),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatCompletionRequestFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ChatCompletionRequest.
* Create a new ChatCompletionRequest
*/
export function postChatCompletionRequest(requestParameters, requestConfig) {
    return postChatCompletionRequestRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ChatCompletionRequest.
 * Update an existing ChatCompletionRequest
 */
function updateChatCompletionRequestRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateChatCompletionRequest.');
    }
    if (requestParameters.chatCompletionRequest === null || requestParameters.chatCompletionRequest === undefined) {
        throw new runtime.RequiredError('chatCompletionRequest', 'Required parameter requestParameters.chatCompletionRequest was null or undefined when calling updateChatCompletionRequest.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionRequest/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ChatCompletionRequestToJSON(requestParameters.chatCompletionRequest),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatCompletionRequestFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ChatCompletionRequest.
* Update an existing ChatCompletionRequest
*/
export function updateChatCompletionRequest(requestParameters, requestConfig) {
    return updateChatCompletionRequestRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ChatCompletionRequestApi.js.map