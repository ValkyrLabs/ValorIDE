// tslint:disable
import * as runtime from '../src/runtime';
import { FormatFromJSON, FormatToJSON, } from '../model';
/**
 * Deletes a specific Format.
 * Delete a Format.
 */
function deleteFormatRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteFormat.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Format/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Format.
* Delete a Format.
*/
export function deleteFormat(requestParameters, requestConfig) {
    return deleteFormatRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Format for a specific uid.
 * Retrieve a single Format
 */
function getFormatRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getFormat.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Format/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(FormatFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Format for a specific uid.
* Retrieve a single Format
*/
export function getFormat(requestParameters, requestConfig) {
    return getFormatRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Formats.
 * Retrieve a list of Formats
 */
function getFormatListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Format`,
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
        config.transform = (body, text) => requestTransform(body.map(FormatFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Formats.
* Retrieve a list of Formats
*/
export function getFormatList(requestParameters, requestConfig) {
    return getFormatListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Format.
 * Create a new Format
 */
function postFormatRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.format === null || requestParameters.format === undefined) {
        throw new runtime.RequiredError('format', 'Required parameter requestParameters.format was null or undefined when calling postFormat.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Format`,
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
        body: queryParameters || FormatToJSON(requestParameters.format),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FormatFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Format.
* Create a new Format
*/
export function postFormat(requestParameters, requestConfig) {
    return postFormatRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Format.
 * Update an existing Format
 */
function updateFormatRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateFormat.');
    }
    if (requestParameters.format === null || requestParameters.format === undefined) {
        throw new runtime.RequiredError('format', 'Required parameter requestParameters.format was null or undefined when calling updateFormat.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Format/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || FormatToJSON(requestParameters.format),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FormatFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Format.
* Update an existing Format
*/
export function updateFormat(requestParameters, requestConfig) {
    return updateFormatRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=FormatApi.js.map