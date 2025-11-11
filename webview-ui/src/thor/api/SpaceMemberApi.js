// tslint:disable
import * as runtime from '../src/runtime';
import { SpaceMemberFromJSON, SpaceMemberToJSON, } from '../model';
/**
 * Deletes a specific SpaceMember.
 * Delete a SpaceMember.
 */
function deleteSpaceMemberRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSpaceMember.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceMember/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SpaceMember.
* Delete a SpaceMember.
*/
export function deleteSpaceMember(requestParameters, requestConfig) {
    return deleteSpaceMemberRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SpaceMember for a specific uid.
 * Retrieve a single SpaceMember
 */
function getSpaceMemberRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSpaceMember.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceMember/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SpaceMemberFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SpaceMember for a specific uid.
* Retrieve a single SpaceMember
*/
export function getSpaceMember(requestParameters, requestConfig) {
    return getSpaceMemberRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SpaceMembers.
 * Retrieve a list of SpaceMembers
 */
function getSpaceMemberListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SpaceMember`,
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
        config.transform = (body, text) => requestTransform(body.map(SpaceMemberFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SpaceMembers.
* Retrieve a list of SpaceMembers
*/
export function getSpaceMemberList(requestParameters, requestConfig) {
    return getSpaceMemberListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SpaceMember.
 * Create a new SpaceMember
 */
function postSpaceMemberRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.spaceMember === null || requestParameters.spaceMember === undefined) {
        throw new runtime.RequiredError('spaceMember', 'Required parameter requestParameters.spaceMember was null or undefined when calling postSpaceMember.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceMember`,
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
        body: queryParameters || SpaceMemberToJSON(requestParameters.spaceMember),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SpaceMemberFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SpaceMember.
* Create a new SpaceMember
*/
export function postSpaceMember(requestParameters, requestConfig) {
    return postSpaceMemberRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SpaceMember.
 * Update an existing SpaceMember
 */
function updateSpaceMemberRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSpaceMember.');
    }
    if (requestParameters.spaceMember === null || requestParameters.spaceMember === undefined) {
        throw new runtime.RequiredError('spaceMember', 'Required parameter requestParameters.spaceMember was null or undefined when calling updateSpaceMember.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceMember/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SpaceMemberToJSON(requestParameters.spaceMember),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SpaceMemberFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SpaceMember.
* Update an existing SpaceMember
*/
export function updateSpaceMember(requestParameters, requestConfig) {
    return updateSpaceMemberRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SpaceMemberApi.js.map