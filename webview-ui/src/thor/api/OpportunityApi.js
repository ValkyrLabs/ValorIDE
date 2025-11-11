// tslint:disable
import * as runtime from '../src/runtime';
import { OpportunityFromJSON, OpportunityToJSON, } from '../model';
/**
 * Deletes a specific Opportunity.
 * Delete a Opportunity.
 */
function deleteOpportunityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOpportunity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Opportunity/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Opportunity.
* Delete a Opportunity.
*/
export function deleteOpportunity(requestParameters, requestConfig) {
    return deleteOpportunityRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Opportunity for a specific uid.
 * Retrieve a single Opportunity
 */
function getOpportunityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOpportunity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Opportunity/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OpportunityFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Opportunity for a specific uid.
* Retrieve a single Opportunity
*/
export function getOpportunity(requestParameters, requestConfig) {
    return getOpportunityRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Opportunitys.
 * Retrieve a list of Opportunitys
 */
function getOpportunityListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Opportunity`,
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
        config.transform = (body, text) => requestTransform(body.map(OpportunityFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Opportunitys.
* Retrieve a list of Opportunitys
*/
export function getOpportunityList(requestParameters, requestConfig) {
    return getOpportunityListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Opportunity.
 * Create a new Opportunity
 */
function postOpportunityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.opportunity === null || requestParameters.opportunity === undefined) {
        throw new runtime.RequiredError('opportunity', 'Required parameter requestParameters.opportunity was null or undefined when calling postOpportunity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Opportunity`,
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
        body: queryParameters || OpportunityToJSON(requestParameters.opportunity),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OpportunityFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Opportunity.
* Create a new Opportunity
*/
export function postOpportunity(requestParameters, requestConfig) {
    return postOpportunityRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Opportunity.
 * Update an existing Opportunity
 */
function updateOpportunityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOpportunity.');
    }
    if (requestParameters.opportunity === null || requestParameters.opportunity === undefined) {
        throw new runtime.RequiredError('opportunity', 'Required parameter requestParameters.opportunity was null or undefined when calling updateOpportunity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Opportunity/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OpportunityToJSON(requestParameters.opportunity),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OpportunityFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Opportunity.
* Update an existing Opportunity
*/
export function updateOpportunity(requestParameters, requestConfig) {
    return updateOpportunityRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OpportunityApi.js.map