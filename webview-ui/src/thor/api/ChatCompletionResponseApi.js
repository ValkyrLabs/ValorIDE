// tslint:disable
import * as runtime from '../src/runtime';
import { ChatCompletionResponseFromJSON, ChatCompletionResponseToJSON, } from '../model';
/**
 * Deletes a specific ChatCompletionResponse.
 * Delete a ChatCompletionResponse.
 */
function deleteChatCompletionResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteChatCompletionResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ChatCompletionResponse.
* Delete a ChatCompletionResponse.
*/
export function deleteChatCompletionResponse(requestParameters, requestConfig) {
    return deleteChatCompletionResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ChatCompletionResponse for a specific uid.
 * Retrieve a single ChatCompletionResponse
 */
function getChatCompletionResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getChatCompletionResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ChatCompletionResponseFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ChatCompletionResponse for a specific uid.
* Retrieve a single ChatCompletionResponse
*/
export function getChatCompletionResponse(requestParameters, requestConfig) {
    return getChatCompletionResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ChatCompletionResponses.
 * Retrieve a list of ChatCompletionResponses
 */
function getChatCompletionResponseListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ChatCompletionResponse`,
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
        config.transform = (body, text) => requestTransform(body.map(ChatCompletionResponseFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ChatCompletionResponses.
* Retrieve a list of ChatCompletionResponses
*/
export function getChatCompletionResponseList(requestParameters, requestConfig) {
    return getChatCompletionResponseListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ChatCompletionResponse.
 * Create a new ChatCompletionResponse
 */
function postChatCompletionResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.chatCompletionResponse === null || requestParameters.chatCompletionResponse === undefined) {
        throw new runtime.RequiredError('chatCompletionResponse', 'Required parameter requestParameters.chatCompletionResponse was null or undefined when calling postChatCompletionResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionResponse`,
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
        body: queryParameters || ChatCompletionResponseToJSON(requestParameters.chatCompletionResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatCompletionResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ChatCompletionResponse.
* Create a new ChatCompletionResponse
*/
export function postChatCompletionResponse(requestParameters, requestConfig) {
    return postChatCompletionResponseRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ChatCompletionResponse.
 * Update an existing ChatCompletionResponse
 */
function updateChatCompletionResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateChatCompletionResponse.');
    }
    if (requestParameters.chatCompletionResponse === null || requestParameters.chatCompletionResponse === undefined) {
        throw new runtime.RequiredError('chatCompletionResponse', 'Required parameter requestParameters.chatCompletionResponse was null or undefined when calling updateChatCompletionResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChatCompletionResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ChatCompletionResponseToJSON(requestParameters.chatCompletionResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChatCompletionResponseFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ChatCompletionResponse.
* Update an existing ChatCompletionResponse
*/
export function updateChatCompletionResponse(requestParameters, requestConfig) {
    return updateChatCompletionResponseRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ChatCompletionResponseApi.js.map