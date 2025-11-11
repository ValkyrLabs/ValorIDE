// tslint:disable
import * as runtime from '../src/runtime';
import { WebsocketSessionFromJSON, WebsocketSessionToJSON, } from '../model';
/**
 * Deletes a specific WebsocketSession.
 * Delete a WebsocketSession.
 */
function deleteWebsocketSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteWebsocketSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketSession/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific WebsocketSession.
* Delete a WebsocketSession.
*/
export function deleteWebsocketSession(requestParameters, requestConfig) {
    return deleteWebsocketSessionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single WebsocketSession for a specific uid.
 * Retrieve a single WebsocketSession
 */
function getWebsocketSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getWebsocketSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketSession/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(WebsocketSessionFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single WebsocketSession for a specific uid.
* Retrieve a single WebsocketSession
*/
export function getWebsocketSession(requestParameters, requestConfig) {
    return getWebsocketSessionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of WebsocketSessions.
 * Retrieve a list of WebsocketSessions
 */
function getWebsocketSessionListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/WebsocketSession`,
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
        config.transform = (body, text) => requestTransform(body.map(WebsocketSessionFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of WebsocketSessions.
* Retrieve a list of WebsocketSessions
*/
export function getWebsocketSessionList(requestParameters, requestConfig) {
    return getWebsocketSessionListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new WebsocketSession.
 * Create a new WebsocketSession
 */
function postWebsocketSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.websocketSession === null || requestParameters.websocketSession === undefined) {
        throw new runtime.RequiredError('websocketSession', 'Required parameter requestParameters.websocketSession was null or undefined when calling postWebsocketSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketSession`,
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
        body: queryParameters || WebsocketSessionToJSON(requestParameters.websocketSession),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WebsocketSessionFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new WebsocketSession.
* Create a new WebsocketSession
*/
export function postWebsocketSession(requestParameters, requestConfig) {
    return postWebsocketSessionRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing WebsocketSession.
 * Update an existing WebsocketSession
 */
function updateWebsocketSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateWebsocketSession.');
    }
    if (requestParameters.websocketSession === null || requestParameters.websocketSession === undefined) {
        throw new runtime.RequiredError('websocketSession', 'Required parameter requestParameters.websocketSession was null or undefined when calling updateWebsocketSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WebsocketSession/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || WebsocketSessionToJSON(requestParameters.websocketSession),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WebsocketSessionFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing WebsocketSession.
* Update an existing WebsocketSession
*/
export function updateWebsocketSession(requestParameters, requestConfig) {
    return updateWebsocketSessionRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=WebsocketSessionApi.js.map