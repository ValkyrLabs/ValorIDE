// tslint:disable
import * as runtime from '../src/runtime';
import { CellFromJSON, CellToJSON, } from '../model';
/**
 * Deletes a specific Cell.
 * Delete a Cell.
 */
function deleteCellRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteCell.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Cell/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Cell.
* Delete a Cell.
*/
export function deleteCell(requestParameters, requestConfig) {
    return deleteCellRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Cell for a specific uid.
 * Retrieve a single Cell
 */
function getCellRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getCell.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Cell/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(CellFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Cell for a specific uid.
* Retrieve a single Cell
*/
export function getCell(requestParameters, requestConfig) {
    return getCellRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Cells.
 * Retrieve a list of Cells
 */
function getCellListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Cell`,
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
        config.transform = (body, text) => requestTransform(body.map(CellFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Cells.
* Retrieve a list of Cells
*/
export function getCellList(requestParameters, requestConfig) {
    return getCellListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Cell.
 * Create a new Cell
 */
function postCellRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.cell === null || requestParameters.cell === undefined) {
        throw new runtime.RequiredError('cell', 'Required parameter requestParameters.cell was null or undefined when calling postCell.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Cell`,
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
        body: queryParameters || CellToJSON(requestParameters.cell),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(CellFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Cell.
* Create a new Cell
*/
export function postCell(requestParameters, requestConfig) {
    return postCellRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Cell.
 * Update an existing Cell
 */
function updateCellRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateCell.');
    }
    if (requestParameters.cell === null || requestParameters.cell === undefined) {
        throw new runtime.RequiredError('cell', 'Required parameter requestParameters.cell was null or undefined when calling updateCell.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Cell/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || CellToJSON(requestParameters.cell),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(CellFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Cell.
* Update an existing Cell
*/
export function updateCell(requestParameters, requestConfig) {
    return updateCellRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=CellApi.js.map