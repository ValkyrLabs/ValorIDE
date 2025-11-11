// tslint:disable
import * as runtime from '../src/runtime';
import { RatingFromJSON, RatingToJSON, } from '../model';
/**
 * Deletes a specific Rating.
 * Delete a Rating.
 */
function deleteRatingRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteRating.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Rating/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Rating.
* Delete a Rating.
*/
export function deleteRating(requestParameters, requestConfig) {
    return deleteRatingRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Rating for a specific uid.
 * Retrieve a single Rating
 */
function getRatingRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getRating.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Rating/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(RatingFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Rating for a specific uid.
* Retrieve a single Rating
*/
export function getRating(requestParameters, requestConfig) {
    return getRatingRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Ratings.
 * Retrieve a list of Ratings
 */
function getRatingListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Rating`,
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
        config.transform = (body, text) => requestTransform(body.map(RatingFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Ratings.
* Retrieve a list of Ratings
*/
export function getRatingList(requestParameters, requestConfig) {
    return getRatingListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Rating.
 * Create a new Rating
 */
function postRatingRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.rating === null || requestParameters.rating === undefined) {
        throw new runtime.RequiredError('rating', 'Required parameter requestParameters.rating was null or undefined when calling postRating.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Rating`,
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
        body: queryParameters || RatingToJSON(requestParameters.rating),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(RatingFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Rating.
* Create a new Rating
*/
export function postRating(requestParameters, requestConfig) {
    return postRatingRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Rating.
 * Update an existing Rating
 */
function updateRatingRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateRating.');
    }
    if (requestParameters.rating === null || requestParameters.rating === undefined) {
        throw new runtime.RequiredError('rating', 'Required parameter requestParameters.rating was null or undefined when calling updateRating.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Rating/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || RatingToJSON(requestParameters.rating),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(RatingFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Rating.
* Update an existing Rating
*/
export function updateRating(requestParameters, requestConfig) {
    return updateRatingRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=RatingApi.js.map