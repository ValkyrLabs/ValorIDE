// tslint:disable
import * as runtime from '../src/runtime';
import { OasOperationFromJSON, OasOperationToJSON, } from '../model';
/**
 * Deletes a specific OasOperation.
 * Delete a OasOperation.
 */
function deleteOasOperationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasOperation.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOperation/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasOperation.
* Delete a OasOperation.
*/
export function deleteOasOperation(requestParameters, requestConfig) {
    return deleteOasOperationRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasOperation for a specific uid.
 * Retrieve a single OasOperation
 */
function getOasOperationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasOperation.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOperation/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasOperationFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasOperation for a specific uid.
* Retrieve a single OasOperation
*/
export function getOasOperation(requestParameters, requestConfig) {
    return getOasOperationRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasOperations.
 * Retrieve a list of OasOperations
 */
function getOasOperationListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasOperation`,
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
        config.transform = (body, text) => requestTransform(body.map(OasOperationFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasOperations.
* Retrieve a list of OasOperations
*/
export function getOasOperationList(requestParameters, requestConfig) {
    return getOasOperationListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasOperation.
 * Create a new OasOperation
 */
function postOasOperationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasOperation === null || requestParameters.oasOperation === undefined) {
        throw new runtime.RequiredError('oasOperation', 'Required parameter requestParameters.oasOperation was null or undefined when calling postOasOperation.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOperation`,
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
        body: queryParameters || OasOperationToJSON(requestParameters.oasOperation),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasOperationFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasOperation.
* Create a new OasOperation
*/
export function postOasOperation(requestParameters, requestConfig) {
    return postOasOperationRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasOperation.
 * Update an existing OasOperation
 */
function updateOasOperationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasOperation.');
    }
    if (requestParameters.oasOperation === null || requestParameters.oasOperation === undefined) {
        throw new runtime.RequiredError('oasOperation', 'Required parameter requestParameters.oasOperation was null or undefined when calling updateOasOperation.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOperation/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasOperationToJSON(requestParameters.oasOperation),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasOperationFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasOperation.
* Update an existing OasOperation
*/
export function updateOasOperation(requestParameters, requestConfig) {
    return updateOasOperationRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasOperationApi.js.map