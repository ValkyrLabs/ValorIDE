// tslint:disable
import * as runtime from '../src/runtime';
import { NoteFromJSON, NoteToJSON, } from '../model';
/**
 * Deletes a specific Note.
 * Delete a Note.
 */
function deleteNoteRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteNote.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Note/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Note.
* Delete a Note.
*/
export function deleteNote(requestParameters, requestConfig) {
    return deleteNoteRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Note for a specific uid.
 * Retrieve a single Note
 */
function getNoteRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getNote.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Note/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(NoteFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Note for a specific uid.
* Retrieve a single Note
*/
export function getNote(requestParameters, requestConfig) {
    return getNoteRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Notes.
 * Retrieve a list of Notes
 */
function getNoteListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Note`,
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
        config.transform = (body, text) => requestTransform(body.map(NoteFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Notes.
* Retrieve a list of Notes
*/
export function getNoteList(requestParameters, requestConfig) {
    return getNoteListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Note.
 * Create a new Note
 */
function postNoteRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.note === null || requestParameters.note === undefined) {
        throw new runtime.RequiredError('note', 'Required parameter requestParameters.note was null or undefined when calling postNote.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Note`,
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
        body: queryParameters || NoteToJSON(requestParameters.note),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(NoteFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Note.
* Create a new Note
*/
export function postNote(requestParameters, requestConfig) {
    return postNoteRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Note.
 * Update an existing Note
 */
function updateNoteRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateNote.');
    }
    if (requestParameters.note === null || requestParameters.note === undefined) {
        throw new runtime.RequiredError('note', 'Required parameter requestParameters.note was null or undefined when calling updateNote.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Note/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || NoteToJSON(requestParameters.note),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(NoteFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Note.
* Update an existing Note
*/
export function updateNote(requestParameters, requestConfig) {
    return updateNoteRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=NoteApi.js.map