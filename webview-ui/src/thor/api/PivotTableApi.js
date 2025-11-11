// tslint:disable
import * as runtime from '../src/runtime';
import { PivotTableFromJSON, PivotTableToJSON, } from '../model';
/**
 * Deletes a specific PivotTable.
 * Delete a PivotTable.
 */
function deletePivotTableRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deletePivotTable.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PivotTable/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific PivotTable.
* Delete a PivotTable.
*/
export function deletePivotTable(requestParameters, requestConfig) {
    return deletePivotTableRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single PivotTable for a specific uid.
 * Retrieve a single PivotTable
 */
function getPivotTableRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getPivotTable.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PivotTable/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(PivotTableFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single PivotTable for a specific uid.
* Retrieve a single PivotTable
*/
export function getPivotTable(requestParameters, requestConfig) {
    return getPivotTableRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of PivotTables.
 * Retrieve a list of PivotTables
 */
function getPivotTableListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/PivotTable`,
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
        config.transform = (body, text) => requestTransform(body.map(PivotTableFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of PivotTables.
* Retrieve a list of PivotTables
*/
export function getPivotTableList(requestParameters, requestConfig) {
    return getPivotTableListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new PivotTable.
 * Create a new PivotTable
 */
function postPivotTableRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.pivotTable === null || requestParameters.pivotTable === undefined) {
        throw new runtime.RequiredError('pivotTable', 'Required parameter requestParameters.pivotTable was null or undefined when calling postPivotTable.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PivotTable`,
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
        body: queryParameters || PivotTableToJSON(requestParameters.pivotTable),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PivotTableFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new PivotTable.
* Create a new PivotTable
*/
export function postPivotTable(requestParameters, requestConfig) {
    return postPivotTableRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing PivotTable.
 * Update an existing PivotTable
 */
function updatePivotTableRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updatePivotTable.');
    }
    if (requestParameters.pivotTable === null || requestParameters.pivotTable === undefined) {
        throw new runtime.RequiredError('pivotTable', 'Required parameter requestParameters.pivotTable was null or undefined when calling updatePivotTable.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PivotTable/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || PivotTableToJSON(requestParameters.pivotTable),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PivotTableFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing PivotTable.
* Update an existing PivotTable
*/
export function updatePivotTable(requestParameters, requestConfig) {
    return updatePivotTableRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=PivotTableApi.js.map