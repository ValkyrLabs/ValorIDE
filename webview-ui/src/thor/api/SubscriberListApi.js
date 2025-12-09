// tslint:disable
import * as runtime from "../src/runtime";
import { SubscriberListFromJSON, SubscriberListToJSON } from "../model";
/**
 * Deletes a specific SubscriberList.
 * Delete a SubscriberList.
 */
function deleteSubscriberListRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.id === null || requestParameters.id === undefined) {
    throw new runtime.RequiredError(
      "id",
      "Required parameter requestParameters.id was null or undefined when calling deleteSubscriberList.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/SubscriberList/{id}`.replace(
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
 * Deletes a specific SubscriberList.
 * Delete a SubscriberList.
 */
export function deleteSubscriberList(requestParameters, requestConfig) {
  return deleteSubscriberListRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SubscriberList for a specific uid.
 * Retrieve a single SubscriberList
 */
function getSubscriberListRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.id === null || requestParameters.id === undefined) {
    throw new runtime.RequiredError(
      "id",
      "Required parameter requestParameters.id was null or undefined when calling getSubscriberList.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/SubscriberList/{id}`.replace(
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
      requestTransform(SubscriberListFromJSON(body), text);
  }
  return config;
}
/**
 * Retrieves a single SubscriberList for a specific uid.
 * Retrieve a single SubscriberList
 */
export function getSubscriberList(requestParameters, requestConfig) {
  return getSubscriberListRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SubscriberLists.
 * Retrieve a list of SubscriberLists
 */
function getSubscriberListListRaw(requestParameters, requestConfig = {}) {
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
    url: `${runtime.Configuration.basePath}/SubscriberList`,
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
      requestTransform(body.map(SubscriberListFromJSON), text);
  }
  return config;
}
/**
 * Retrieves a list of SubscriberLists.
 * Retrieve a list of SubscriberLists
 */
export function getSubscriberListList(requestParameters, requestConfig) {
  return getSubscriberListListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SubscriberList.
 * Create a new SubscriberList
 */
function postSubscriberListRaw(requestParameters, requestConfig = {}) {
  if (
    requestParameters.subscriberList === null ||
    requestParameters.subscriberList === undefined
  ) {
    throw new runtime.RequiredError(
      "subscriberList",
      "Required parameter requestParameters.subscriberList was null or undefined when calling postSubscriberList.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/SubscriberList`,
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
      queryParameters || SubscriberListToJSON(requestParameters.subscriberList),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(SubscriberListFromJSON(body), text);
  }
  return config;
}
/**
 * Creates a new SubscriberList.
 * Create a new SubscriberList
 */
export function postSubscriberList(requestParameters, requestConfig) {
  return postSubscriberListRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SubscriberList.
 * Update an existing SubscriberList
 */
function updateSubscriberListRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.id === null || requestParameters.id === undefined) {
    throw new runtime.RequiredError(
      "id",
      "Required parameter requestParameters.id was null or undefined when calling updateSubscriberList.",
    );
  }
  if (
    requestParameters.subscriberList === null ||
    requestParameters.subscriberList === undefined
  ) {
    throw new runtime.RequiredError(
      "subscriberList",
      "Required parameter requestParameters.subscriberList was null or undefined when calling updateSubscriberList.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/SubscriberList/{id}`.replace(
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
      queryParameters || SubscriberListToJSON(requestParameters.subscriberList),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(SubscriberListFromJSON(body), text);
  }
  return config;
}
/**
 * Updates an existing SubscriberList.
 * Update an existing SubscriberList
 */
export function updateSubscriberList(requestParameters, requestConfig) {
  return updateSubscriberListRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SubscriberListApi.js.map
