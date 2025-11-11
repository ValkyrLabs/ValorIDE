// tslint:disable
import * as runtime from '../src/runtime';
import { WorkbookFromJSON, WorkbookToJSON, } from '../model';
/**
 * Deletes a specific Workbook.
 * Delete a Workbook.
 */
function deleteWorkbookRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteWorkbook.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workbook/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Workbook.
* Delete a Workbook.
*/
export function deleteWorkbook(requestParameters, requestConfig) {
    return deleteWorkbookRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Workbook for a specific uid.
 * Retrieve a single Workbook
 */
function getWorkbookRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getWorkbook.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workbook/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(WorkbookFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Workbook for a specific uid.
* Retrieve a single Workbook
*/
export function getWorkbook(requestParameters, requestConfig) {
    return getWorkbookRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Workbooks.
 * Retrieve a list of Workbooks
 */
function getWorkbookListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Workbook`,
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
        config.transform = (body, text) => requestTransform(body.map(WorkbookFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Workbooks.
* Retrieve a list of Workbooks
*/
export function getWorkbookList(requestParameters, requestConfig) {
    return getWorkbookListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Workbook.
 * Create a new Workbook
 */
function postWorkbookRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.workbook === null || requestParameters.workbook === undefined) {
        throw new runtime.RequiredError('workbook', 'Required parameter requestParameters.workbook was null or undefined when calling postWorkbook.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workbook`,
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
        body: queryParameters || WorkbookToJSON(requestParameters.workbook),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WorkbookFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Workbook.
* Create a new Workbook
*/
export function postWorkbook(requestParameters, requestConfig) {
    return postWorkbookRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Workbook.
 * Update an existing Workbook
 */
function updateWorkbookRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateWorkbook.');
    }
    if (requestParameters.workbook === null || requestParameters.workbook === undefined) {
        throw new runtime.RequiredError('workbook', 'Required parameter requestParameters.workbook was null or undefined when calling updateWorkbook.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workbook/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || WorkbookToJSON(requestParameters.workbook),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WorkbookFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Workbook.
* Update an existing Workbook
*/
export function updateWorkbook(requestParameters, requestConfig) {
    return updateWorkbookRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=WorkbookApi.js.map