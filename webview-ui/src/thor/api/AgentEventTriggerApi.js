// tslint:disable
import * as runtime from '../src/runtime';
import { AgentEventTriggerFromJSON, AgentEventTriggerToJSON, } from '../model';
/**
 * Deletes a specific AgentEventTrigger.
 * Delete a AgentEventTrigger.
 */
function deleteAgentEventTriggerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteAgentEventTrigger.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AgentEventTrigger/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific AgentEventTrigger.
* Delete a AgentEventTrigger.
*/
export function deleteAgentEventTrigger(requestParameters, requestConfig) {
    return deleteAgentEventTriggerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single AgentEventTrigger for a specific uid.
 * Retrieve a single AgentEventTrigger
 */
function getAgentEventTriggerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getAgentEventTrigger.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AgentEventTrigger/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(AgentEventTriggerFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single AgentEventTrigger for a specific uid.
* Retrieve a single AgentEventTrigger
*/
export function getAgentEventTrigger(requestParameters, requestConfig) {
    return getAgentEventTriggerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of AgentEventTriggers.
 * Retrieve a list of AgentEventTriggers
 */
function getAgentEventTriggerListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/AgentEventTrigger`,
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
        config.transform = (body, text) => requestTransform(body.map(AgentEventTriggerFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of AgentEventTriggers.
* Retrieve a list of AgentEventTriggers
*/
export function getAgentEventTriggerList(requestParameters, requestConfig) {
    return getAgentEventTriggerListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new AgentEventTrigger.
 * Create a new AgentEventTrigger
 */
function postAgentEventTriggerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.agentEventTrigger === null || requestParameters.agentEventTrigger === undefined) {
        throw new runtime.RequiredError('agentEventTrigger', 'Required parameter requestParameters.agentEventTrigger was null or undefined when calling postAgentEventTrigger.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AgentEventTrigger`,
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
        body: queryParameters || AgentEventTriggerToJSON(requestParameters.agentEventTrigger),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AgentEventTriggerFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new AgentEventTrigger.
* Create a new AgentEventTrigger
*/
export function postAgentEventTrigger(requestParameters, requestConfig) {
    return postAgentEventTriggerRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing AgentEventTrigger.
 * Update an existing AgentEventTrigger
 */
function updateAgentEventTriggerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateAgentEventTrigger.');
    }
    if (requestParameters.agentEventTrigger === null || requestParameters.agentEventTrigger === undefined) {
        throw new runtime.RequiredError('agentEventTrigger', 'Required parameter requestParameters.agentEventTrigger was null or undefined when calling updateAgentEventTrigger.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AgentEventTrigger/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || AgentEventTriggerToJSON(requestParameters.agentEventTrigger),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AgentEventTriggerFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing AgentEventTrigger.
* Update an existing AgentEventTrigger
*/
export function updateAgentEventTrigger(requestParameters, requestConfig) {
    return updateAgentEventTriggerRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=AgentEventTriggerApi.js.map