// tslint:disable
import * as runtime from '../src/runtime';
import { WorkflowFromJSON, WorkflowToJSON, } from '../model';
/**
 * Deletes a specific Workflow.
 * Delete a Workflow.
 */
function deleteWorkflowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteWorkflow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workflow/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Workflow.
* Delete a Workflow.
*/
export function deleteWorkflow(requestParameters, requestConfig) {
    return deleteWorkflowRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Workflow for a specific uid.
 * Retrieve a single Workflow
 */
function getWorkflowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getWorkflow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workflow/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(WorkflowFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Workflow for a specific uid.
* Retrieve a single Workflow
*/
export function getWorkflow(requestParameters, requestConfig) {
    return getWorkflowRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Workflows.
 * Retrieve a list of Workflows
 */
function getWorkflowListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Workflow`,
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
        config.transform = (body, text) => requestTransform(body.map(WorkflowFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Workflows.
* Retrieve a list of Workflows
*/
export function getWorkflowList(requestParameters, requestConfig) {
    return getWorkflowListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Workflow.
 * Create a new Workflow
 */
function postWorkflowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.workflow === null || requestParameters.workflow === undefined) {
        throw new runtime.RequiredError('workflow', 'Required parameter requestParameters.workflow was null or undefined when calling postWorkflow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workflow`,
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
        body: queryParameters || WorkflowToJSON(requestParameters.workflow),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WorkflowFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Workflow.
* Create a new Workflow
*/
export function postWorkflow(requestParameters, requestConfig) {
    return postWorkflowRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Workflow.
 * Update an existing Workflow
 */
function updateWorkflowRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateWorkflow.');
    }
    if (requestParameters.workflow === null || requestParameters.workflow === undefined) {
        throw new runtime.RequiredError('workflow', 'Required parameter requestParameters.workflow was null or undefined when calling updateWorkflow.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Workflow/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || WorkflowToJSON(requestParameters.workflow),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WorkflowFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Workflow.
* Update an existing Workflow
*/
export function updateWorkflow(requestParameters, requestConfig) {
    return updateWorkflowRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=WorkflowApi.js.map