// tslint:disable
import * as runtime from '../src/runtime';
import { SheetColumnFromJSON, SheetColumnToJSON, } from '../model';
/**
 * Deletes a specific SheetColumn.
 * Delete a SheetColumn.
 */
function deleteSheetColumnRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSheetColumn.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetColumn/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SheetColumn.
* Delete a SheetColumn.
*/
export function deleteSheetColumn(requestParameters, requestConfig) {
    return deleteSheetColumnRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SheetColumn for a specific uid.
 * Retrieve a single SheetColumn
 */
function getSheetColumnRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSheetColumn.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetColumn/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SheetColumnFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SheetColumn for a specific uid.
* Retrieve a single SheetColumn
*/
export function getSheetColumn(requestParameters, requestConfig) {
    return getSheetColumnRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SheetColumns.
 * Retrieve a list of SheetColumns
 */
function getSheetColumnListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SheetColumn`,
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
        config.transform = (body, text) => requestTransform(body.map(SheetColumnFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SheetColumns.
* Retrieve a list of SheetColumns
*/
export function getSheetColumnList(requestParameters, requestConfig) {
    return getSheetColumnListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SheetColumn.
 * Create a new SheetColumn
 */
function postSheetColumnRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.sheetColumn === null || requestParameters.sheetColumn === undefined) {
        throw new runtime.RequiredError('sheetColumn', 'Required parameter requestParameters.sheetColumn was null or undefined when calling postSheetColumn.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetColumn`,
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
        body: queryParameters || SheetColumnToJSON(requestParameters.sheetColumn),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SheetColumnFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SheetColumn.
* Create a new SheetColumn
*/
export function postSheetColumn(requestParameters, requestConfig) {
    return postSheetColumnRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SheetColumn.
 * Update an existing SheetColumn
 */
function updateSheetColumnRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSheetColumn.');
    }
    if (requestParameters.sheetColumn === null || requestParameters.sheetColumn === undefined) {
        throw new runtime.RequiredError('sheetColumn', 'Required parameter requestParameters.sheetColumn was null or undefined when calling updateSheetColumn.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetColumn/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SheetColumnToJSON(requestParameters.sheetColumn),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SheetColumnFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SheetColumn.
* Update an existing SheetColumn
*/
export function updateSheetColumn(requestParameters, requestConfig) {
    return updateSheetColumnRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SheetColumnApi.js.map