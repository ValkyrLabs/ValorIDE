// tslint:disable
import * as runtime from '../src/runtime';
import { DiscardDeadLetterEntryRequestToJSON, DiscardDeadLetterEntryResponseFromJSON, RequeueDeadLetterEntryRequestToJSON, RequeueDeadLetterEntryResponseFromJSON, } from '../model';
/**
 * Marks the entry as discarded with operator notes and optional reason categorization
 * Discard a DLQ entry permanently
 */
function discardDeadLetterEntryRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling discardDeadLetterEntry.');
    }
    if (requestParameters.discardDeadLetterEntryRequest === null || requestParameters.discardDeadLetterEntryRequest === undefined) {
        throw new runtime.RequiredError('discardDeadLetterEntryRequest', 'Required parameter requestParameters.discardDeadLetterEntryRequest was null or undefined when calling discardDeadLetterEntry.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/DeadLetterQueue/{id}/discard`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || DiscardDeadLetterEntryRequestToJSON(requestParameters.discardDeadLetterEntryRequest),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(DiscardDeadLetterEntryResponseFromJSON(body), text);
    }
    return config;
}
/**
* Marks the entry as discarded with operator notes and optional reason categorization
* Discard a DLQ entry permanently
*/
export function discardDeadLetterEntry(requestParameters, requestConfig) {
    return discardDeadLetterEntryRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Run with optional input overrides and marks DLQ entry as requeued
 * Requeue a DLQ entry for retry
 */
function requeueDeadLetterEntryRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling requeueDeadLetterEntry.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/DeadLetterQueue/{id}/requeue`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || RequeueDeadLetterEntryRequestToJSON(requestParameters.requeueDeadLetterEntryRequest),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(RequeueDeadLetterEntryResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Run with optional input overrides and marks DLQ entry as requeued
* Requeue a DLQ entry for retry
*/
export function requeueDeadLetterEntry(requestParameters, requestConfig) {
    return requeueDeadLetterEntryRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=DeadLetterQueueApi.js.map