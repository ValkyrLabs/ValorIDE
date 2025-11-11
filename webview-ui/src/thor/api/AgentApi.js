// tslint:disable
import * as runtime from '../src/runtime';
import { ActivateAgent200ResponseFromJSON, AgentFromJSON, AgentToJSON, } from '../model';
/**
 * Applies the Agent\'s CRON schedule to its workflows and registers configured event triggers.
 * Activate an Agent (schedule workflows and register triggers)
 */
function activateAgentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling activateAgent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Agent/{id}/activate`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters,
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ActivateAgent200ResponseFromJSON(body), text);
    }
    return config;
}
/**
* Applies the Agent\'s CRON schedule to its workflows and registers configured event triggers.
* Activate an Agent (schedule workflows and register triggers)
*/
export function activateAgent(requestParameters, requestConfig) {
    return activateAgentRaw(requestParameters, requestConfig);
}
/**
 * Deletes a specific Agent.
 * Delete a Agent.
 */
function deleteAgentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteAgent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Agent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Agent.
* Delete a Agent.
*/
export function deleteAgent(requestParameters, requestConfig) {
    return deleteAgentRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Agent for a specific uid.
 * Retrieve a single Agent
 */
function getAgentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getAgent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Agent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(AgentFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Agent for a specific uid.
* Retrieve a single Agent
*/
export function getAgent(requestParameters, requestConfig) {
    return getAgentRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Agents.
 * Retrieve a list of Agents
 */
function getAgentListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Agent`,
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
        config.transform = (body, text) => requestTransform(body.map(AgentFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Agents.
* Retrieve a list of Agents
*/
export function getAgentList(requestParameters, requestConfig) {
    return getAgentListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Agent.
 * Create a new Agent
 */
function postAgentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.agent === null || requestParameters.agent === undefined) {
        throw new runtime.RequiredError('agent', 'Required parameter requestParameters.agent was null or undefined when calling postAgent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Agent`,
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
        body: queryParameters || AgentToJSON(requestParameters.agent),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AgentFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Agent.
* Create a new Agent
*/
export function postAgent(requestParameters, requestConfig) {
    return postAgentRaw(requestParameters, requestConfig);
}
/**
 * Publishes an event that will be routed to any workflows registered for this Agent.
 * Publish an event for an Agent
 */
function publishAgentEventRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling publishAgentEvent.');
    }
    if (requestParameters.eventType === null || requestParameters.eventType === undefined) {
        throw new runtime.RequiredError('eventType', 'Required parameter requestParameters.eventType was null or undefined when calling publishAgentEvent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Agent/{id}/event/{eventType}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))).replace(`{${"eventType"}}`, encodeURIComponent(String(requestParameters.eventType))),
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
        body: queryParameters || requestParameters.requestBody,
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        throw "OH NO";
    }
    return config;
}
/**
* Publishes an event that will be routed to any workflows registered for this Agent.
* Publish an event for an Agent
*/
export function publishAgentEvent(requestParameters, requestConfig) {
    return publishAgentEventRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Agent.
 * Update an existing Agent
 */
function updateAgentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateAgent.');
    }
    if (requestParameters.agent === null || requestParameters.agent === undefined) {
        throw new runtime.RequiredError('agent', 'Required parameter requestParameters.agent was null or undefined when calling updateAgent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Agent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || AgentToJSON(requestParameters.agent),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AgentFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Agent.
* Update an existing Agent
*/
export function updateAgent(requestParameters, requestConfig) {
    return updateAgentRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=AgentApi.js.map