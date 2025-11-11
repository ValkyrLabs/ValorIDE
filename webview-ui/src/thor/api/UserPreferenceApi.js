// tslint:disable
import * as runtime from '../src/runtime';
import { UserPreferenceFromJSON, UserPreferenceToJSON, } from '../model';
/**
 * Deletes a specific UserPreference.
 * Delete a UserPreference.
 */
function deleteUserPreferenceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteUserPreference.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UserPreference/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific UserPreference.
* Delete a UserPreference.
*/
export function deleteUserPreference(requestParameters, requestConfig) {
    return deleteUserPreferenceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single UserPreference for a specific uid.
 * Retrieve a single UserPreference
 */
function getUserPreferenceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getUserPreference.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UserPreference/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(UserPreferenceFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single UserPreference for a specific uid.
* Retrieve a single UserPreference
*/
export function getUserPreference(requestParameters, requestConfig) {
    return getUserPreferenceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of UserPreferences.
 * Retrieve a list of UserPreferences
 */
function getUserPreferenceListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/UserPreference`,
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
        config.transform = (body, text) => requestTransform(body.map(UserPreferenceFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of UserPreferences.
* Retrieve a list of UserPreferences
*/
export function getUserPreferenceList(requestParameters, requestConfig) {
    return getUserPreferenceListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new UserPreference.
 * Create a new UserPreference
 */
function postUserPreferenceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.userPreference === null || requestParameters.userPreference === undefined) {
        throw new runtime.RequiredError('userPreference', 'Required parameter requestParameters.userPreference was null or undefined when calling postUserPreference.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UserPreference`,
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
        body: queryParameters || UserPreferenceToJSON(requestParameters.userPreference),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(UserPreferenceFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new UserPreference.
* Create a new UserPreference
*/
export function postUserPreference(requestParameters, requestConfig) {
    return postUserPreferenceRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing UserPreference.
 * Update an existing UserPreference
 */
function updateUserPreferenceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateUserPreference.');
    }
    if (requestParameters.userPreference === null || requestParameters.userPreference === undefined) {
        throw new runtime.RequiredError('userPreference', 'Required parameter requestParameters.userPreference was null or undefined when calling updateUserPreference.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UserPreference/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || UserPreferenceToJSON(requestParameters.userPreference),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(UserPreferenceFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing UserPreference.
* Update an existing UserPreference
*/
export function updateUserPreference(requestParameters, requestConfig) {
    return updateUserPreferenceRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=UserPreferenceApi.js.map