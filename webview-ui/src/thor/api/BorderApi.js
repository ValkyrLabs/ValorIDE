// tslint:disable
import * as runtime from '../src/runtime';
import { BorderFromJSON, BorderToJSON, } from '../model';
/**
 * Deletes a specific Border.
 * Delete a Border.
 */
function deleteBorderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteBorder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Border/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Border.
* Delete a Border.
*/
export function deleteBorder(requestParameters, requestConfig) {
    return deleteBorderRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Border for a specific uid.
 * Retrieve a single Border
 */
function getBorderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getBorder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Border/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(BorderFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Border for a specific uid.
* Retrieve a single Border
*/
export function getBorder(requestParameters, requestConfig) {
    return getBorderRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Borders.
 * Retrieve a list of Borders
 */
function getBorderListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Border`,
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
        config.transform = (body, text) => requestTransform(body.map(BorderFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Borders.
* Retrieve a list of Borders
*/
export function getBorderList(requestParameters, requestConfig) {
    return getBorderListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Border.
 * Create a new Border
 */
function postBorderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.border === null || requestParameters.border === undefined) {
        throw new runtime.RequiredError('border', 'Required parameter requestParameters.border was null or undefined when calling postBorder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Border`,
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
        body: queryParameters || BorderToJSON(requestParameters.border),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BorderFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Border.
* Create a new Border
*/
export function postBorder(requestParameters, requestConfig) {
    return postBorderRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Border.
 * Update an existing Border
 */
function updateBorderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateBorder.');
    }
    if (requestParameters.border === null || requestParameters.border === undefined) {
        throw new runtime.RequiredError('border', 'Required parameter requestParameters.border was null or undefined when calling updateBorder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Border/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || BorderToJSON(requestParameters.border),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BorderFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Border.
* Update an existing Border
*/
export function updateBorder(requestParameters, requestConfig) {
    return updateBorderRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=BorderApi.js.map