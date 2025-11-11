// tslint:disable
import * as runtime from '../src/runtime';
/**
 * Runner keepalive to prevent lease expiration and zombie reaping
 * Update run heartbeat timestamp
 */
function updateRunHeartbeatRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateRunHeartbeat.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Run/{id}/heartbeat`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Runner keepalive to prevent lease expiration and zombie reaping
* Update run heartbeat timestamp
*/
export function updateRunHeartbeat(requestParameters, requestConfig) {
    return updateRunHeartbeatRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=RunApi.js.map