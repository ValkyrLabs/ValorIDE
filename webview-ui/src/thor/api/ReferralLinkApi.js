// tslint:disable
import * as runtime from '../src/runtime';
import { ReferralLinkFromJSON, ReferralLinkToJSON, } from '../model';
/**
 * Deletes a specific ReferralLink.
 * Delete a ReferralLink.
 */
function deleteReferralLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteReferralLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ReferralLink/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ReferralLink.
* Delete a ReferralLink.
*/
export function deleteReferralLink(requestParameters, requestConfig) {
    return deleteReferralLinkRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ReferralLink for a specific uid.
 * Retrieve a single ReferralLink
 */
function getReferralLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getReferralLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ReferralLink/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ReferralLinkFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ReferralLink for a specific uid.
* Retrieve a single ReferralLink
*/
export function getReferralLink(requestParameters, requestConfig) {
    return getReferralLinkRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ReferralLinks.
 * Retrieve a list of ReferralLinks
 */
function getReferralLinkListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ReferralLink`,
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
        config.transform = (body, text) => requestTransform(body.map(ReferralLinkFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ReferralLinks.
* Retrieve a list of ReferralLinks
*/
export function getReferralLinkList(requestParameters, requestConfig) {
    return getReferralLinkListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ReferralLink.
 * Create a new ReferralLink
 */
function postReferralLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.referralLink === null || requestParameters.referralLink === undefined) {
        throw new runtime.RequiredError('referralLink', 'Required parameter requestParameters.referralLink was null or undefined when calling postReferralLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ReferralLink`,
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
        body: queryParameters || ReferralLinkToJSON(requestParameters.referralLink),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ReferralLinkFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ReferralLink.
* Create a new ReferralLink
*/
export function postReferralLink(requestParameters, requestConfig) {
    return postReferralLinkRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ReferralLink.
 * Update an existing ReferralLink
 */
function updateReferralLinkRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateReferralLink.');
    }
    if (requestParameters.referralLink === null || requestParameters.referralLink === undefined) {
        throw new runtime.RequiredError('referralLink', 'Required parameter requestParameters.referralLink was null or undefined when calling updateReferralLink.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ReferralLink/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ReferralLinkToJSON(requestParameters.referralLink),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ReferralLinkFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ReferralLink.
* Update an existing ReferralLink
*/
export function updateReferralLink(requestParameters, requestConfig) {
    return updateReferralLinkRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ReferralLinkApi.js.map