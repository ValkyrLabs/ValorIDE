// defines the Redux Actions for OasObjectSchema

// OasObjectSchema

export const FETCH_OASOBJECTSCHEMA_REQUEST = "FETCH_OASOBJECTSCHEMA_REQUEST";
export const FETCH_OASOBJECTSCHEMA_SUCCESS = "FETCH_OASOBJECTSCHEMA_SUCCESS";
export const FETCH_OASOBJECTSCHEMA_FAILURE = "FETCH_OASOBJECTSCHEMA_FAILURE";

export const ADD_OASOBJECTSCHEMA_REQUEST = "ADD_OASOBJECTSCHEMA_REQUEST";
export const ADD_OASOBJECTSCHEMA_SUCCESS = "ADD_OASOBJECTSCHEMA_SUCCESS";
export const ADD_OASOBJECTSCHEMA_FAILURE = "ADD_OASOBJECTSCHEMA_FAILURE";

export const UPDATE_OASOBJECTSCHEMA_REQUEST = "UPDATE_OASOBJECTSCHEMA_REQUEST";
export const UPDATE_OASOBJECTSCHEMA_SUCCESS = "UPDATE_OASOBJECTSCHEMA_SUCCESS";
export const UPDATE_OASOBJECTSCHEMA_FAILURE = "UPDATE_OASOBJECTSCHEMA_FAILURE";

export const DELETE_OASOBJECTSCHEMA_REQUEST = "DELETE_OASOBJECTSCHEMA_REQUEST";
export const DELETE_OASOBJECTSCHEMA_SUCCESS = "DELETE_OASOBJECTSCHEMA_SUCCESS";
export const DELETE_OASOBJECTSCHEMA_FAILURE = "DELETE_OASOBJECTSCHEMA_FAILURE";

export const LIST_OASOBJECTSCHEMA_REQUEST = "LIST_OASOBJECTSCHEMA_REQUEST";
export const LIST_OASOBJECTSCHEMA_SUCCESS = "LIST_OASOBJECTSCHEMA_SUCCESS";
export const LIST_OASOBJECTSCHEMA_FAILURE = "LIST_OASOBJECTSCHEMA_FAILURE";

export const addOasObjectSchemaRequest = () => ({
  type: ADD_OASOBJECTSCHEMA_REQUEST,
});

export const addOasObjectSchemaSuccess = (OasObjectSchemas: any) => ({
  type: ADD_OASOBJECTSCHEMA_SUCCESS,
  payload: OasObjectSchemas,
});

export const addOasObjectSchemaFailure = (error: Error) => ({
  type: ADD_OASOBJECTSCHEMA_FAILURE,
  payload: error,
});

export const fetchOasObjectSchemaRequest = () => ({
  type: FETCH_OASOBJECTSCHEMA_REQUEST,
});

export const fetchOasObjectSchemaSuccess = (OasObjectSchemas: any) => ({
  type: FETCH_OASOBJECTSCHEMA_SUCCESS,
  payload: OasObjectSchemas,
});

export const fetchOasObjectSchemaFailure = (error: Error) => ({
  type: FETCH_OASOBJECTSCHEMA_FAILURE,
  payload: error,
});

export const listOasObjectSchemaRequest = () => ({
  type: LIST_OASOBJECTSCHEMA_REQUEST,
});

export const listOasObjectSchemaSuccess = (OasObjectSchemas: any) => ({
  type: LIST_OASOBJECTSCHEMA_SUCCESS,
  payload: OasObjectSchemas,
});

export const listOasObjectSchemaFailure = (error: Error) => ({
  type: LIST_OASOBJECTSCHEMA_FAILURE,
  payload: error,
});

export const updateOasObjectSchemaRequest = (OasObjectSchema: any) => ({
  type: UPDATE_OASOBJECTSCHEMA_REQUEST,
  payload: OasObjectSchema,
});

export const updateOasObjectSchemaSuccess = (OasObjectSchema: any) => ({
  type: UPDATE_OASOBJECTSCHEMA_SUCCESS,
  payload: OasObjectSchema,
});

export const updateOasObjectSchemaFailure = (error: Error) => ({
  type: UPDATE_OASOBJECTSCHEMA_FAILURE,
  payload: error,
});

export const deleteOasObjectSchemaRequest = (OasObjectSchema: any) => ({
  type: DELETE_OASOBJECTSCHEMA_REQUEST,
  payload: OasObjectSchema,
});

export const deleteOasObjectSchemaSuccess = (OasObjectSchema: any) => ({
  type: DELETE_OASOBJECTSCHEMA_SUCCESS,
  payload: OasObjectSchema,
});

export const deleteOasObjectSchemaFailure = (error: Error) => ({
  type: DELETE_OASOBJECTSCHEMA_FAILURE,
  payload: error,
});
