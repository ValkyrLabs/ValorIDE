// tslint:disable
import * as runtime from '../src/runtime';
import { CampaignFromJSON, CampaignToJSON, } from '../model';
/**
 * Deletes a specific Campaign.
 * Delete a Campaign.
 */
function deleteCampaignRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteCampaign.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Campaign/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Campaign.
* Delete a Campaign.
*/
export function deleteCampaign(requestParameters, requestConfig) {
    return deleteCampaignRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Campaign for a specific uid.
 * Retrieve a single Campaign
 */
function getCampaignRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getCampaign.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Campaign/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(CampaignFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Campaign for a specific uid.
* Retrieve a single Campaign
*/
export function getCampaign(requestParameters, requestConfig) {
    return getCampaignRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Campaigns.
 * Retrieve a list of Campaigns
 */
function getCampaignListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Campaign`,
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
        config.transform = (body, text) => requestTransform(body.map(CampaignFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Campaigns.
* Retrieve a list of Campaigns
*/
export function getCampaignList(requestParameters, requestConfig) {
    return getCampaignListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Campaign.
 * Create a new Campaign
 */
function postCampaignRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.campaign === null || requestParameters.campaign === undefined) {
        throw new runtime.RequiredError('campaign', 'Required parameter requestParameters.campaign was null or undefined when calling postCampaign.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Campaign`,
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
        body: queryParameters || CampaignToJSON(requestParameters.campaign),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(CampaignFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Campaign.
* Create a new Campaign
*/
export function postCampaign(requestParameters, requestConfig) {
    return postCampaignRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Campaign.
 * Update an existing Campaign
 */
function updateCampaignRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateCampaign.');
    }
    if (requestParameters.campaign === null || requestParameters.campaign === undefined) {
        throw new runtime.RequiredError('campaign', 'Required parameter requestParameters.campaign was null or undefined when calling updateCampaign.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Campaign/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || CampaignToJSON(requestParameters.campaign),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(CampaignFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Campaign.
* Update an existing Campaign
*/
export function updateCampaign(requestParameters, requestConfig) {
    return updateCampaignRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=CampaignApi.js.map