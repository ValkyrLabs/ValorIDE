// tslint:disable
import * as runtime from '../src/runtime';
import { OasComponentFromJSON, OasComponentToJSON, } from '../model';
/**
 * Deletes a specific OasComponent.
 * Delete a OasComponent.
 */
function deleteOasComponentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasComponent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasComponent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasComponent.
* Delete a OasComponent.
*/
export function deleteOasComponent(requestParameters, requestConfig) {
    return deleteOasComponentRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasComponent for a specific uid.
 * Retrieve a single OasComponent
 */
function getOasComponentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasComponent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasComponent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasComponentFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasComponent for a specific uid.
* Retrieve a single OasComponent
*/
export function getOasComponent(requestParameters, requestConfig) {
    return getOasComponentRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasComponents.
 * Retrieve a list of OasComponents
 */
function getOasComponentListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasComponent`,
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
        config.transform = (body, text) => requestTransform(body.map(OasComponentFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasComponents.
* Retrieve a list of OasComponents
*/
export function getOasComponentList(requestParameters, requestConfig) {
    return getOasComponentListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasComponent.
 * Create a new OasComponent
 */
function postOasComponentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasComponent === null || requestParameters.oasComponent === undefined) {
        throw new runtime.RequiredError('oasComponent', 'Required parameter requestParameters.oasComponent was null or undefined when calling postOasComponent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasComponent`,
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
        body: queryParameters || OasComponentToJSON(requestParameters.oasComponent),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasComponentFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasComponent.
* Create a new OasComponent
*/
export function postOasComponent(requestParameters, requestConfig) {
    return postOasComponentRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasComponent.
 * Update an existing OasComponent
 */
function updateOasComponentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasComponent.');
    }
    if (requestParameters.oasComponent === null || requestParameters.oasComponent === undefined) {
        throw new runtime.RequiredError('oasComponent', 'Required parameter requestParameters.oasComponent was null or undefined when calling updateOasComponent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasComponent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasComponentToJSON(requestParameters.oasComponent),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasComponentFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasComponent.
* Update an existing OasComponent
*/
export function updateOasComponent(requestParameters, requestConfig) {
    return updateOasComponentRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasComponentApi.js.map