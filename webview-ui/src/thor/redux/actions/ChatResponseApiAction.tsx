// defines the Redux Actions for ChatResponse

// ChatResponse

export const FETCH_CHATRESPONSE_REQUEST = 'FETCH_CHATRESPONSE_REQUEST';
export const FETCH_CHATRESPONSE_SUCCESS = 'FETCH_CHATRESPONSE_SUCCESS';
export const FETCH_CHATRESPONSE_FAILURE = 'FETCH_CHATRESPONSE_FAILURE';

export const ADD_CHATRESPONSE_REQUEST = 'ADD_CHATRESPONSE_REQUEST';
export const ADD_CHATRESPONSE_SUCCESS = 'ADD_CHATRESPONSE_SUCCESS';
export const ADD_CHATRESPONSE_FAILURE = 'ADD_CHATRESPONSE_FAILURE';

export const UPDATE_CHATRESPONSE_REQUEST = 'UPDATE_CHATRESPONSE_REQUEST';
export const UPDATE_CHATRESPONSE_SUCCESS = 'UPDATE_CHATRESPONSE_SUCCESS';
export const UPDATE_CHATRESPONSE_FAILURE = 'UPDATE_CHATRESPONSE_FAILURE';

export const DELETE_CHATRESPONSE_REQUEST = 'DELETE_CHATRESPONSE_REQUEST';
export const DELETE_CHATRESPONSE_SUCCESS = 'DELETE_CHATRESPONSE_SUCCESS';
export const DELETE_CHATRESPONSE_FAILURE = 'DELETE_CHATRESPONSE_FAILURE';

export const LIST_CHATRESPONSE_REQUEST = 'LIST_CHATRESPONSE_REQUEST';
export const LIST_CHATRESPONSE_SUCCESS = 'LIST_CHATRESPONSE_SUCCESS';
export const LIST_CHATRESPONSE_FAILURE = 'LIST_CHATRESPONSE_FAILURE';

export const addChatResponseRequest = () => ({
    type: ADD_CHATRESPONSE_REQUEST,
});

export const addChatResponseSuccess = (ChatResponses: any) => ({
    type: ADD_CHATRESPONSE_SUCCESS,
    payload: ChatResponses,
});

export const addChatResponseFailure = (error: Error) => ({
    type: ADD_CHATRESPONSE_FAILURE,
    payload: error,
});


export const fetchChatResponseRequest = () => ({
    type: FETCH_CHATRESPONSE_REQUEST,
});

export const fetchChatResponseSuccess = (ChatResponses: any) => ({
    type: FETCH_CHATRESPONSE_SUCCESS,
    payload: ChatResponses,
});

export const fetchChatResponseFailure = (error: Error) => ({
    type: FETCH_CHATRESPONSE_FAILURE,
    payload: error,
});

export const listChatResponseRequest = () => ({
    type: LIST_CHATRESPONSE_REQUEST,
});

export const listChatResponseSuccess = (ChatResponses: any) => ({
    type: LIST_CHATRESPONSE_SUCCESS,
    payload: ChatResponses,
});

export const listChatResponseFailure = (error: Error) => ({
    type: LIST_CHATRESPONSE_FAILURE,
    payload: error,
});

export const updateChatResponseRequest = (ChatResponse: any) => ({
    type: UPDATE_CHATRESPONSE_REQUEST,
    payload: ChatResponse,
});

export const updateChatResponseSuccess = (ChatResponse: any) => ({
    type: UPDATE_CHATRESPONSE_SUCCESS,
    payload: ChatResponse,
});

export const updateChatResponseFailure = (error: Error) => ({
    type: UPDATE_CHATRESPONSE_FAILURE,
    payload: error,
});

export const deleteChatResponseRequest = (ChatResponse: any) => ({
    type: DELETE_CHATRESPONSE_REQUEST,
    payload: ChatResponse,
});

export const deleteChatResponseSuccess = (ChatResponse: any) => ({
    type: DELETE_CHATRESPONSE_SUCCESS,
    payload: ChatResponse,
});

export const deleteChatResponseFailure = (error: Error) => ({
    type: DELETE_CHATRESPONSE_FAILURE,
    payload: error,
});
