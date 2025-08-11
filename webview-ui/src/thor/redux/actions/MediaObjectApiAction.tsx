// defines the Redux Actions for MediaObject

// MediaObject

export const FETCH_MEDIAOBJECT_REQUEST = "FETCH_MEDIAOBJECT_REQUEST";
export const FETCH_MEDIAOBJECT_SUCCESS = "FETCH_MEDIAOBJECT_SUCCESS";
export const FETCH_MEDIAOBJECT_FAILURE = "FETCH_MEDIAOBJECT_FAILURE";

export const ADD_MEDIAOBJECT_REQUEST = "ADD_MEDIAOBJECT_REQUEST";
export const ADD_MEDIAOBJECT_SUCCESS = "ADD_MEDIAOBJECT_SUCCESS";
export const ADD_MEDIAOBJECT_FAILURE = "ADD_MEDIAOBJECT_FAILURE";

export const UPDATE_MEDIAOBJECT_REQUEST = "UPDATE_MEDIAOBJECT_REQUEST";
export const UPDATE_MEDIAOBJECT_SUCCESS = "UPDATE_MEDIAOBJECT_SUCCESS";
export const UPDATE_MEDIAOBJECT_FAILURE = "UPDATE_MEDIAOBJECT_FAILURE";

export const DELETE_MEDIAOBJECT_REQUEST = "DELETE_MEDIAOBJECT_REQUEST";
export const DELETE_MEDIAOBJECT_SUCCESS = "DELETE_MEDIAOBJECT_SUCCESS";
export const DELETE_MEDIAOBJECT_FAILURE = "DELETE_MEDIAOBJECT_FAILURE";

export const LIST_MEDIAOBJECT_REQUEST = "LIST_MEDIAOBJECT_REQUEST";
export const LIST_MEDIAOBJECT_SUCCESS = "LIST_MEDIAOBJECT_SUCCESS";
export const LIST_MEDIAOBJECT_FAILURE = "LIST_MEDIAOBJECT_FAILURE";

export const addMediaObjectRequest = () => ({
  type: ADD_MEDIAOBJECT_REQUEST,
});

export const addMediaObjectSuccess = (MediaObjects: any) => ({
  type: ADD_MEDIAOBJECT_SUCCESS,
  payload: MediaObjects,
});

export const addMediaObjectFailure = (error: Error) => ({
  type: ADD_MEDIAOBJECT_FAILURE,
  payload: error,
});

export const fetchMediaObjectRequest = () => ({
  type: FETCH_MEDIAOBJECT_REQUEST,
});

export const fetchMediaObjectSuccess = (MediaObjects: any) => ({
  type: FETCH_MEDIAOBJECT_SUCCESS,
  payload: MediaObjects,
});

export const fetchMediaObjectFailure = (error: Error) => ({
  type: FETCH_MEDIAOBJECT_FAILURE,
  payload: error,
});

export const listMediaObjectRequest = () => ({
  type: LIST_MEDIAOBJECT_REQUEST,
});

export const listMediaObjectSuccess = (MediaObjects: any) => ({
  type: LIST_MEDIAOBJECT_SUCCESS,
  payload: MediaObjects,
});

export const listMediaObjectFailure = (error: Error) => ({
  type: LIST_MEDIAOBJECT_FAILURE,
  payload: error,
});

export const updateMediaObjectRequest = (MediaObject: any) => ({
  type: UPDATE_MEDIAOBJECT_REQUEST,
  payload: MediaObject,
});

export const updateMediaObjectSuccess = (MediaObject: any) => ({
  type: UPDATE_MEDIAOBJECT_SUCCESS,
  payload: MediaObject,
});

export const updateMediaObjectFailure = (error: Error) => ({
  type: UPDATE_MEDIAOBJECT_FAILURE,
  payload: error,
});

export const deleteMediaObjectRequest = (MediaObject: any) => ({
  type: DELETE_MEDIAOBJECT_REQUEST,
  payload: MediaObject,
});

export const deleteMediaObjectSuccess = (MediaObject: any) => ({
  type: DELETE_MEDIAOBJECT_SUCCESS,
  payload: MediaObject,
});

export const deleteMediaObjectFailure = (error: Error) => ({
  type: DELETE_MEDIAOBJECT_FAILURE,
  payload: error,
});
