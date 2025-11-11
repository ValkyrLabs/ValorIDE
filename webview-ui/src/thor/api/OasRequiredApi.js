// tslint:disable
import * as runtime from '../src/runtime';
import { OasRequiredFromJSON, OasRequiredToJSON, } from '../model';
/**
 * Deletes a specific OasRequired.
 * Delete a OasRequired.
 */
function deleteOasRequiredRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasRequired.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasRequired/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasRequired.
* Delete a OasRequired.
*/
export function deleteOasRequired(requestParameters, requestConfig) {
    return deleteOasRequiredRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasRequired for a specific uid.
 * Retrieve a single OasRequired
 */
function getOasRequiredRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasRequired.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasRequired/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasRequiredFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasRequired for a specific uid.
* Retrieve a single OasRequired
*/
export function getOasRequired(requestParameters, requestConfig) {
    return getOasRequiredRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasRequireds.
 * Retrieve a list of OasRequireds
 */
function getOasRequiredListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasRequired`,
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
        config.transform = (body, text) => requestTransform(body.map(OasRequiredFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasRequireds.
* Retrieve a list of OasRequireds
*/
export function getOasRequiredList(requestParameters, requestConfig) {
    return getOasRequiredListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasRequired.
 * Create a new OasRequired
 */
function postOasRequiredRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasRequired === null || requestParameters.oasRequired === undefined) {
        throw new runtime.RequiredError('oasRequired', 'Required parameter requestParameters.oasRequired was null or undefined when calling postOasRequired.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasRequired`,
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
        body: queryParameters || OasRequiredToJSON(requestParameters.oasRequired),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasRequiredFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasRequired.
* Create a new OasRequired
*/
export function postOasRequired(requestParameters, requestConfig) {
    return postOasRequiredRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasRequired.
 * Update an existing OasRequired
 */
function updateOasRequiredRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasRequired.');
    }
    if (requestParameters.oasRequired === null || requestParameters.oasRequired === undefined) {
        throw new runtime.RequiredError('oasRequired', 'Required parameter requestParameters.oasRequired was null or undefined when calling updateOasRequired.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasRequired/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasRequiredToJSON(requestParameters.oasRequired),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasRequiredFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasRequired.
* Update an existing OasRequired
*/
export function updateOasRequired(requestParameters, requestConfig) {
    return updateOasRequiredRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasRequiredApi.js.map