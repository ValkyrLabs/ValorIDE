// tslint:disable
import * as runtime from '../src/runtime';
import { SheetRowFromJSON, SheetRowToJSON, } from '../model';
/**
 * Deletes a specific SheetRow.
 * Delete a SheetRow.
 */
function deleteSheetRowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSheetRow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetRow/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SheetRow.
* Delete a SheetRow.
*/
export function deleteSheetRow(requestParameters, requestConfig) {
    return deleteSheetRowRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SheetRow for a specific uid.
 * Retrieve a single SheetRow
 */
function getSheetRowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSheetRow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetRow/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SheetRowFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SheetRow for a specific uid.
* Retrieve a single SheetRow
*/
export function getSheetRow(requestParameters, requestConfig) {
    return getSheetRowRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SheetRows.
 * Retrieve a list of SheetRows
 */
function getSheetRowListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SheetRow`,
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
        config.transform = (body, text) => requestTransform(body.map(SheetRowFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SheetRows.
* Retrieve a list of SheetRows
*/
export function getSheetRowList(requestParameters, requestConfig) {
    return getSheetRowListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SheetRow.
 * Create a new SheetRow
 */
function postSheetRowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.sheetRow === null || requestParameters.sheetRow === undefined) {
        throw new runtime.RequiredError('sheetRow', 'Required parameter requestParameters.sheetRow was null or undefined when calling postSheetRow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetRow`,
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
        body: queryParameters || SheetRowToJSON(requestParameters.sheetRow),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SheetRowFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SheetRow.
* Create a new SheetRow
*/
export function postSheetRow(requestParameters, requestConfig) {
    return postSheetRowRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SheetRow.
 * Update an existing SheetRow
 */
function updateSheetRowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSheetRow.');
    }
    if (requestParameters.sheetRow === null || requestParameters.sheetRow === undefined) {
        throw new runtime.RequiredError('sheetRow', 'Required parameter requestParameters.sheetRow was null or undefined when calling updateSheetRow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SheetRow/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SheetRowToJSON(requestParameters.sheetRow),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SheetRowFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SheetRow.
* Update an existing SheetRow
*/
export function updateSheetRow(requestParameters, requestConfig) {
    return updateSheetRowRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SheetRowApi.js.map