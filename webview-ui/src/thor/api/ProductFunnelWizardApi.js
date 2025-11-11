// tslint:disable
import * as runtime from '../src/runtime';
import { ProductFunnelWizardToJSON, PublishFunnel200ResponseFromJSON, WizardStartResponseFromJSON, WizardStatusResponseFromJSON, } from '../model';
/**
 * Returns the current status, progress, and generated asset references.
 * Get wizard status and progress
 */
function getWizardStatusRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.wizardId === null || requestParameters.wizardId === undefined) {
        throw new runtime.RequiredError('wizardId', 'Required parameter requestParameters.wizardId was null or undefined when calling getWizardStatus.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/productFunnelWizard/{wizardId}/status`.replace(`{${"wizardId"}}`, encodeURIComponent(String(requestParameters.wizardId))),
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
        config.transform = (body, text) => requestTransform(WizardStatusResponseFromJSON(body), text);
    }
    return config;
}
/**
* Returns the current status, progress, and generated asset references.
* Get wizard status and progress
*/
export function getWizardStatus(requestParameters, requestConfig) {
    return getWizardStatusRaw(requestParameters, requestConfig);
}
/**
 * Returns an HTML preview of the generated landing page for review.
 * Preview generated landing page HTML
 */
function previewFunnelRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.wizardId === null || requestParameters.wizardId === undefined) {
        throw new runtime.RequiredError('wizardId', 'Required parameter requestParameters.wizardId was null or undefined when calling previewFunnel.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/productFunnelWizard/{wizardId}/preview`.replace(`{${"wizardId"}}`, encodeURIComponent(String(requestParameters.wizardId))),
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
        throw "OH NO";
    }
    return config;
}
/**
* Returns an HTML preview of the generated landing page for review.
* Preview generated landing page HTML
*/
export function previewFunnel(requestParameters, requestConfig) {
    return previewFunnelRaw(requestParameters, requestConfig);
}
/**
 * Marks the generated landing page as published and returns the public URL.
 * Publish generated funnel
 */
function publishFunnelRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.wizardId === null || requestParameters.wizardId === undefined) {
        throw new runtime.RequiredError('wizardId', 'Required parameter requestParameters.wizardId was null or undefined when calling publishFunnel.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/productFunnelWizard/{wizardId}/publish`.replace(`{${"wizardId"}}`, encodeURIComponent(String(requestParameters.wizardId))),
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
        config.transform = (body, text) => requestTransform(PublishFunnel200ResponseFromJSON(body), text);
    }
    return config;
}
/**
* Marks the generated landing page as published and returns the public URL.
* Publish generated funnel
*/
export function publishFunnel(requestParameters, requestConfig) {
    return publishFunnelRaw(requestParameters, requestConfig);
}
/**
 * Begins asynchronous funnel generation using the FunnelGenerator workflow.
 * Start funnel generation wizard for a product
 */
function startFunnelWizardRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.productFunnelWizard === null || requestParameters.productFunnelWizard === undefined) {
        throw new runtime.RequiredError('productFunnelWizard', 'Required parameter requestParameters.productFunnelWizard was null or undefined when calling startFunnelWizard.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/productFunnelWizard/start`,
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
        body: queryParameters || ProductFunnelWizardToJSON(requestParameters.productFunnelWizard),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(WizardStartResponseFromJSON(body), text);
    }
    return config;
}
/**
* Begins asynchronous funnel generation using the FunnelGenerator workflow.
* Start funnel generation wizard for a product
*/
export function startFunnelWizard(requestParameters, requestConfig) {
    return startFunnelWizardRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ProductFunnelWizardApi.js.map