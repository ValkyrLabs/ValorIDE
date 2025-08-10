// defines the Redux Actions for McpServer

// McpServer

export const FETCH_MCPSERVER_REQUEST = "FETCH_MCPSERVER_REQUEST";
export const FETCH_MCPSERVER_SUCCESS = "FETCH_MCPSERVER_SUCCESS";
export const FETCH_MCPSERVER_FAILURE = "FETCH_MCPSERVER_FAILURE";

export const ADD_MCPSERVER_REQUEST = "ADD_MCPSERVER_REQUEST";
export const ADD_MCPSERVER_SUCCESS = "ADD_MCPSERVER_SUCCESS";
export const ADD_MCPSERVER_FAILURE = "ADD_MCPSERVER_FAILURE";

export const UPDATE_MCPSERVER_REQUEST = "UPDATE_MCPSERVER_REQUEST";
export const UPDATE_MCPSERVER_SUCCESS = "UPDATE_MCPSERVER_SUCCESS";
export const UPDATE_MCPSERVER_FAILURE = "UPDATE_MCPSERVER_FAILURE";

export const DELETE_MCPSERVER_REQUEST = "DELETE_MCPSERVER_REQUEST";
export const DELETE_MCPSERVER_SUCCESS = "DELETE_MCPSERVER_SUCCESS";
export const DELETE_MCPSERVER_FAILURE = "DELETE_MCPSERVER_FAILURE";

export const LIST_MCPSERVER_REQUEST = "LIST_MCPSERVER_REQUEST";
export const LIST_MCPSERVER_SUCCESS = "LIST_MCPSERVER_SUCCESS";
export const LIST_MCPSERVER_FAILURE = "LIST_MCPSERVER_FAILURE";

export const addMcpServerRequest = () => ({
  type: ADD_MCPSERVER_REQUEST,
});

export const addMcpServerSuccess = (McpServers: any) => ({
  type: ADD_MCPSERVER_SUCCESS,
  payload: McpServers,
});

export const addMcpServerFailure = (error: Error) => ({
  type: ADD_MCPSERVER_FAILURE,
  payload: error,
});

export const fetchMcpServerRequest = () => ({
  type: FETCH_MCPSERVER_REQUEST,
});

export const fetchMcpServerSuccess = (McpServers: any) => ({
  type: FETCH_MCPSERVER_SUCCESS,
  payload: McpServers,
});

export const fetchMcpServerFailure = (error: Error) => ({
  type: FETCH_MCPSERVER_FAILURE,
  payload: error,
});

export const listMcpServerRequest = () => ({
  type: LIST_MCPSERVER_REQUEST,
});

export const listMcpServerSuccess = (McpServers: any) => ({
  type: LIST_MCPSERVER_SUCCESS,
  payload: McpServers,
});

export const listMcpServerFailure = (error: Error) => ({
  type: LIST_MCPSERVER_FAILURE,
  payload: error,
});

export const updateMcpServerRequest = (McpServer: any) => ({
  type: UPDATE_MCPSERVER_REQUEST,
  payload: McpServer,
});

export const updateMcpServerSuccess = (McpServer: any) => ({
  type: UPDATE_MCPSERVER_SUCCESS,
  payload: McpServer,
});

export const updateMcpServerFailure = (error: Error) => ({
  type: UPDATE_MCPSERVER_FAILURE,
  payload: error,
});

export const deleteMcpServerRequest = (McpServer: any) => ({
  type: DELETE_MCPSERVER_REQUEST,
  payload: McpServer,
});

export const deleteMcpServerSuccess = (McpServer: any) => ({
  type: DELETE_MCPSERVER_SUCCESS,
  payload: McpServer,
});

export const deleteMcpServerFailure = (error: Error) => ({
  type: DELETE_MCPSERVER_FAILURE,
  payload: error,
});
