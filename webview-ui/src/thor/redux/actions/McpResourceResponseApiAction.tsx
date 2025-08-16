// defines the Redux Actions for McpResourceResponse

// McpResourceResponse

export const FETCH_MCPRESOURCERESPONSE_REQUEST = 'FETCH_MCPRESOURCERESPONSE_REQUEST';
export const FETCH_MCPRESOURCERESPONSE_SUCCESS = 'FETCH_MCPRESOURCERESPONSE_SUCCESS';
export const FETCH_MCPRESOURCERESPONSE_FAILURE = 'FETCH_MCPRESOURCERESPONSE_FAILURE';

export const ADD_MCPRESOURCERESPONSE_REQUEST = 'ADD_MCPRESOURCERESPONSE_REQUEST';
export const ADD_MCPRESOURCERESPONSE_SUCCESS = 'ADD_MCPRESOURCERESPONSE_SUCCESS';
export const ADD_MCPRESOURCERESPONSE_FAILURE = 'ADD_MCPRESOURCERESPONSE_FAILURE';

export const UPDATE_MCPRESOURCERESPONSE_REQUEST = 'UPDATE_MCPRESOURCERESPONSE_REQUEST';
export const UPDATE_MCPRESOURCERESPONSE_SUCCESS = 'UPDATE_MCPRESOURCERESPONSE_SUCCESS';
export const UPDATE_MCPRESOURCERESPONSE_FAILURE = 'UPDATE_MCPRESOURCERESPONSE_FAILURE';

export const DELETE_MCPRESOURCERESPONSE_REQUEST = 'DELETE_MCPRESOURCERESPONSE_REQUEST';
export const DELETE_MCPRESOURCERESPONSE_SUCCESS = 'DELETE_MCPRESOURCERESPONSE_SUCCESS';
export const DELETE_MCPRESOURCERESPONSE_FAILURE = 'DELETE_MCPRESOURCERESPONSE_FAILURE';

export const LIST_MCPRESOURCERESPONSE_REQUEST = 'LIST_MCPRESOURCERESPONSE_REQUEST';
export const LIST_MCPRESOURCERESPONSE_SUCCESS = 'LIST_MCPRESOURCERESPONSE_SUCCESS';
export const LIST_MCPRESOURCERESPONSE_FAILURE = 'LIST_MCPRESOURCERESPONSE_FAILURE';

export const addMcpResourceResponseRequest = () => ({
    type: ADD_MCPRESOURCERESPONSE_REQUEST,
});

export const addMcpResourceResponseSuccess = (McpResourceResponses: any) => ({
    type: ADD_MCPRESOURCERESPONSE_SUCCESS,
    payload: McpResourceResponses,
});

export const addMcpResourceResponseFailure = (error: Error) => ({
    type: ADD_MCPRESOURCERESPONSE_FAILURE,
    payload: error,
});


export const fetchMcpResourceResponseRequest = () => ({
    type: FETCH_MCPRESOURCERESPONSE_REQUEST,
});

export const fetchMcpResourceResponseSuccess = (McpResourceResponses: any) => ({
    type: FETCH_MCPRESOURCERESPONSE_SUCCESS,
    payload: McpResourceResponses,
});

export const fetchMcpResourceResponseFailure = (error: Error) => ({
    type: FETCH_MCPRESOURCERESPONSE_FAILURE,
    payload: error,
});

export const listMcpResourceResponseRequest = () => ({
    type: LIST_MCPRESOURCERESPONSE_REQUEST,
});

export const listMcpResourceResponseSuccess = (McpResourceResponses: any) => ({
    type: LIST_MCPRESOURCERESPONSE_SUCCESS,
    payload: McpResourceResponses,
});

export const listMcpResourceResponseFailure = (error: Error) => ({
    type: LIST_MCPRESOURCERESPONSE_FAILURE,
    payload: error,
});

export const updateMcpResourceResponseRequest = (McpResourceResponse: any) => ({
    type: UPDATE_MCPRESOURCERESPONSE_REQUEST,
    payload: McpResourceResponse,
});

export const updateMcpResourceResponseSuccess = (McpResourceResponse: any) => ({
    type: UPDATE_MCPRESOURCERESPONSE_SUCCESS,
    payload: McpResourceResponse,
});

export const updateMcpResourceResponseFailure = (error: Error) => ({
    type: UPDATE_MCPRESOURCERESPONSE_FAILURE,
    payload: error,
});

export const deleteMcpResourceResponseRequest = (McpResourceResponse: any) => ({
    type: DELETE_MCPRESOURCERESPONSE_REQUEST,
    payload: McpResourceResponse,
});

export const deleteMcpResourceResponseSuccess = (McpResourceResponse: any) => ({
    type: DELETE_MCPRESOURCERESPONSE_SUCCESS,
    payload: McpResourceResponse,
});

export const deleteMcpResourceResponseFailure = (error: Error) => ({
    type: DELETE_MCPRESOURCERESPONSE_FAILURE,
    payload: error,
});
