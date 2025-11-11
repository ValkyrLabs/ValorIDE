// tslint:disable
import * as runtime from '../src/runtime';
import { OasServerFromJSON, OasServerToJSON, } from '../model';
/**
 * Deletes a specific OasServer.
 * Delete a OasServer.
 */
function deleteOasServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasServer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasServer.
* Delete a OasServer.
*/
export function deleteOasServer(requestParameters, requestConfig) {
    return deleteOasServerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasServer for a specific uid.
 * Retrieve a single OasServer
 */
function getOasServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasServer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasServerFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasServer for a specific uid.
* Retrieve a single OasServer
*/
export function getOasServer(requestParameters, requestConfig) {
    return getOasServerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasServers.
 * Retrieve a list of OasServers
 */
function getOasServerListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasServer`,
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
        config.transform = (body, text) => requestTransform(body.map(OasServerFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasServers.
* Retrieve a list of OasServers
*/
export function getOasServerList(requestParameters, requestConfig) {
    return getOasServerListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasServer.
 * Create a new OasServer
 */
function postOasServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasServer === null || requestParameters.oasServer === undefined) {
        throw new runtime.RequiredError('oasServer', 'Required parameter requestParameters.oasServer was null or undefined when calling postOasServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasServer`,
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
        body: queryParameters || OasServerToJSON(requestParameters.oasServer),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasServerFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasServer.
* Create a new OasServer
*/
export function postOasServer(requestParameters, requestConfig) {
    return postOasServerRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasServer.
 * Update an existing OasServer
 */
function updateOasServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasServer.');
    }
    if (requestParameters.oasServer === null || requestParameters.oasServer === undefined) {
        throw new runtime.RequiredError('oasServer', 'Required parameter requestParameters.oasServer was null or undefined when calling updateOasServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasServer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasServerToJSON(requestParameters.oasServer),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasServerFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasServer.
* Update an existing OasServer
*/
export function updateOasServer(requestParameters, requestConfig) {
    return updateOasServerRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasServerApi.js.map