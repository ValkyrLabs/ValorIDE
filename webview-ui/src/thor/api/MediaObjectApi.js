// tslint:disable
import * as runtime from '../src/runtime';
import { MediaObjectFromJSON, MediaObjectToJSON, } from '../model';
/**
 * Deletes a specific MediaObject.
 * Delete a MediaObject.
 */
function deleteMediaObjectRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMediaObject.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MediaObject/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific MediaObject.
* Delete a MediaObject.
*/
export function deleteMediaObject(requestParameters, requestConfig) {
    return deleteMediaObjectRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single MediaObject for a specific uid.
 * Retrieve a single MediaObject
 */
function getMediaObjectRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMediaObject.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MediaObject/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(MediaObjectFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single MediaObject for a specific uid.
* Retrieve a single MediaObject
*/
export function getMediaObject(requestParameters, requestConfig) {
    return getMediaObjectRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of MediaObjects.
 * Retrieve a list of MediaObjects
 */
function getMediaObjectListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/MediaObject`,
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
        config.transform = (body, text) => requestTransform(body.map(MediaObjectFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of MediaObjects.
* Retrieve a list of MediaObjects
*/
export function getMediaObjectList(requestParameters, requestConfig) {
    return getMediaObjectListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new MediaObject.
 * Create a new MediaObject
 */
function postMediaObjectRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mediaObject === null || requestParameters.mediaObject === undefined) {
        throw new runtime.RequiredError('mediaObject', 'Required parameter requestParameters.mediaObject was null or undefined when calling postMediaObject.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MediaObject`,
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
        body: queryParameters || MediaObjectToJSON(requestParameters.mediaObject),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(MediaObjectFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new MediaObject.
* Create a new MediaObject
*/
export function postMediaObject(requestParameters, requestConfig) {
    return postMediaObjectRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing MediaObject.
 * Update an existing MediaObject
 */
function updateMediaObjectRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMediaObject.');
    }
    if (requestParameters.mediaObject === null || requestParameters.mediaObject === undefined) {
        throw new runtime.RequiredError('mediaObject', 'Required parameter requestParameters.mediaObject was null or undefined when calling updateMediaObject.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MediaObject/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || MediaObjectToJSON(requestParameters.mediaObject),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(MediaObjectFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing MediaObject.
* Update an existing MediaObject
*/
export function updateMediaObject(requestParameters, requestConfig) {
    return updateMediaObjectRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=MediaObjectApi.js.map