// tslint:disable
import * as runtime from '../src/runtime';
import { ContentMediaLinkFromJSON, ContentMediaLinkToJSON, } from '../model';
/**
 * Deletes a specific ContentMediaLink.
 * Delete a ContentMediaLink.
 */
function deleteContentMediaLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteContentMediaLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentMediaLink/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ContentMediaLink.
* Delete a ContentMediaLink.
*/
export function deleteContentMediaLink(requestParameters, requestConfig) {
    return deleteContentMediaLinkRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ContentMediaLink for a specific uid.
 * Retrieve a single ContentMediaLink
 */
function getContentMediaLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getContentMediaLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentMediaLink/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ContentMediaLinkFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ContentMediaLink for a specific uid.
* Retrieve a single ContentMediaLink
*/
export function getContentMediaLink(requestParameters, requestConfig) {
    return getContentMediaLinkRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ContentMediaLinks.
 * Retrieve a list of ContentMediaLinks
 */
function getContentMediaLinkListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ContentMediaLink`,
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
        config.transform = (body, text) => requestTransform(body.map(ContentMediaLinkFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ContentMediaLinks.
* Retrieve a list of ContentMediaLinks
*/
export function getContentMediaLinkList(requestParameters, requestConfig) {
    return getContentMediaLinkListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ContentMediaLink.
 * Create a new ContentMediaLink
 */
function postContentMediaLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.contentMediaLink === null || requestParameters.contentMediaLink === undefined) {
        throw new runtime.RequiredError('contentMediaLink', 'Required parameter requestParameters.contentMediaLink was null or undefined when calling postContentMediaLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentMediaLink`,
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
        body: queryParameters || ContentMediaLinkToJSON(requestParameters.contentMediaLink),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ContentMediaLinkFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ContentMediaLink.
* Create a new ContentMediaLink
*/
export function postContentMediaLink(requestParameters, requestConfig) {
    return postContentMediaLinkRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ContentMediaLink.
 * Update an existing ContentMediaLink
 */
function updateContentMediaLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateContentMediaLink.');
    }
    if (requestParameters.contentMediaLink === null || requestParameters.contentMediaLink === undefined) {
        throw new runtime.RequiredError('contentMediaLink', 'Required parameter requestParameters.contentMediaLink was null or undefined when calling updateContentMediaLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentMediaLink/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ContentMediaLinkToJSON(requestParameters.contentMediaLink),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ContentMediaLinkFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ContentMediaLink.
* Update an existing ContentMediaLink
*/
export function updateContentMediaLink(requestParameters, requestConfig) {
    return updateContentMediaLinkRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ContentMediaLinkApi.js.map