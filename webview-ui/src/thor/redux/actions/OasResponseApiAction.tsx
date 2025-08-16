// defines the Redux Actions for OasResponse

// OasResponse

export const FETCH_OASRESPONSE_REQUEST = 'FETCH_OASRESPONSE_REQUEST';
export const FETCH_OASRESPONSE_SUCCESS = 'FETCH_OASRESPONSE_SUCCESS';
export const FETCH_OASRESPONSE_FAILURE = 'FETCH_OASRESPONSE_FAILURE';

export const ADD_OASRESPONSE_REQUEST = 'ADD_OASRESPONSE_REQUEST';
export const ADD_OASRESPONSE_SUCCESS = 'ADD_OASRESPONSE_SUCCESS';
export const ADD_OASRESPONSE_FAILURE = 'ADD_OASRESPONSE_FAILURE';

export const UPDATE_OASRESPONSE_REQUEST = 'UPDATE_OASRESPONSE_REQUEST';
export const UPDATE_OASRESPONSE_SUCCESS = 'UPDATE_OASRESPONSE_SUCCESS';
export const UPDATE_OASRESPONSE_FAILURE = 'UPDATE_OASRESPONSE_FAILURE';

export const DELETE_OASRESPONSE_REQUEST = 'DELETE_OASRESPONSE_REQUEST';
export const DELETE_OASRESPONSE_SUCCESS = 'DELETE_OASRESPONSE_SUCCESS';
export const DELETE_OASRESPONSE_FAILURE = 'DELETE_OASRESPONSE_FAILURE';

export const LIST_OASRESPONSE_REQUEST = 'LIST_OASRESPONSE_REQUEST';
export const LIST_OASRESPONSE_SUCCESS = 'LIST_OASRESPONSE_SUCCESS';
export const LIST_OASRESPONSE_FAILURE = 'LIST_OASRESPONSE_FAILURE';

export const addOasResponseRequest = () => ({
    type: ADD_OASRESPONSE_REQUEST,
});

export const addOasResponseSuccess = (OasResponses: any) => ({
    type: ADD_OASRESPONSE_SUCCESS,
    payload: OasResponses,
});

export const addOasResponseFailure = (error: Error) => ({
    type: ADD_OASRESPONSE_FAILURE,
    payload: error,
});


export const fetchOasResponseRequest = () => ({
    type: FETCH_OASRESPONSE_REQUEST,
});

export const fetchOasResponseSuccess = (OasResponses: any) => ({
    type: FETCH_OASRESPONSE_SUCCESS,
    payload: OasResponses,
});

export const fetchOasResponseFailure = (error: Error) => ({
    type: FETCH_OASRESPONSE_FAILURE,
    payload: error,
});

export const listOasResponseRequest = () => ({
    type: LIST_OASRESPONSE_REQUEST,
});

export const listOasResponseSuccess = (OasResponses: any) => ({
    type: LIST_OASRESPONSE_SUCCESS,
    payload: OasResponses,
});

export const listOasResponseFailure = (error: Error) => ({
    type: LIST_OASRESPONSE_FAILURE,
    payload: error,
});

export const updateOasResponseRequest = (OasResponse: any) => ({
    type: UPDATE_OASRESPONSE_REQUEST,
    payload: OasResponse,
});

export const updateOasResponseSuccess = (OasResponse: any) => ({
    type: UPDATE_OASRESPONSE_SUCCESS,
    payload: OasResponse,
});

export const updateOasResponseFailure = (error: Error) => ({
    type: UPDATE_OASRESPONSE_FAILURE,
    payload: error,
});

export const deleteOasResponseRequest = (OasResponse: any) => ({
    type: DELETE_OASRESPONSE_REQUEST,
    payload: OasResponse,
});

export const deleteOasResponseSuccess = (OasResponse: any) => ({
    type: DELETE_OASRESPONSE_SUCCESS,
    payload: OasResponse,
});

export const deleteOasResponseFailure = (error: Error) => ({
    type: DELETE_OASRESPONSE_FAILURE,
    payload: error,
});
