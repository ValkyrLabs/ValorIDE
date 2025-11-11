// tslint:disable
import * as runtime from '../src/runtime';
import { TaskFromJSON, TaskToJSON, } from '../model';
/**
 * Deletes a specific Task.
 * Delete a Task.
 */
function deleteTaskRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteTask.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Task/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Task.
* Delete a Task.
*/
export function deleteTask(requestParameters, requestConfig) {
    return deleteTaskRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Task for a specific uid.
 * Retrieve a single Task
 */
function getTaskRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getTask.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Task/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(TaskFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Task for a specific uid.
* Retrieve a single Task
*/
export function getTask(requestParameters, requestConfig) {
    return getTaskRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Tasks.
 * Retrieve a list of Tasks
 */
function getTaskListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Task`,
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
        config.transform = (body, text) => requestTransform(body.map(TaskFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Tasks.
* Retrieve a list of Tasks
*/
export function getTaskList(requestParameters, requestConfig) {
    return getTaskListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Task.
 * Create a new Task
 */
function postTaskRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.task === null || requestParameters.task === undefined) {
        throw new runtime.RequiredError('task', 'Required parameter requestParameters.task was null or undefined when calling postTask.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Task`,
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
        body: queryParameters || TaskToJSON(requestParameters.task),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(TaskFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Task.
* Create a new Task
*/
export function postTask(requestParameters, requestConfig) {
    return postTaskRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Task.
 * Update an existing Task
 */
function updateTaskRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateTask.');
    }
    if (requestParameters.task === null || requestParameters.task === undefined) {
        throw new runtime.RequiredError('task', 'Required parameter requestParameters.task was null or undefined when calling updateTask.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Task/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || TaskToJSON(requestParameters.task),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(TaskFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Task.
* Update an existing Task
*/
export function updateTask(requestParameters, requestConfig) {
    return updateTaskRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=TaskApi.js.map