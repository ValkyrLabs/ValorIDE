// tslint:disable
import * as runtime from '../src/runtime';
import { WebsocketMessageFromJSON, WebsocketMessageToJSON, } from '../model';
/**
 * Deletes a specific WebsocketMessage.
 * Delete a WebsocketMessage.
 */
function deleteWebsocketMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteWebsocketMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketMessage/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific WebsocketMessage.
* Delete a WebsocketMessage.
*/
export function deleteWebsocketMessage(requestParameters, requestConfig) {
    return deleteWebsocketMessageRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single WebsocketMessage for a specific uid.
 * Retrieve a single WebsocketMessage
 */
function getWebsocketMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getWebsocketMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketMessage/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(WebsocketMessageFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single WebsocketMessage for a specific uid.
* Retrieve a single WebsocketMessage
*/
export function getWebsocketMessage(requestParameters, requestConfig) {
    return getWebsocketMessageRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of WebsocketMessages.
 * Retrieve a list of WebsocketMessages
 */
function getWebsocketMessageListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/WebsocketMessage`,
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
        config.transform = (body, text) => requestTransform(body.map(WebsocketMessageFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of WebsocketMessages.
* Retrieve a list of WebsocketMessages
*/
export function getWebsocketMessageList(requestParameters, requestConfig) {
    return getWebsocketMessageListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new WebsocketMessage.
 * Create a new WebsocketMessage
 */
function postWebsocketMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.websocketMessage === null || requestParameters.websocketMessage === undefined) {
        throw new runtime.RequiredError('websocketMessage', 'Required parameter requestParameters.websocketMessage was null or undefined when calling postWebsocketMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketMessage`,
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
        body: queryParameters || WebsocketMessageToJSON(requestParameters.websocketMessage),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WebsocketMessageFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new WebsocketMessage.
* Create a new WebsocketMessage
*/
export function postWebsocketMessage(requestParameters, requestConfig) {
    return postWebsocketMessageRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing WebsocketMessage.
 * Update an existing WebsocketMessage
 */
function updateWebsocketMessageRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateWebsocketMessage.');
    }
    if (requestParameters.websocketMessage === null || requestParameters.websocketMessage === undefined) {
        throw new runtime.RequiredError('websocketMessage', 'Required parameter requestParameters.websocketMessage was null or undefined when calling updateWebsocketMessage.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketMessage/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || WebsocketMessageToJSON(requestParameters.websocketMessage),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WebsocketMessageFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing WebsocketMessage.
* Update an existing WebsocketMessage
*/
export function updateWebsocketMessage(requestParameters, requestConfig) {
    return updateWebsocketMessageRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=WebsocketMessageApi.js.map