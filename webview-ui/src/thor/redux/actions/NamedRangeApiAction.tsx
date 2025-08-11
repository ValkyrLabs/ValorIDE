// defines the Redux Actions for NamedRange

// NamedRange

export const FETCH_NAMEDRANGE_REQUEST = "FETCH_NAMEDRANGE_REQUEST";
export const FETCH_NAMEDRANGE_SUCCESS = "FETCH_NAMEDRANGE_SUCCESS";
export const FETCH_NAMEDRANGE_FAILURE = "FETCH_NAMEDRANGE_FAILURE";

export const ADD_NAMEDRANGE_REQUEST = "ADD_NAMEDRANGE_REQUEST";
export const ADD_NAMEDRANGE_SUCCESS = "ADD_NAMEDRANGE_SUCCESS";
export const ADD_NAMEDRANGE_FAILURE = "ADD_NAMEDRANGE_FAILURE";

export const UPDATE_NAMEDRANGE_REQUEST = "UPDATE_NAMEDRANGE_REQUEST";
export const UPDATE_NAMEDRANGE_SUCCESS = "UPDATE_NAMEDRANGE_SUCCESS";
export const UPDATE_NAMEDRANGE_FAILURE = "UPDATE_NAMEDRANGE_FAILURE";

export const DELETE_NAMEDRANGE_REQUEST = "DELETE_NAMEDRANGE_REQUEST";
export const DELETE_NAMEDRANGE_SUCCESS = "DELETE_NAMEDRANGE_SUCCESS";
export const DELETE_NAMEDRANGE_FAILURE = "DELETE_NAMEDRANGE_FAILURE";

export const LIST_NAMEDRANGE_REQUEST = "LIST_NAMEDRANGE_REQUEST";
export const LIST_NAMEDRANGE_SUCCESS = "LIST_NAMEDRANGE_SUCCESS";
export const LIST_NAMEDRANGE_FAILURE = "LIST_NAMEDRANGE_FAILURE";

export const addNamedRangeRequest = () => ({
  type: ADD_NAMEDRANGE_REQUEST,
});

export const addNamedRangeSuccess = (NamedRanges: any) => ({
  type: ADD_NAMEDRANGE_SUCCESS,
  payload: NamedRanges,
});

export const addNamedRangeFailure = (error: Error) => ({
  type: ADD_NAMEDRANGE_FAILURE,
  payload: error,
});

export const fetchNamedRangeRequest = () => ({
  type: FETCH_NAMEDRANGE_REQUEST,
});

export const fetchNamedRangeSuccess = (NamedRanges: any) => ({
  type: FETCH_NAMEDRANGE_SUCCESS,
  payload: NamedRanges,
});

export const fetchNamedRangeFailure = (error: Error) => ({
  type: FETCH_NAMEDRANGE_FAILURE,
  payload: error,
});

export const listNamedRangeRequest = () => ({
  type: LIST_NAMEDRANGE_REQUEST,
});

export const listNamedRangeSuccess = (NamedRanges: any) => ({
  type: LIST_NAMEDRANGE_SUCCESS,
  payload: NamedRanges,
});

export const listNamedRangeFailure = (error: Error) => ({
  type: LIST_NAMEDRANGE_FAILURE,
  payload: error,
});

export const updateNamedRangeRequest = (NamedRange: any) => ({
  type: UPDATE_NAMEDRANGE_REQUEST,
  payload: NamedRange,
});

export const updateNamedRangeSuccess = (NamedRange: any) => ({
  type: UPDATE_NAMEDRANGE_SUCCESS,
  payload: NamedRange,
});

export const updateNamedRangeFailure = (error: Error) => ({
  type: UPDATE_NAMEDRANGE_FAILURE,
  payload: error,
});

export const deleteNamedRangeRequest = (NamedRange: any) => ({
  type: DELETE_NAMEDRANGE_REQUEST,
  payload: NamedRange,
});

export const deleteNamedRangeSuccess = (NamedRange: any) => ({
  type: DELETE_NAMEDRANGE_SUCCESS,
  payload: NamedRange,
});

export const deleteNamedRangeFailure = (error: Error) => ({
  type: DELETE_NAMEDRANGE_FAILURE,
  payload: error,
});
