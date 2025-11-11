// tslint:disable
import * as runtime from '../src/runtime';
import { ContentDataFromJSON, ContentDataToJSON, } from '../model';
/**
 * Deletes a specific ContentData.
 * Delete a ContentData.
 */
function deleteContentDataRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteContentData.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentData/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ContentData.
* Delete a ContentData.
*/
export function deleteContentData(requestParameters, requestConfig) {
    return deleteContentDataRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ContentData for a specific uid.
 * Retrieve a single ContentData
 */
function getContentDataRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getContentData.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentData/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ContentDataFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ContentData for a specific uid.
* Retrieve a single ContentData
*/
export function getContentData(requestParameters, requestConfig) {
    return getContentDataRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ContentDatas.
 * Retrieve a list of ContentDatas
 */
function getContentDataListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ContentData`,
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
        config.transform = (body, text) => requestTransform(body.map(ContentDataFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ContentDatas.
* Retrieve a list of ContentDatas
*/
export function getContentDataList(requestParameters, requestConfig) {
    return getContentDataListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ContentData.
 * Create a new ContentData
 */
function postContentDataRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.contentData === null || requestParameters.contentData === undefined) {
        throw new runtime.RequiredError('contentData', 'Required parameter requestParameters.contentData was null or undefined when calling postContentData.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentData`,
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
        body: queryParameters || ContentDataToJSON(requestParameters.contentData),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ContentDataFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ContentData.
* Create a new ContentData
*/
export function postContentData(requestParameters, requestConfig) {
    return postContentDataRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ContentData.
 * Update an existing ContentData
 */
function updateContentDataRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateContentData.');
    }
    if (requestParameters.contentData === null || requestParameters.contentData === undefined) {
        throw new runtime.RequiredError('contentData', 'Required parameter requestParameters.contentData was null or undefined when calling updateContentData.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ContentData/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ContentDataToJSON(requestParameters.contentData),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ContentDataFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ContentData.
* Update an existing ContentData
*/
export function updateContentData(requestParameters, requestConfig) {
    return updateContentDataRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ContentDataApi.js.map