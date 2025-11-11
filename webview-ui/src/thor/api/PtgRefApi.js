// tslint:disable
import * as runtime from '../src/runtime';
import { PtgRefFromJSON, PtgRefToJSON, } from '../model';
/**
 * Deletes a specific PtgRef.
 * Delete a PtgRef.
 */
function deletePtgRefRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deletePtgRef.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PtgRef/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific PtgRef.
* Delete a PtgRef.
*/
export function deletePtgRef(requestParameters, requestConfig) {
    return deletePtgRefRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single PtgRef for a specific uid.
 * Retrieve a single PtgRef
 */
function getPtgRefRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getPtgRef.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PtgRef/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(PtgRefFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single PtgRef for a specific uid.
* Retrieve a single PtgRef
*/
export function getPtgRef(requestParameters, requestConfig) {
    return getPtgRefRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of PtgRefs.
 * Retrieve a list of PtgRefs
 */
function getPtgRefListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/PtgRef`,
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
        config.transform = (body, text) => requestTransform(body.map(PtgRefFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of PtgRefs.
* Retrieve a list of PtgRefs
*/
export function getPtgRefList(requestParameters, requestConfig) {
    return getPtgRefListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new PtgRef.
 * Create a new PtgRef
 */
function postPtgRefRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.ptgRef === null || requestParameters.ptgRef === undefined) {
        throw new runtime.RequiredError('ptgRef', 'Required parameter requestParameters.ptgRef was null or undefined when calling postPtgRef.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PtgRef`,
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
        body: queryParameters || PtgRefToJSON(requestParameters.ptgRef),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PtgRefFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new PtgRef.
* Create a new PtgRef
*/
export function postPtgRef(requestParameters, requestConfig) {
    return postPtgRefRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing PtgRef.
 * Update an existing PtgRef
 */
function updatePtgRefRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updatePtgRef.');
    }
    if (requestParameters.ptgRef === null || requestParameters.ptgRef === undefined) {
        throw new runtime.RequiredError('ptgRef', 'Required parameter requestParameters.ptgRef was null or undefined when calling updatePtgRef.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PtgRef/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || PtgRefToJSON(requestParameters.ptgRef),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PtgRefFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing PtgRef.
* Update an existing PtgRef
*/
export function updatePtgRef(requestParameters, requestConfig) {
    return updatePtgRefRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=PtgRefApi.js.map