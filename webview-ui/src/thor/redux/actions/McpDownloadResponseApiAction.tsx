// defines the Redux Actions for McpDownloadResponse

// McpDownloadResponse

export const FETCH_MCPDOWNLOADRESPONSE_REQUEST = 'FETCH_MCPDOWNLOADRESPONSE_REQUEST';
export const FETCH_MCPDOWNLOADRESPONSE_SUCCESS = 'FETCH_MCPDOWNLOADRESPONSE_SUCCESS';
export const FETCH_MCPDOWNLOADRESPONSE_FAILURE = 'FETCH_MCPDOWNLOADRESPONSE_FAILURE';

export const ADD_MCPDOWNLOADRESPONSE_REQUEST = 'ADD_MCPDOWNLOADRESPONSE_REQUEST';
export const ADD_MCPDOWNLOADRESPONSE_SUCCESS = 'ADD_MCPDOWNLOADRESPONSE_SUCCESS';
export const ADD_MCPDOWNLOADRESPONSE_FAILURE = 'ADD_MCPDOWNLOADRESPONSE_FAILURE';

export const UPDATE_MCPDOWNLOADRESPONSE_REQUEST = 'UPDATE_MCPDOWNLOADRESPONSE_REQUEST';
export const UPDATE_MCPDOWNLOADRESPONSE_SUCCESS = 'UPDATE_MCPDOWNLOADRESPONSE_SUCCESS';
export const UPDATE_MCPDOWNLOADRESPONSE_FAILURE = 'UPDATE_MCPDOWNLOADRESPONSE_FAILURE';

export const DELETE_MCPDOWNLOADRESPONSE_REQUEST = 'DELETE_MCPDOWNLOADRESPONSE_REQUEST';
export const DELETE_MCPDOWNLOADRESPONSE_SUCCESS = 'DELETE_MCPDOWNLOADRESPONSE_SUCCESS';
export const DELETE_MCPDOWNLOADRESPONSE_FAILURE = 'DELETE_MCPDOWNLOADRESPONSE_FAILURE';

export const LIST_MCPDOWNLOADRESPONSE_REQUEST = 'LIST_MCPDOWNLOADRESPONSE_REQUEST';
export const LIST_MCPDOWNLOADRESPONSE_SUCCESS = 'LIST_MCPDOWNLOADRESPONSE_SUCCESS';
export const LIST_MCPDOWNLOADRESPONSE_FAILURE = 'LIST_MCPDOWNLOADRESPONSE_FAILURE';

export const addMcpDownloadResponseRequest = () => ({
    type: ADD_MCPDOWNLOADRESPONSE_REQUEST,
});

export const addMcpDownloadResponseSuccess = (McpDownloadResponses: any) => ({
    type: ADD_MCPDOWNLOADRESPONSE_SUCCESS,
    payload: McpDownloadResponses,
});

export const addMcpDownloadResponseFailure = (error: Error) => ({
    type: ADD_MCPDOWNLOADRESPONSE_FAILURE,
    payload: error,
});


export const fetchMcpDownloadResponseRequest = () => ({
    type: FETCH_MCPDOWNLOADRESPONSE_REQUEST,
});

export const fetchMcpDownloadResponseSuccess = (McpDownloadResponses: any) => ({
    type: FETCH_MCPDOWNLOADRESPONSE_SUCCESS,
    payload: McpDownloadResponses,
});

export const fetchMcpDownloadResponseFailure = (error: Error) => ({
    type: FETCH_MCPDOWNLOADRESPONSE_FAILURE,
    payload: error,
});

export const listMcpDownloadResponseRequest = () => ({
    type: LIST_MCPDOWNLOADRESPONSE_REQUEST,
});

export const listMcpDownloadResponseSuccess = (McpDownloadResponses: any) => ({
    type: LIST_MCPDOWNLOADRESPONSE_SUCCESS,
    payload: McpDownloadResponses,
});

export const listMcpDownloadResponseFailure = (error: Error) => ({
    type: LIST_MCPDOWNLOADRESPONSE_FAILURE,
    payload: error,
});

export const updateMcpDownloadResponseRequest = (McpDownloadResponse: any) => ({
    type: UPDATE_MCPDOWNLOADRESPONSE_REQUEST,
    payload: McpDownloadResponse,
});

export const updateMcpDownloadResponseSuccess = (McpDownloadResponse: any) => ({
    type: UPDATE_MCPDOWNLOADRESPONSE_SUCCESS,
    payload: McpDownloadResponse,
});

export const updateMcpDownloadResponseFailure = (error: Error) => ({
    type: UPDATE_MCPDOWNLOADRESPONSE_FAILURE,
    payload: error,
});

export const deleteMcpDownloadResponseRequest = (McpDownloadResponse: any) => ({
    type: DELETE_MCPDOWNLOADRESPONSE_REQUEST,
    payload: McpDownloadResponse,
});

export const deleteMcpDownloadResponseSuccess = (McpDownloadResponse: any) => ({
    type: DELETE_MCPDOWNLOADRESPONSE_SUCCESS,
    payload: McpDownloadResponse,
});

export const deleteMcpDownloadResponseFailure = (error: Error) => ({
    type: DELETE_MCPDOWNLOADRESPONSE_FAILURE,
    payload: error,
});
