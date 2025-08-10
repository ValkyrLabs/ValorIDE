// defines the Redux Actions for LlmDetails

// LlmDetails

export const FETCH_LLMDETAILS_REQUEST = "FETCH_LLMDETAILS_REQUEST";
export const FETCH_LLMDETAILS_SUCCESS = "FETCH_LLMDETAILS_SUCCESS";
export const FETCH_LLMDETAILS_FAILURE = "FETCH_LLMDETAILS_FAILURE";

export const ADD_LLMDETAILS_REQUEST = "ADD_LLMDETAILS_REQUEST";
export const ADD_LLMDETAILS_SUCCESS = "ADD_LLMDETAILS_SUCCESS";
export const ADD_LLMDETAILS_FAILURE = "ADD_LLMDETAILS_FAILURE";

export const UPDATE_LLMDETAILS_REQUEST = "UPDATE_LLMDETAILS_REQUEST";
export const UPDATE_LLMDETAILS_SUCCESS = "UPDATE_LLMDETAILS_SUCCESS";
export const UPDATE_LLMDETAILS_FAILURE = "UPDATE_LLMDETAILS_FAILURE";

export const DELETE_LLMDETAILS_REQUEST = "DELETE_LLMDETAILS_REQUEST";
export const DELETE_LLMDETAILS_SUCCESS = "DELETE_LLMDETAILS_SUCCESS";
export const DELETE_LLMDETAILS_FAILURE = "DELETE_LLMDETAILS_FAILURE";

export const LIST_LLMDETAILS_REQUEST = "LIST_LLMDETAILS_REQUEST";
export const LIST_LLMDETAILS_SUCCESS = "LIST_LLMDETAILS_SUCCESS";
export const LIST_LLMDETAILS_FAILURE = "LIST_LLMDETAILS_FAILURE";

export const addLlmDetailsRequest = () => ({
  type: ADD_LLMDETAILS_REQUEST,
});

export const addLlmDetailsSuccess = (LlmDetailss: any) => ({
  type: ADD_LLMDETAILS_SUCCESS,
  payload: LlmDetailss,
});

export const addLlmDetailsFailure = (error: Error) => ({
  type: ADD_LLMDETAILS_FAILURE,
  payload: error,
});

export const fetchLlmDetailsRequest = () => ({
  type: FETCH_LLMDETAILS_REQUEST,
});

export const fetchLlmDetailsSuccess = (LlmDetailss: any) => ({
  type: FETCH_LLMDETAILS_SUCCESS,
  payload: LlmDetailss,
});

export const fetchLlmDetailsFailure = (error: Error) => ({
  type: FETCH_LLMDETAILS_FAILURE,
  payload: error,
});

export const listLlmDetailsRequest = () => ({
  type: LIST_LLMDETAILS_REQUEST,
});

export const listLlmDetailsSuccess = (LlmDetailss: any) => ({
  type: LIST_LLMDETAILS_SUCCESS,
  payload: LlmDetailss,
});

export const listLlmDetailsFailure = (error: Error) => ({
  type: LIST_LLMDETAILS_FAILURE,
  payload: error,
});

export const updateLlmDetailsRequest = (LlmDetails: any) => ({
  type: UPDATE_LLMDETAILS_REQUEST,
  payload: LlmDetails,
});

export const updateLlmDetailsSuccess = (LlmDetails: any) => ({
  type: UPDATE_LLMDETAILS_SUCCESS,
  payload: LlmDetails,
});

export const updateLlmDetailsFailure = (error: Error) => ({
  type: UPDATE_LLMDETAILS_FAILURE,
  payload: error,
});

export const deleteLlmDetailsRequest = (LlmDetails: any) => ({
  type: DELETE_LLMDETAILS_REQUEST,
  payload: LlmDetails,
});

export const deleteLlmDetailsSuccess = (LlmDetails: any) => ({
  type: DELETE_LLMDETAILS_SUCCESS,
  payload: LlmDetails,
});

export const deleteLlmDetailsFailure = (error: Error) => ({
  type: DELETE_LLMDETAILS_FAILURE,
  payload: error,
});
