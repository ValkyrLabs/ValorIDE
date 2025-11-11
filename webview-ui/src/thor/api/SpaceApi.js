// tslint:disable
import * as runtime from '../src/runtime';
import { SpaceFromJSON, SpaceToJSON, } from '../model';
/**
 * Deletes a specific Space.
 * Delete a Space.
 */
function deleteSpaceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSpace.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Space/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Space.
* Delete a Space.
*/
export function deleteSpace(requestParameters, requestConfig) {
    return deleteSpaceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Space for a specific uid.
 * Retrieve a single Space
 */
function getSpaceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSpace.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Space/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SpaceFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Space for a specific uid.
* Retrieve a single Space
*/
export function getSpace(requestParameters, requestConfig) {
    return getSpaceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Spaces.
 * Retrieve a list of Spaces
 */
function getSpaceListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Space`,
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
        config.transform = (body, text) => requestTransform(body.map(SpaceFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Spaces.
* Retrieve a list of Spaces
*/
export function getSpaceList(requestParameters, requestConfig) {
    return getSpaceListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Space.
 * Create a new Space
 */
function postSpaceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.space === null || requestParameters.space === undefined) {
        throw new runtime.RequiredError('space', 'Required parameter requestParameters.space was null or undefined when calling postSpace.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Space`,
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
        body: queryParameters || SpaceToJSON(requestParameters.space),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SpaceFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Space.
* Create a new Space
*/
export function postSpace(requestParameters, requestConfig) {
    return postSpaceRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Space.
 * Update an existing Space
 */
function updateSpaceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSpace.');
    }
    if (requestParameters.space === null || requestParameters.space === undefined) {
        throw new runtime.RequiredError('space', 'Required parameter requestParameters.space was null or undefined when calling updateSpace.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Space/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SpaceToJSON(requestParameters.space),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SpaceFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Space.
* Update an existing Space
*/
export function updateSpace(requestParameters, requestConfig) {
    return updateSpaceRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SpaceApi.js.map