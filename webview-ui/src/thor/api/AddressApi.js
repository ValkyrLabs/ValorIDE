// tslint:disable
import * as runtime from '../src/runtime';
import { AddressFromJSON, AddressToJSON, } from '../model';
/**
 * Deletes a specific Address.
 * Delete a Address.
 */
function deleteAddressRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteAddress.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Address/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Address.
* Delete a Address.
*/
export function deleteAddress(requestParameters, requestConfig) {
    return deleteAddressRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Address for a specific uid.
 * Retrieve a single Address
 */
function getAddressRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getAddress.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Address/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(AddressFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Address for a specific uid.
* Retrieve a single Address
*/
export function getAddress(requestParameters, requestConfig) {
    return getAddressRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Addresss.
 * Retrieve a list of Addresss
 */
function getAddressListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Address`,
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
        config.transform = (body, text) => requestTransform(body.map(AddressFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Addresss.
* Retrieve a list of Addresss
*/
export function getAddressList(requestParameters, requestConfig) {
    return getAddressListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Address.
 * Create a new Address
 */
function postAddressRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.address === null || requestParameters.address === undefined) {
        throw new runtime.RequiredError('address', 'Required parameter requestParameters.address was null or undefined when calling postAddress.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Address`,
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
        body: queryParameters || AddressToJSON(requestParameters.address),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AddressFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Address.
* Create a new Address
*/
export function postAddress(requestParameters, requestConfig) {
    return postAddressRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Address.
 * Update an existing Address
 */
function updateAddressRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateAddress.');
    }
    if (requestParameters.address === null || requestParameters.address === undefined) {
        throw new runtime.RequiredError('address', 'Required parameter requestParameters.address was null or undefined when calling updateAddress.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Address/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || AddressToJSON(requestParameters.address),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AddressFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Address.
* Update an existing Address
*/
export function updateAddress(requestParameters, requestConfig) {
    return updateAddressRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=AddressApi.js.map