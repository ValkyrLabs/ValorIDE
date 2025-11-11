// tslint:disable
import * as runtime from '../src/runtime';
import { SheetFromJSON, SheetToJSON, } from '../model';
/**
 * Deletes a specific Sheet.
 * Delete a Sheet.
 */
function deleteSheetRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSheet.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Sheet/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Sheet.
* Delete a Sheet.
*/
export function deleteSheet(requestParameters, requestConfig) {
    return deleteSheetRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Sheet for a specific uid.
 * Retrieve a single Sheet
 */
function getSheetRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSheet.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Sheet/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SheetFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Sheet for a specific uid.
* Retrieve a single Sheet
*/
export function getSheet(requestParameters, requestConfig) {
    return getSheetRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Sheets.
 * Retrieve a list of Sheets
 */
function getSheetListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Sheet`,
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
        config.transform = (body, text) => requestTransform(body.map(SheetFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Sheets.
* Retrieve a list of Sheets
*/
export function getSheetList(requestParameters, requestConfig) {
    return getSheetListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Sheet.
 * Create a new Sheet
 */
function postSheetRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.sheet === null || requestParameters.sheet === undefined) {
        throw new runtime.RequiredError('sheet', 'Required parameter requestParameters.sheet was null or undefined when calling postSheet.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Sheet`,
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
        body: queryParameters || SheetToJSON(requestParameters.sheet),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SheetFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Sheet.
* Create a new Sheet
*/
export function postSheet(requestParameters, requestConfig) {
    return postSheetRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Sheet.
 * Update an existing Sheet
 */
function updateSheetRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSheet.');
    }
    if (requestParameters.sheet === null || requestParameters.sheet === undefined) {
        throw new runtime.RequiredError('sheet', 'Required parameter requestParameters.sheet was null or undefined when calling updateSheet.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Sheet/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SheetToJSON(requestParameters.sheet),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SheetFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Sheet.
* Update an existing Sheet
*/
export function updateSheet(requestParameters, requestConfig) {
    return updateSheetRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SheetApi.js.map