// tslint:disable
import * as runtime from '../src/runtime';
import { BackupConfigFromJSON, BackupConfigToJSON, } from '../model';
/**
 * Deletes a specific BackupConfig.
 * Delete a BackupConfig.
 */
function deleteBackupConfigRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteBackupConfig.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BackupConfig/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific BackupConfig.
* Delete a BackupConfig.
*/
export function deleteBackupConfig(requestParameters, requestConfig) {
    return deleteBackupConfigRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single BackupConfig for a specific uid.
 * Retrieve a single BackupConfig
 */
function getBackupConfigRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getBackupConfig.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BackupConfig/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(BackupConfigFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single BackupConfig for a specific uid.
* Retrieve a single BackupConfig
*/
export function getBackupConfig(requestParameters, requestConfig) {
    return getBackupConfigRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of BackupConfigs.
 * Retrieve a list of BackupConfigs
 */
function getBackupConfigListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/BackupConfig`,
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
        config.transform = (body, text) => requestTransform(body.map(BackupConfigFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of BackupConfigs.
* Retrieve a list of BackupConfigs
*/
export function getBackupConfigList(requestParameters, requestConfig) {
    return getBackupConfigListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new BackupConfig.
 * Create a new BackupConfig
 */
function postBackupConfigRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.backupConfig === null || requestParameters.backupConfig === undefined) {
        throw new runtime.RequiredError('backupConfig', 'Required parameter requestParameters.backupConfig was null or undefined when calling postBackupConfig.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BackupConfig`,
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
        body: queryParameters || BackupConfigToJSON(requestParameters.backupConfig),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BackupConfigFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new BackupConfig.
* Create a new BackupConfig
*/
export function postBackupConfig(requestParameters, requestConfig) {
    return postBackupConfigRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing BackupConfig.
 * Update an existing BackupConfig
 */
function updateBackupConfigRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateBackupConfig.');
    }
    if (requestParameters.backupConfig === null || requestParameters.backupConfig === undefined) {
        throw new runtime.RequiredError('backupConfig', 'Required parameter requestParameters.backupConfig was null or undefined when calling updateBackupConfig.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BackupConfig/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || BackupConfigToJSON(requestParameters.backupConfig),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BackupConfigFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing BackupConfig.
* Update an existing BackupConfig
*/
export function updateBackupConfig(requestParameters, requestConfig) {
    return updateBackupConfigRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=BackupConfigApi.js.map