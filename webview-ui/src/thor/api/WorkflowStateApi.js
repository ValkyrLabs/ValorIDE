// tslint:disable
import * as runtime from '../src/runtime';
import { WorkflowStateFromJSON, WorkflowStateToJSON, } from '../model';
/**
 * Deletes a specific WorkflowState.
 * Delete a WorkflowState.
 */
function deleteWorkflowStateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteWorkflowState.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WorkflowState/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific WorkflowState.
* Delete a WorkflowState.
*/
export function deleteWorkflowState(requestParameters, requestConfig) {
    return deleteWorkflowStateRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single WorkflowState for a specific uid.
 * Retrieve a single WorkflowState
 */
function getWorkflowStateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getWorkflowState.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WorkflowState/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(WorkflowStateFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single WorkflowState for a specific uid.
* Retrieve a single WorkflowState
*/
export function getWorkflowState(requestParameters, requestConfig) {
    return getWorkflowStateRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of WorkflowStates.
 * Retrieve a list of WorkflowStates
 */
function getWorkflowStateListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/WorkflowState`,
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
        config.transform = (body, text) => requestTransform(body.map(WorkflowStateFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of WorkflowStates.
* Retrieve a list of WorkflowStates
*/
export function getWorkflowStateList(requestParameters, requestConfig) {
    return getWorkflowStateListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new WorkflowState.
 * Create a new WorkflowState
 */
function postWorkflowStateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.workflowState === null || requestParameters.workflowState === undefined) {
        throw new runtime.RequiredError('workflowState', 'Required parameter requestParameters.workflowState was null or undefined when calling postWorkflowState.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WorkflowState`,
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
        body: queryParameters || WorkflowStateToJSON(requestParameters.workflowState),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WorkflowStateFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new WorkflowState.
* Create a new WorkflowState
*/
export function postWorkflowState(requestParameters, requestConfig) {
    return postWorkflowStateRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing WorkflowState.
 * Update an existing WorkflowState
 */
function updateWorkflowStateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateWorkflowState.');
    }
    if (requestParameters.workflowState === null || requestParameters.workflowState === undefined) {
        throw new runtime.RequiredError('workflowState', 'Required parameter requestParameters.workflowState was null or undefined when calling updateWorkflowState.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WorkflowState/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || WorkflowStateToJSON(requestParameters.workflowState),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WorkflowStateFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing WorkflowState.
* Update an existing WorkflowState
*/
export function updateWorkflowState(requestParameters, requestConfig) {
    return updateWorkflowStateRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=WorkflowStateApi.js.map