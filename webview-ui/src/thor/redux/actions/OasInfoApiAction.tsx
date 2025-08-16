// defines the Redux Actions for OasInfo

// OasInfo

export const FETCH_OASINFO_REQUEST = 'FETCH_OASINFO_REQUEST';
export const FETCH_OASINFO_SUCCESS = 'FETCH_OASINFO_SUCCESS';
export const FETCH_OASINFO_FAILURE = 'FETCH_OASINFO_FAILURE';

export const ADD_OASINFO_REQUEST = 'ADD_OASINFO_REQUEST';
export const ADD_OASINFO_SUCCESS = 'ADD_OASINFO_SUCCESS';
export const ADD_OASINFO_FAILURE = 'ADD_OASINFO_FAILURE';

export const UPDATE_OASINFO_REQUEST = 'UPDATE_OASINFO_REQUEST';
export const UPDATE_OASINFO_SUCCESS = 'UPDATE_OASINFO_SUCCESS';
export const UPDATE_OASINFO_FAILURE = 'UPDATE_OASINFO_FAILURE';

export const DELETE_OASINFO_REQUEST = 'DELETE_OASINFO_REQUEST';
export const DELETE_OASINFO_SUCCESS = 'DELETE_OASINFO_SUCCESS';
export const DELETE_OASINFO_FAILURE = 'DELETE_OASINFO_FAILURE';

export const LIST_OASINFO_REQUEST = 'LIST_OASINFO_REQUEST';
export const LIST_OASINFO_SUCCESS = 'LIST_OASINFO_SUCCESS';
export const LIST_OASINFO_FAILURE = 'LIST_OASINFO_FAILURE';

export const addOasInfoRequest = () => ({
    type: ADD_OASINFO_REQUEST,
});

export const addOasInfoSuccess = (OasInfos: any) => ({
    type: ADD_OASINFO_SUCCESS,
    payload: OasInfos,
});

export const addOasInfoFailure = (error: Error) => ({
    type: ADD_OASINFO_FAILURE,
    payload: error,
});


export const fetchOasInfoRequest = () => ({
    type: FETCH_OASINFO_REQUEST,
});

export const fetchOasInfoSuccess = (OasInfos: any) => ({
    type: FETCH_OASINFO_SUCCESS,
    payload: OasInfos,
});

export const fetchOasInfoFailure = (error: Error) => ({
    type: FETCH_OASINFO_FAILURE,
    payload: error,
});

export const listOasInfoRequest = () => ({
    type: LIST_OASINFO_REQUEST,
});

export const listOasInfoSuccess = (OasInfos: any) => ({
    type: LIST_OASINFO_SUCCESS,
    payload: OasInfos,
});

export const listOasInfoFailure = (error: Error) => ({
    type: LIST_OASINFO_FAILURE,
    payload: error,
});

export const updateOasInfoRequest = (OasInfo: any) => ({
    type: UPDATE_OASINFO_REQUEST,
    payload: OasInfo,
});

export const updateOasInfoSuccess = (OasInfo: any) => ({
    type: UPDATE_OASINFO_SUCCESS,
    payload: OasInfo,
});

export const updateOasInfoFailure = (error: Error) => ({
    type: UPDATE_OASINFO_FAILURE,
    payload: error,
});

export const deleteOasInfoRequest = (OasInfo: any) => ({
    type: DELETE_OASINFO_REQUEST,
    payload: OasInfo,
});

export const deleteOasInfoSuccess = (OasInfo: any) => ({
    type: DELETE_OASINFO_SUCCESS,
    payload: OasInfo,
});

export const deleteOasInfoFailure = (error: Error) => ({
    type: DELETE_OASINFO_FAILURE,
    payload: error,
});
