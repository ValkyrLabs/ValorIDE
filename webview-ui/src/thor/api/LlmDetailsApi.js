// tslint:disable
import * as runtime from '../src/runtime';
import { LlmDetailsFromJSON, LlmDetailsToJSON, } from '../model';
/**
 * Deletes a specific LlmDetails.
 * Delete a LlmDetails.
 */
function deleteLlmDetailsRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteLlmDetails.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LlmDetails/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific LlmDetails.
* Delete a LlmDetails.
*/
export function deleteLlmDetails(requestParameters, requestConfig) {
    return deleteLlmDetailsRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single LlmDetails for a specific uid.
 * Retrieve a single LlmDetails
 */
function getLlmDetailsRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getLlmDetails.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LlmDetails/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(LlmDetailsFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single LlmDetails for a specific uid.
* Retrieve a single LlmDetails
*/
export function getLlmDetails(requestParameters, requestConfig) {
    return getLlmDetailsRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of LlmDetailss.
 * Retrieve a list of LlmDetailss
 */
function getLlmDetailsListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/LlmDetails`,
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
        config.transform = (body, text) => requestTransform(body.map(LlmDetailsFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of LlmDetailss.
* Retrieve a list of LlmDetailss
*/
export function getLlmDetailsList(requestParameters, requestConfig) {
    return getLlmDetailsListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new LlmDetails.
 * Create a new LlmDetails
 */
function postLlmDetailsRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.llmDetails === null || requestParameters.llmDetails === undefined) {
        throw new runtime.RequiredError('llmDetails', 'Required parameter requestParameters.llmDetails was null or undefined when calling postLlmDetails.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LlmDetails`,
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
        body: queryParameters || LlmDetailsToJSON(requestParameters.llmDetails),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LlmDetailsFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new LlmDetails.
* Create a new LlmDetails
*/
export function postLlmDetails(requestParameters, requestConfig) {
    return postLlmDetailsRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing LlmDetails.
 * Update an existing LlmDetails
 */
function updateLlmDetailsRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateLlmDetails.');
    }
    if (requestParameters.llmDetails === null || requestParameters.llmDetails === undefined) {
        throw new runtime.RequiredError('llmDetails', 'Required parameter requestParameters.llmDetails was null or undefined when calling updateLlmDetails.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LlmDetails/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || LlmDetailsToJSON(requestParameters.llmDetails),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LlmDetailsFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing LlmDetails.
* Update an existing LlmDetails
*/
export function updateLlmDetails(requestParameters, requestConfig) {
    return updateLlmDetailsRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=LlmDetailsApi.js.map