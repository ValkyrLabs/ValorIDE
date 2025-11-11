// tslint:disable
import * as runtime from '../src/runtime';
import { PtgFromJSON, PtgToJSON, } from '../model';
/**
 * Deletes a specific Ptg.
 * Delete a Ptg.
 */
function deletePtgRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deletePtg.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Ptg/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Ptg.
* Delete a Ptg.
*/
export function deletePtg(requestParameters, requestConfig) {
    return deletePtgRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Ptg for a specific uid.
 * Retrieve a single Ptg
 */
function getPtgRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getPtg.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Ptg/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(PtgFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Ptg for a specific uid.
* Retrieve a single Ptg
*/
export function getPtg(requestParameters, requestConfig) {
    return getPtgRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Ptgs.
 * Retrieve a list of Ptgs
 */
function getPtgListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Ptg`,
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
        config.transform = (body, text) => requestTransform(body.map(PtgFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Ptgs.
* Retrieve a list of Ptgs
*/
export function getPtgList(requestParameters, requestConfig) {
    return getPtgListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Ptg.
 * Create a new Ptg
 */
function postPtgRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.ptg === null || requestParameters.ptg === undefined) {
        throw new runtime.RequiredError('ptg', 'Required parameter requestParameters.ptg was null or undefined when calling postPtg.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Ptg`,
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
        body: queryParameters || PtgToJSON(requestParameters.ptg),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PtgFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Ptg.
* Create a new Ptg
*/
export function postPtg(requestParameters, requestConfig) {
    return postPtgRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Ptg.
 * Update an existing Ptg
 */
function updatePtgRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updatePtg.');
    }
    if (requestParameters.ptg === null || requestParameters.ptg === undefined) {
        throw new runtime.RequiredError('ptg', 'Required parameter requestParameters.ptg was null or undefined when calling updatePtg.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Ptg/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || PtgToJSON(requestParameters.ptg),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PtgFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Ptg.
* Update an existing Ptg
*/
export function updatePtg(requestParameters, requestConfig) {
    return updatePtgRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=PtgApi.js.map