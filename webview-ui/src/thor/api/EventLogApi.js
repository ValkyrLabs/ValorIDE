// tslint:disable
import * as runtime from '../src/runtime';
import { EventLogFromJSON, EventLogToJSON, } from '../model';
/**
 * Deletes a specific EventLog.
 * Delete a EventLog.
 */
function deleteEventLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteEventLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/EventLog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific EventLog.
* Delete a EventLog.
*/
export function deleteEventLog(requestParameters, requestConfig) {
    return deleteEventLogRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single EventLog for a specific uid.
 * Retrieve a single EventLog
 */
function getEventLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getEventLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/EventLog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(EventLogFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single EventLog for a specific uid.
* Retrieve a single EventLog
*/
export function getEventLog(requestParameters, requestConfig) {
    return getEventLogRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of EventLogs.
 * Retrieve a list of EventLogs
 */
function getEventLogListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/EventLog`,
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
        config.transform = (body, text) => requestTransform(body.map(EventLogFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of EventLogs.
* Retrieve a list of EventLogs
*/
export function getEventLogList(requestParameters, requestConfig) {
    return getEventLogListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new EventLog.
 * Create a new EventLog
 */
function postEventLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.eventLog === null || requestParameters.eventLog === undefined) {
        throw new runtime.RequiredError('eventLog', 'Required parameter requestParameters.eventLog was null or undefined when calling postEventLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/EventLog`,
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
        body: queryParameters || EventLogToJSON(requestParameters.eventLog),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(EventLogFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new EventLog.
* Create a new EventLog
*/
export function postEventLog(requestParameters, requestConfig) {
    return postEventLogRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing EventLog.
 * Update an existing EventLog
 */
function updateEventLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateEventLog.');
    }
    if (requestParameters.eventLog === null || requestParameters.eventLog === undefined) {
        throw new runtime.RequiredError('eventLog', 'Required parameter requestParameters.eventLog was null or undefined when calling updateEventLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/EventLog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || EventLogToJSON(requestParameters.eventLog),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(EventLogFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing EventLog.
* Update an existing EventLog
*/
export function updateEventLog(requestParameters, requestConfig) {
    return updateEventLogRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=EventLogApi.js.map