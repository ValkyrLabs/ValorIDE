// defines the Redux Actions for McpResourceTemplate

// McpResourceTemplate

export const FETCH_MCPRESOURCETEMPLATE_REQUEST = 'FETCH_MCPRESOURCETEMPLATE_REQUEST';
export const FETCH_MCPRESOURCETEMPLATE_SUCCESS = 'FETCH_MCPRESOURCETEMPLATE_SUCCESS';
export const FETCH_MCPRESOURCETEMPLATE_FAILURE = 'FETCH_MCPRESOURCETEMPLATE_FAILURE';

export const ADD_MCPRESOURCETEMPLATE_REQUEST = 'ADD_MCPRESOURCETEMPLATE_REQUEST';
export const ADD_MCPRESOURCETEMPLATE_SUCCESS = 'ADD_MCPRESOURCETEMPLATE_SUCCESS';
export const ADD_MCPRESOURCETEMPLATE_FAILURE = 'ADD_MCPRESOURCETEMPLATE_FAILURE';

export const UPDATE_MCPRESOURCETEMPLATE_REQUEST = 'UPDATE_MCPRESOURCETEMPLATE_REQUEST';
export const UPDATE_MCPRESOURCETEMPLATE_SUCCESS = 'UPDATE_MCPRESOURCETEMPLATE_SUCCESS';
export const UPDATE_MCPRESOURCETEMPLATE_FAILURE = 'UPDATE_MCPRESOURCETEMPLATE_FAILURE';

export const DELETE_MCPRESOURCETEMPLATE_REQUEST = 'DELETE_MCPRESOURCETEMPLATE_REQUEST';
export const DELETE_MCPRESOURCETEMPLATE_SUCCESS = 'DELETE_MCPRESOURCETEMPLATE_SUCCESS';
export const DELETE_MCPRESOURCETEMPLATE_FAILURE = 'DELETE_MCPRESOURCETEMPLATE_FAILURE';

export const LIST_MCPRESOURCETEMPLATE_REQUEST = 'LIST_MCPRESOURCETEMPLATE_REQUEST';
export const LIST_MCPRESOURCETEMPLATE_SUCCESS = 'LIST_MCPRESOURCETEMPLATE_SUCCESS';
export const LIST_MCPRESOURCETEMPLATE_FAILURE = 'LIST_MCPRESOURCETEMPLATE_FAILURE';

export const addMcpResourceTemplateRequest = () => ({
    type: ADD_MCPRESOURCETEMPLATE_REQUEST,
});

export const addMcpResourceTemplateSuccess = (McpResourceTemplates: any) => ({
    type: ADD_MCPRESOURCETEMPLATE_SUCCESS,
    payload: McpResourceTemplates,
});

export const addMcpResourceTemplateFailure = (error: Error) => ({
    type: ADD_MCPRESOURCETEMPLATE_FAILURE,
    payload: error,
});


export const fetchMcpResourceTemplateRequest = () => ({
    type: FETCH_MCPRESOURCETEMPLATE_REQUEST,
});

export const fetchMcpResourceTemplateSuccess = (McpResourceTemplates: any) => ({
    type: FETCH_MCPRESOURCETEMPLATE_SUCCESS,
    payload: McpResourceTemplates,
});

export const fetchMcpResourceTemplateFailure = (error: Error) => ({
    type: FETCH_MCPRESOURCETEMPLATE_FAILURE,
    payload: error,
});

export const listMcpResourceTemplateRequest = () => ({
    type: LIST_MCPRESOURCETEMPLATE_REQUEST,
});

export const listMcpResourceTemplateSuccess = (McpResourceTemplates: any) => ({
    type: LIST_MCPRESOURCETEMPLATE_SUCCESS,
    payload: McpResourceTemplates,
});

export const listMcpResourceTemplateFailure = (error: Error) => ({
    type: LIST_MCPRESOURCETEMPLATE_FAILURE,
    payload: error,
});

export const updateMcpResourceTemplateRequest = (McpResourceTemplate: any) => ({
    type: UPDATE_MCPRESOURCETEMPLATE_REQUEST,
    payload: McpResourceTemplate,
});

export const updateMcpResourceTemplateSuccess = (McpResourceTemplate: any) => ({
    type: UPDATE_MCPRESOURCETEMPLATE_SUCCESS,
    payload: McpResourceTemplate,
});

export const updateMcpResourceTemplateFailure = (error: Error) => ({
    type: UPDATE_MCPRESOURCETEMPLATE_FAILURE,
    payload: error,
});

export const deleteMcpResourceTemplateRequest = (McpResourceTemplate: any) => ({
    type: DELETE_MCPRESOURCETEMPLATE_REQUEST,
    payload: McpResourceTemplate,
});

export const deleteMcpResourceTemplateSuccess = (McpResourceTemplate: any) => ({
    type: DELETE_MCPRESOURCETEMPLATE_SUCCESS,
    payload: McpResourceTemplate,
});

export const deleteMcpResourceTemplateFailure = (error: Error) => ({
    type: DELETE_MCPRESOURCETEMPLATE_FAILURE,
    payload: error,
});
