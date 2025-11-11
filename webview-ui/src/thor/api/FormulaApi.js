// tslint:disable
import * as runtime from '../src/runtime';
import { FormulaFromJSON, FormulaToJSON, } from '../model';
/**
 * Deletes a specific Formula.
 * Delete a Formula.
 */
function deleteFormulaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteFormula.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Formula/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Formula.
* Delete a Formula.
*/
export function deleteFormula(requestParameters, requestConfig) {
    return deleteFormulaRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Formula for a specific uid.
 * Retrieve a single Formula
 */
function getFormulaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getFormula.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Formula/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(FormulaFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Formula for a specific uid.
* Retrieve a single Formula
*/
export function getFormula(requestParameters, requestConfig) {
    return getFormulaRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Formulas.
 * Retrieve a list of Formulas
 */
function getFormulaListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Formula`,
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
        config.transform = (body, text) => requestTransform(body.map(FormulaFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Formulas.
* Retrieve a list of Formulas
*/
export function getFormulaList(requestParameters, requestConfig) {
    return getFormulaListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Formula.
 * Create a new Formula
 */
function postFormulaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.formula === null || requestParameters.formula === undefined) {
        throw new runtime.RequiredError('formula', 'Required parameter requestParameters.formula was null or undefined when calling postFormula.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Formula`,
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
        body: queryParameters || FormulaToJSON(requestParameters.formula),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FormulaFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Formula.
* Create a new Formula
*/
export function postFormula(requestParameters, requestConfig) {
    return postFormulaRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Formula.
 * Update an existing Formula
 */
function updateFormulaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateFormula.');
    }
    if (requestParameters.formula === null || requestParameters.formula === undefined) {
        throw new runtime.RequiredError('formula', 'Required parameter requestParameters.formula was null or undefined when calling updateFormula.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Formula/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || FormulaToJSON(requestParameters.formula),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FormulaFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Formula.
* Update an existing Formula
*/
export function updateFormula(requestParameters, requestConfig) {
    return updateFormulaRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=FormulaApi.js.map