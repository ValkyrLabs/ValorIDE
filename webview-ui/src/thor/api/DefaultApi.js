// tslint:disable
import * as runtime from '../src/runtime';
import { SwarmCommandRequestToJSON, SwarmCommandResponseFromJSON, SwarmRegisterRequestToJSON, SwarmRegisterResponseFromJSON, SwarmUnregisterRequestToJSON, SwarmUnregisterResponseFromJSON, } from '../model';
/**
 * Forwards a command message to a specific agent instance or broadcasts to all agents.
 * Forward a swarm command
 */
function forwardSwarmCommandRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.swarmCommandRequest === null || requestParameters.swarmCommandRequest === undefined) {
        throw new runtime.RequiredError('swarmCommandRequest', 'Required parameter requestParameters.swarmCommandRequest was null or undefined when calling forwardSwarmCommand.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SwarmOps/command`,
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
        body: queryParameters || SwarmCommandRequestToJSON(requestParameters.swarmCommandRequest),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SwarmCommandResponseFromJSON(body), text);
    }
    return config;
}
/**
* Forwards a command message to a specific agent instance or broadcasts to all agents.
* Forward a swarm command
*/
export function forwardSwarmCommand(requestParameters, requestConfig) {
    return forwardSwarmCommandRaw(requestParameters, requestConfig);
}
/**
 * Registers an agent instance with the swarm registry and updates its metadata.
 * Register or refresh a swarm agent
 */
function registerSwarmAgentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.swarmRegisterRequest === null || requestParameters.swarmRegisterRequest === undefined) {
        throw new runtime.RequiredError('swarmRegisterRequest', 'Required parameter requestParameters.swarmRegisterRequest was null or undefined when calling registerSwarmAgent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SwarmOps/register`,
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
        body: queryParameters || SwarmRegisterRequestToJSON(requestParameters.swarmRegisterRequest),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SwarmRegisterResponseFromJSON(body), text);
    }
    return config;
}
/**
* Registers an agent instance with the swarm registry and updates its metadata.
* Register or refresh a swarm agent
*/
export function registerSwarmAgent(requestParameters, requestConfig) {
    return registerSwarmAgentRaw(requestParameters, requestConfig);
}
/**
 * Removes an agent instance from the swarm registry.
 * Unregister a swarm agent
 */
function unregisterSwarmAgentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.swarmUnregisterRequest === null || requestParameters.swarmUnregisterRequest === undefined) {
        throw new runtime.RequiredError('swarmUnregisterRequest', 'Required parameter requestParameters.swarmUnregisterRequest was null or undefined when calling unregisterSwarmAgent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SwarmOps/unregister`,
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
        body: queryParameters || SwarmUnregisterRequestToJSON(requestParameters.swarmUnregisterRequest),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SwarmUnregisterResponseFromJSON(body), text);
    }
    return config;
}
/**
* Removes an agent instance from the swarm registry.
* Unregister a swarm agent
*/
export function unregisterSwarmAgent(requestParameters, requestConfig) {
    return unregisterSwarmAgentRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=DefaultApi.js.map