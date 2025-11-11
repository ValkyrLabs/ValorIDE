// tslint:disable
import * as runtime from '../src/runtime';
import { ChartFromJSON, ChartToJSON, } from '../model';
/**
 * Deletes a specific Chart.
 * Delete a Chart.
 */
function deleteChartRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteChart.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Chart/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Chart.
* Delete a Chart.
*/
export function deleteChart(requestParameters, requestConfig) {
    return deleteChartRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Chart for a specific uid.
 * Retrieve a single Chart
 */
function getChartRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getChart.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Chart/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ChartFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Chart for a specific uid.
* Retrieve a single Chart
*/
export function getChart(requestParameters, requestConfig) {
    return getChartRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Charts.
 * Retrieve a list of Charts
 */
function getChartListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Chart`,
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
        config.transform = (body, text) => requestTransform(body.map(ChartFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Charts.
* Retrieve a list of Charts
*/
export function getChartList(requestParameters, requestConfig) {
    return getChartListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Chart.
 * Create a new Chart
 */
function postChartRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.chart === null || requestParameters.chart === undefined) {
        throw new runtime.RequiredError('chart', 'Required parameter requestParameters.chart was null or undefined when calling postChart.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Chart`,
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
        body: queryParameters || ChartToJSON(requestParameters.chart),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChartFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Chart.
* Create a new Chart
*/
export function postChart(requestParameters, requestConfig) {
    return postChartRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Chart.
 * Update an existing Chart
 */
function updateChartRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateChart.');
    }
    if (requestParameters.chart === null || requestParameters.chart === undefined) {
        throw new runtime.RequiredError('chart', 'Required parameter requestParameters.chart was null or undefined when calling updateChart.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Chart/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ChartToJSON(requestParameters.chart),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChartFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Chart.
* Update an existing Chart
*/
export function updateChart(requestParameters, requestConfig) {
    return updateChartRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ChartApi.js.map