// defines the Redux Actions for OasPath

// OasPath

export const FETCH_OASPATH_REQUEST = 'FETCH_OASPATH_REQUEST';
export const FETCH_OASPATH_SUCCESS = 'FETCH_OASPATH_SUCCESS';
export const FETCH_OASPATH_FAILURE = 'FETCH_OASPATH_FAILURE';

export const ADD_OASPATH_REQUEST = 'ADD_OASPATH_REQUEST';
export const ADD_OASPATH_SUCCESS = 'ADD_OASPATH_SUCCESS';
export const ADD_OASPATH_FAILURE = 'ADD_OASPATH_FAILURE';

export const UPDATE_OASPATH_REQUEST = 'UPDATE_OASPATH_REQUEST';
export const UPDATE_OASPATH_SUCCESS = 'UPDATE_OASPATH_SUCCESS';
export const UPDATE_OASPATH_FAILURE = 'UPDATE_OASPATH_FAILURE';

export const DELETE_OASPATH_REQUEST = 'DELETE_OASPATH_REQUEST';
export const DELETE_OASPATH_SUCCESS = 'DELETE_OASPATH_SUCCESS';
export const DELETE_OASPATH_FAILURE = 'DELETE_OASPATH_FAILURE';

export const LIST_OASPATH_REQUEST = 'LIST_OASPATH_REQUEST';
export const LIST_OASPATH_SUCCESS = 'LIST_OASPATH_SUCCESS';
export const LIST_OASPATH_FAILURE = 'LIST_OASPATH_FAILURE';

export const addOasPathRequest = () => ({
    type: ADD_OASPATH_REQUEST,
});

export const addOasPathSuccess = (OasPaths: any) => ({
    type: ADD_OASPATH_SUCCESS,
    payload: OasPaths,
});

export const addOasPathFailure = (error: Error) => ({
    type: ADD_OASPATH_FAILURE,
    payload: error,
});


export const fetchOasPathRequest = () => ({
    type: FETCH_OASPATH_REQUEST,
});

export const fetchOasPathSuccess = (OasPaths: any) => ({
    type: FETCH_OASPATH_SUCCESS,
    payload: OasPaths,
});

export const fetchOasPathFailure = (error: Error) => ({
    type: FETCH_OASPATH_FAILURE,
    payload: error,
});

export const listOasPathRequest = () => ({
    type: LIST_OASPATH_REQUEST,
});

export const listOasPathSuccess = (OasPaths: any) => ({
    type: LIST_OASPATH_SUCCESS,
    payload: OasPaths,
});

export const listOasPathFailure = (error: Error) => ({
    type: LIST_OASPATH_FAILURE,
    payload: error,
});

export const updateOasPathRequest = (OasPath: any) => ({
    type: UPDATE_OASPATH_REQUEST,
    payload: OasPath,
});

export const updateOasPathSuccess = (OasPath: any) => ({
    type: UPDATE_OASPATH_SUCCESS,
    payload: OasPath,
});

export const updateOasPathFailure = (error: Error) => ({
    type: UPDATE_OASPATH_FAILURE,
    payload: error,
});

export const deleteOasPathRequest = (OasPath: any) => ({
    type: DELETE_OASPATH_REQUEST,
    payload: OasPath,
});

export const deleteOasPathSuccess = (OasPath: any) => ({
    type: DELETE_OASPATH_SUCCESS,
    payload: OasPath,
});

export const deleteOasPathFailure = (error: Error) => ({
    type: DELETE_OASPATH_FAILURE,
    payload: error,
});
