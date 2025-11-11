// tslint:disable
import * as runtime from '../src/runtime';
/**
 * Gracefully cancels a running execution, stopping all pending tasks
 * Cancel a running workflow execution
 */
function cancelWorkflowExecutionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling cancelWorkflowExecution.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WorkflowExecution/{id}/cancel`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        throw "OH NO";
    }
    return config;
}
/**
* Gracefully cancels a running execution, stopping all pending tasks
* Cancel a running workflow execution
*/
export function cancelWorkflowExecution(requestParameters, requestConfig) {
    return cancelWorkflowExecutionRaw(requestParameters, requestConfig);
}
/**
 * Pauses execution after current task completes
 * Pause a running execution
 */
function pauseWorkflowExecutionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling pauseWorkflowExecution.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WorkflowExecution/{id}/pause`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
    }
    return config;
}
/**
* Pauses execution after current task completes
* Pause a running execution
*/
export function pauseWorkflowExecution(requestParameters, requestConfig) {
    return pauseWorkflowExecutionRaw(requestParameters, requestConfig);
}
/**
 * Resumes execution from the paused state
 * Resume a paused execution
 */
function resumeWorkflowExecutionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling resumeWorkflowExecution.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/WorkflowExecution/{id}/resume`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
    }
    return config;
}
/**
* Resumes execution from the paused state
* Resume a paused execution
*/
export function resumeWorkflowExecution(requestParameters, requestConfig) {
    return resumeWorkflowExecutionRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=WorkflowExecutionApi.js.map