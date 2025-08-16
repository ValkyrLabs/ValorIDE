// defines the Redux Actions for WebsocketMessage

// WebsocketMessage

export const FETCH_WEBSOCKETMESSAGE_REQUEST = 'FETCH_WEBSOCKETMESSAGE_REQUEST';
export const FETCH_WEBSOCKETMESSAGE_SUCCESS = 'FETCH_WEBSOCKETMESSAGE_SUCCESS';
export const FETCH_WEBSOCKETMESSAGE_FAILURE = 'FETCH_WEBSOCKETMESSAGE_FAILURE';

export const ADD_WEBSOCKETMESSAGE_REQUEST = 'ADD_WEBSOCKETMESSAGE_REQUEST';
export const ADD_WEBSOCKETMESSAGE_SUCCESS = 'ADD_WEBSOCKETMESSAGE_SUCCESS';
export const ADD_WEBSOCKETMESSAGE_FAILURE = 'ADD_WEBSOCKETMESSAGE_FAILURE';

export const UPDATE_WEBSOCKETMESSAGE_REQUEST = 'UPDATE_WEBSOCKETMESSAGE_REQUEST';
export const UPDATE_WEBSOCKETMESSAGE_SUCCESS = 'UPDATE_WEBSOCKETMESSAGE_SUCCESS';
export const UPDATE_WEBSOCKETMESSAGE_FAILURE = 'UPDATE_WEBSOCKETMESSAGE_FAILURE';

export const DELETE_WEBSOCKETMESSAGE_REQUEST = 'DELETE_WEBSOCKETMESSAGE_REQUEST';
export const DELETE_WEBSOCKETMESSAGE_SUCCESS = 'DELETE_WEBSOCKETMESSAGE_SUCCESS';
export const DELETE_WEBSOCKETMESSAGE_FAILURE = 'DELETE_WEBSOCKETMESSAGE_FAILURE';

export const LIST_WEBSOCKETMESSAGE_REQUEST = 'LIST_WEBSOCKETMESSAGE_REQUEST';
export const LIST_WEBSOCKETMESSAGE_SUCCESS = 'LIST_WEBSOCKETMESSAGE_SUCCESS';
export const LIST_WEBSOCKETMESSAGE_FAILURE = 'LIST_WEBSOCKETMESSAGE_FAILURE';

export const addWebsocketMessageRequest = () => ({
    type: ADD_WEBSOCKETMESSAGE_REQUEST,
});

export const addWebsocketMessageSuccess = (WebsocketMessages: any) => ({
    type: ADD_WEBSOCKETMESSAGE_SUCCESS,
    payload: WebsocketMessages,
});

export const addWebsocketMessageFailure = (error: Error) => ({
    type: ADD_WEBSOCKETMESSAGE_FAILURE,
    payload: error,
});


export const fetchWebsocketMessageRequest = () => ({
    type: FETCH_WEBSOCKETMESSAGE_REQUEST,
});

export const fetchWebsocketMessageSuccess = (WebsocketMessages: any) => ({
    type: FETCH_WEBSOCKETMESSAGE_SUCCESS,
    payload: WebsocketMessages,
});

export const fetchWebsocketMessageFailure = (error: Error) => ({
    type: FETCH_WEBSOCKETMESSAGE_FAILURE,
    payload: error,
});

export const listWebsocketMessageRequest = () => ({
    type: LIST_WEBSOCKETMESSAGE_REQUEST,
});

export const listWebsocketMessageSuccess = (WebsocketMessages: any) => ({
    type: LIST_WEBSOCKETMESSAGE_SUCCESS,
    payload: WebsocketMessages,
});

export const listWebsocketMessageFailure = (error: Error) => ({
    type: LIST_WEBSOCKETMESSAGE_FAILURE,
    payload: error,
});

export const updateWebsocketMessageRequest = (WebsocketMessage: any) => ({
    type: UPDATE_WEBSOCKETMESSAGE_REQUEST,
    payload: WebsocketMessage,
});

export const updateWebsocketMessageSuccess = (WebsocketMessage: any) => ({
    type: UPDATE_WEBSOCKETMESSAGE_SUCCESS,
    payload: WebsocketMessage,
});

export const updateWebsocketMessageFailure = (error: Error) => ({
    type: UPDATE_WEBSOCKETMESSAGE_FAILURE,
    payload: error,
});

export const deleteWebsocketMessageRequest = (WebsocketMessage: any) => ({
    type: DELETE_WEBSOCKETMESSAGE_REQUEST,
    payload: WebsocketMessage,
});

export const deleteWebsocketMessageSuccess = (WebsocketMessage: any) => ({
    type: DELETE_WEBSOCKETMESSAGE_SUCCESS,
    payload: WebsocketMessage,
});

export const deleteWebsocketMessageFailure = (error: Error) => ({
    type: DELETE_WEBSOCKETMESSAGE_FAILURE,
    payload: error,
});
