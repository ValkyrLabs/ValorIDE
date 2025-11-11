// tslint:disable
import * as runtime from '../src/runtime';
import { BuildFromJSON, BuildToJSON, } from '../model';
/**
 * Deletes a specific Build.
 * Delete a Build.
 */
function deleteBuildRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteBuild.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Build/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Build.
* Delete a Build.
*/
export function deleteBuild(requestParameters, requestConfig) {
    return deleteBuildRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Build for a specific uid.
 * Retrieve a single Build
 */
function getBuildRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getBuild.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Build/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(BuildFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Build for a specific uid.
* Retrieve a single Build
*/
export function getBuild(requestParameters, requestConfig) {
    return getBuildRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Builds.
 * Retrieve a list of Builds
 */
function getBuildListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Build`,
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
        config.transform = (body, text) => requestTransform(body.map(BuildFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Builds.
* Retrieve a list of Builds
*/
export function getBuildList(requestParameters, requestConfig) {
    return getBuildListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Build.
 * Create a new Build
 */
function postBuildRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.build === null || requestParameters.build === undefined) {
        throw new runtime.RequiredError('build', 'Required parameter requestParameters.build was null or undefined when calling postBuild.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Build`,
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
        body: queryParameters || BuildToJSON(requestParameters.build),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BuildFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Build.
* Create a new Build
*/
export function postBuild(requestParameters, requestConfig) {
    return postBuildRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Build.
 * Update an existing Build
 */
function updateBuildRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateBuild.');
    }
    if (requestParameters.build === null || requestParameters.build === undefined) {
        throw new runtime.RequiredError('build', 'Required parameter requestParameters.build was null or undefined when calling updateBuild.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Build/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || BuildToJSON(requestParameters.build),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BuildFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Build.
* Update an existing Build
*/
export function updateBuild(requestParameters, requestConfig) {
    return updateBuildRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=BuildApi.js.map