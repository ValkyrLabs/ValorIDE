// tslint:disable
import * as runtime from '../src/runtime';
import { BuildOutputFromJSON, BuildOutputToJSON, } from '../model';
/**
 * Deletes a specific BuildOutput.
 * Delete a BuildOutput.
 */
function deleteBuildOutputRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteBuildOutput.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BuildOutput/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific BuildOutput.
* Delete a BuildOutput.
*/
export function deleteBuildOutput(requestParameters, requestConfig) {
    return deleteBuildOutputRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single BuildOutput for a specific uid.
 * Retrieve a single BuildOutput
 */
function getBuildOutputRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getBuildOutput.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BuildOutput/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(BuildOutputFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single BuildOutput for a specific uid.
* Retrieve a single BuildOutput
*/
export function getBuildOutput(requestParameters, requestConfig) {
    return getBuildOutputRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of BuildOutputs.
 * Retrieve a list of BuildOutputs
 */
function getBuildOutputListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/BuildOutput`,
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
        config.transform = (body, text) => requestTransform(body.map(BuildOutputFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of BuildOutputs.
* Retrieve a list of BuildOutputs
*/
export function getBuildOutputList(requestParameters, requestConfig) {
    return getBuildOutputListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new BuildOutput.
 * Create a new BuildOutput
 */
function postBuildOutputRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.buildOutput === null || requestParameters.buildOutput === undefined) {
        throw new runtime.RequiredError('buildOutput', 'Required parameter requestParameters.buildOutput was null or undefined when calling postBuildOutput.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BuildOutput`,
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
        body: queryParameters || BuildOutputToJSON(requestParameters.buildOutput),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BuildOutputFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new BuildOutput.
* Create a new BuildOutput
*/
export function postBuildOutput(requestParameters, requestConfig) {
    return postBuildOutputRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing BuildOutput.
 * Update an existing BuildOutput
 */
function updateBuildOutputRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateBuildOutput.');
    }
    if (requestParameters.buildOutput === null || requestParameters.buildOutput === undefined) {
        throw new runtime.RequiredError('buildOutput', 'Required parameter requestParameters.buildOutput was null or undefined when calling updateBuildOutput.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BuildOutput/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || BuildOutputToJSON(requestParameters.buildOutput),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BuildOutputFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing BuildOutput.
* Update an existing BuildOutput
*/
export function updateBuildOutput(requestParameters, requestConfig) {
    return updateBuildOutputRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=BuildOutputApi.js.map