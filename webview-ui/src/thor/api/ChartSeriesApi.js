// tslint:disable
import * as runtime from '../src/runtime';
import { ChartSeriesFromJSON, ChartSeriesToJSON, } from '../model';
/**
 * Deletes a specific ChartSeries.
 * Delete a ChartSeries.
 */
function deleteChartSeriesRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteChartSeries.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChartSeries/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ChartSeries.
* Delete a ChartSeries.
*/
export function deleteChartSeries(requestParameters, requestConfig) {
    return deleteChartSeriesRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ChartSeries for a specific uid.
 * Retrieve a single ChartSeries
 */
function getChartSeriesRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getChartSeries.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChartSeries/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ChartSeriesFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ChartSeries for a specific uid.
* Retrieve a single ChartSeries
*/
export function getChartSeries(requestParameters, requestConfig) {
    return getChartSeriesRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ChartSeriess.
 * Retrieve a list of ChartSeriess
 */
function getChartSeriesListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ChartSeries`,
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
        config.transform = (body, text) => requestTransform(body.map(ChartSeriesFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ChartSeriess.
* Retrieve a list of ChartSeriess
*/
export function getChartSeriesList(requestParameters, requestConfig) {
    return getChartSeriesListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ChartSeries.
 * Create a new ChartSeries
 */
function postChartSeriesRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.chartSeries === null || requestParameters.chartSeries === undefined) {
        throw new runtime.RequiredError('chartSeries', 'Required parameter requestParameters.chartSeries was null or undefined when calling postChartSeries.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChartSeries`,
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
        body: queryParameters || ChartSeriesToJSON(requestParameters.chartSeries),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChartSeriesFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ChartSeries.
* Create a new ChartSeries
*/
export function postChartSeries(requestParameters, requestConfig) {
    return postChartSeriesRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ChartSeries.
 * Update an existing ChartSeries
 */
function updateChartSeriesRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateChartSeries.');
    }
    if (requestParameters.chartSeries === null || requestParameters.chartSeries === undefined) {
        throw new runtime.RequiredError('chartSeries', 'Required parameter requestParameters.chartSeries was null or undefined when calling updateChartSeries.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ChartSeries/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ChartSeriesToJSON(requestParameters.chartSeries),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ChartSeriesFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ChartSeries.
* Update an existing ChartSeries
*/
export function updateChartSeries(requestParameters, requestConfig) {
    return updateChartSeriesRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ChartSeriesApi.js.map