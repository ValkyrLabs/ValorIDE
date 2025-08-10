// defines the Redux Actions for OasOperation

// OasOperation

export const FETCH_OASOPERATION_REQUEST = "FETCH_OASOPERATION_REQUEST";
export const FETCH_OASOPERATION_SUCCESS = "FETCH_OASOPERATION_SUCCESS";
export const FETCH_OASOPERATION_FAILURE = "FETCH_OASOPERATION_FAILURE";

export const ADD_OASOPERATION_REQUEST = "ADD_OASOPERATION_REQUEST";
export const ADD_OASOPERATION_SUCCESS = "ADD_OASOPERATION_SUCCESS";
export const ADD_OASOPERATION_FAILURE = "ADD_OASOPERATION_FAILURE";

export const UPDATE_OASOPERATION_REQUEST = "UPDATE_OASOPERATION_REQUEST";
export const UPDATE_OASOPERATION_SUCCESS = "UPDATE_OASOPERATION_SUCCESS";
export const UPDATE_OASOPERATION_FAILURE = "UPDATE_OASOPERATION_FAILURE";

export const DELETE_OASOPERATION_REQUEST = "DELETE_OASOPERATION_REQUEST";
export const DELETE_OASOPERATION_SUCCESS = "DELETE_OASOPERATION_SUCCESS";
export const DELETE_OASOPERATION_FAILURE = "DELETE_OASOPERATION_FAILURE";

export const LIST_OASOPERATION_REQUEST = "LIST_OASOPERATION_REQUEST";
export const LIST_OASOPERATION_SUCCESS = "LIST_OASOPERATION_SUCCESS";
export const LIST_OASOPERATION_FAILURE = "LIST_OASOPERATION_FAILURE";

export const addOasOperationRequest = () => ({
  type: ADD_OASOPERATION_REQUEST,
});

export const addOasOperationSuccess = (OasOperations: any) => ({
  type: ADD_OASOPERATION_SUCCESS,
  payload: OasOperations,
});

export const addOasOperationFailure = (error: Error) => ({
  type: ADD_OASOPERATION_FAILURE,
  payload: error,
});

export const fetchOasOperationRequest = () => ({
  type: FETCH_OASOPERATION_REQUEST,
});

export const fetchOasOperationSuccess = (OasOperations: any) => ({
  type: FETCH_OASOPERATION_SUCCESS,
  payload: OasOperations,
});

export const fetchOasOperationFailure = (error: Error) => ({
  type: FETCH_OASOPERATION_FAILURE,
  payload: error,
});

export const listOasOperationRequest = () => ({
  type: LIST_OASOPERATION_REQUEST,
});

export const listOasOperationSuccess = (OasOperations: any) => ({
  type: LIST_OASOPERATION_SUCCESS,
  payload: OasOperations,
});

export const listOasOperationFailure = (error: Error) => ({
  type: LIST_OASOPERATION_FAILURE,
  payload: error,
});

export const updateOasOperationRequest = (OasOperation: any) => ({
  type: UPDATE_OASOPERATION_REQUEST,
  payload: OasOperation,
});

export const updateOasOperationSuccess = (OasOperation: any) => ({
  type: UPDATE_OASOPERATION_SUCCESS,
  payload: OasOperation,
});

export const updateOasOperationFailure = (error: Error) => ({
  type: UPDATE_OASOPERATION_FAILURE,
  payload: error,
});

export const deleteOasOperationRequest = (OasOperation: any) => ({
  type: DELETE_OASOPERATION_REQUEST,
  payload: OasOperation,
});

export const deleteOasOperationSuccess = (OasOperation: any) => ({
  type: DELETE_OASOPERATION_SUCCESS,
  payload: OasOperation,
});

export const deleteOasOperationFailure = (error: Error) => ({
  type: DELETE_OASOPERATION_FAILURE,
  payload: error,
});
