// tslint:disable
import * as runtime from "../src/runtime";
import { IdempotencyKeyFromJSON, IdempotencyKeyToJSON } from "../model";
/**
 * Deletes a specific IdempotencyKey.
 * Delete a IdempotencyKey.
 */
function deleteIdempotencyKeyRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.id === null || requestParameters.id === undefined) {
    throw new runtime.RequiredError(
      "id",
      "Required parameter requestParameters.id was null or undefined when calling deleteIdempotencyKey.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/IdempotencyKey/{id}`.replace(
      `{${"id"}}`,
      encodeURIComponent(String(requestParameters.id)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "DELETE",
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
 * Deletes a specific IdempotencyKey.
 * Delete a IdempotencyKey.
 */
export function deleteIdempotencyKey(requestParameters, requestConfig) {
  return deleteIdempotencyKeyRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single IdempotencyKey for a specific uid.
 * Retrieve a single IdempotencyKey
 */
function getIdempotencyKeyRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.id === null || requestParameters.id === undefined) {
    throw new runtime.RequiredError(
      "id",
      "Required parameter requestParameters.id was null or undefined when calling getIdempotencyKey.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/IdempotencyKey/{id}`.replace(
      `{${"id"}}`,
      encodeURIComponent(String(requestParameters.id)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "GET",
      headers: headerParameters,
    },
    body: queryParameters,
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(IdempotencyKeyFromJSON(body), text);
  }
  return config;
}
/**
 * Retrieves a single IdempotencyKey for a specific uid.
 * Retrieve a single IdempotencyKey
 */
export function getIdempotencyKey(requestParameters, requestConfig) {
  return getIdempotencyKeyRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of IdempotencyKeys.
 * Retrieve a list of IdempotencyKeys
 */
function getIdempotencyKeyListRaw(requestParameters, requestConfig = {}) {
  let queryParameters = null;
  queryParameters = {};
  if (requestParameters.page !== undefined) {
    queryParameters["page"] = requestParameters.page;
  }
  if (requestParameters.size !== undefined) {
    queryParameters["size"] = requestParameters.size;
  }
  if (requestParameters.sort) {
    queryParameters["sort"] = requestParameters.sort;
  }
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/IdempotencyKey`,
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "GET",
      headers: headerParameters,
    },
    body: queryParameters,
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(body.map(IdempotencyKeyFromJSON), text);
  }
  return config;
}
/**
 * Retrieves a list of IdempotencyKeys.
 * Retrieve a list of IdempotencyKeys
 */
export function getIdempotencyKeyList(requestParameters, requestConfig) {
  return getIdempotencyKeyListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new IdempotencyKey.
 * Create a new IdempotencyKey
 */
function postIdempotencyKeyRaw(requestParameters, requestConfig = {}) {
  if (
    requestParameters.idempotencyKey === null ||
    requestParameters.idempotencyKey === undefined
  ) {
    throw new runtime.RequiredError(
      "idempotencyKey",
      "Required parameter requestParameters.idempotencyKey was null or undefined when calling postIdempotencyKey.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/IdempotencyKey`,
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "POST",
      headers: headerParameters,
    },
    body:
      queryParameters || IdempotencyKeyToJSON(requestParameters.idempotencyKey),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(IdempotencyKeyFromJSON(body), text);
  }
  return config;
}
/**
 * Creates a new IdempotencyKey.
 * Create a new IdempotencyKey
 */
export function postIdempotencyKey(requestParameters, requestConfig) {
  return postIdempotencyKeyRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing IdempotencyKey.
 * Update an existing IdempotencyKey
 */
function updateIdempotencyKeyRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.id === null || requestParameters.id === undefined) {
    throw new runtime.RequiredError(
      "id",
      "Required parameter requestParameters.id was null or undefined when calling updateIdempotencyKey.",
    );
  }
  if (
    requestParameters.idempotencyKey === null ||
    requestParameters.idempotencyKey === undefined
  ) {
    throw new runtime.RequiredError(
      "idempotencyKey",
      "Required parameter requestParameters.idempotencyKey was null or undefined when calling updateIdempotencyKey.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/IdempotencyKey/{id}`.replace(
      `{${"id"}}`,
      encodeURIComponent(String(requestParameters.id)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "PUT",
      headers: headerParameters,
    },
    body:
      queryParameters || IdempotencyKeyToJSON(requestParameters.idempotencyKey),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(IdempotencyKeyFromJSON(body), text);
  }
  return config;
}
/**
 * Updates an existing IdempotencyKey.
 * Update an existing IdempotencyKey
 */
export function updateIdempotencyKey(requestParameters, requestConfig) {
  return updateIdempotencyKeyRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=IdempotencyKeyApi.js.map
