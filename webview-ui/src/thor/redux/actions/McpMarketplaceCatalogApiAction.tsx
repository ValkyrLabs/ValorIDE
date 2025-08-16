// defines the Redux Actions for McpMarketplaceCatalog

// McpMarketplaceCatalog

export const FETCH_MCPMARKETPLACECATALOG_REQUEST = 'FETCH_MCPMARKETPLACECATALOG_REQUEST';
export const FETCH_MCPMARKETPLACECATALOG_SUCCESS = 'FETCH_MCPMARKETPLACECATALOG_SUCCESS';
export const FETCH_MCPMARKETPLACECATALOG_FAILURE = 'FETCH_MCPMARKETPLACECATALOG_FAILURE';

export const ADD_MCPMARKETPLACECATALOG_REQUEST = 'ADD_MCPMARKETPLACECATALOG_REQUEST';
export const ADD_MCPMARKETPLACECATALOG_SUCCESS = 'ADD_MCPMARKETPLACECATALOG_SUCCESS';
export const ADD_MCPMARKETPLACECATALOG_FAILURE = 'ADD_MCPMARKETPLACECATALOG_FAILURE';

export const UPDATE_MCPMARKETPLACECATALOG_REQUEST = 'UPDATE_MCPMARKETPLACECATALOG_REQUEST';
export const UPDATE_MCPMARKETPLACECATALOG_SUCCESS = 'UPDATE_MCPMARKETPLACECATALOG_SUCCESS';
export const UPDATE_MCPMARKETPLACECATALOG_FAILURE = 'UPDATE_MCPMARKETPLACECATALOG_FAILURE';

export const DELETE_MCPMARKETPLACECATALOG_REQUEST = 'DELETE_MCPMARKETPLACECATALOG_REQUEST';
export const DELETE_MCPMARKETPLACECATALOG_SUCCESS = 'DELETE_MCPMARKETPLACECATALOG_SUCCESS';
export const DELETE_MCPMARKETPLACECATALOG_FAILURE = 'DELETE_MCPMARKETPLACECATALOG_FAILURE';

export const LIST_MCPMARKETPLACECATALOG_REQUEST = 'LIST_MCPMARKETPLACECATALOG_REQUEST';
export const LIST_MCPMARKETPLACECATALOG_SUCCESS = 'LIST_MCPMARKETPLACECATALOG_SUCCESS';
export const LIST_MCPMARKETPLACECATALOG_FAILURE = 'LIST_MCPMARKETPLACECATALOG_FAILURE';

export const addMcpMarketplaceCatalogRequest = () => ({
    type: ADD_MCPMARKETPLACECATALOG_REQUEST,
});

export const addMcpMarketplaceCatalogSuccess = (McpMarketplaceCatalogs: any) => ({
    type: ADD_MCPMARKETPLACECATALOG_SUCCESS,
    payload: McpMarketplaceCatalogs,
});

export const addMcpMarketplaceCatalogFailure = (error: Error) => ({
    type: ADD_MCPMARKETPLACECATALOG_FAILURE,
    payload: error,
});


export const fetchMcpMarketplaceCatalogRequest = () => ({
    type: FETCH_MCPMARKETPLACECATALOG_REQUEST,
});

export const fetchMcpMarketplaceCatalogSuccess = (McpMarketplaceCatalogs: any) => ({
    type: FETCH_MCPMARKETPLACECATALOG_SUCCESS,
    payload: McpMarketplaceCatalogs,
});

export const fetchMcpMarketplaceCatalogFailure = (error: Error) => ({
    type: FETCH_MCPMARKETPLACECATALOG_FAILURE,
    payload: error,
});

export const listMcpMarketplaceCatalogRequest = () => ({
    type: LIST_MCPMARKETPLACECATALOG_REQUEST,
});

export const listMcpMarketplaceCatalogSuccess = (McpMarketplaceCatalogs: any) => ({
    type: LIST_MCPMARKETPLACECATALOG_SUCCESS,
    payload: McpMarketplaceCatalogs,
});

export const listMcpMarketplaceCatalogFailure = (error: Error) => ({
    type: LIST_MCPMARKETPLACECATALOG_FAILURE,
    payload: error,
});

export const updateMcpMarketplaceCatalogRequest = (McpMarketplaceCatalog: any) => ({
    type: UPDATE_MCPMARKETPLACECATALOG_REQUEST,
    payload: McpMarketplaceCatalog,
});

export const updateMcpMarketplaceCatalogSuccess = (McpMarketplaceCatalog: any) => ({
    type: UPDATE_MCPMARKETPLACECATALOG_SUCCESS,
    payload: McpMarketplaceCatalog,
});

export const updateMcpMarketplaceCatalogFailure = (error: Error) => ({
    type: UPDATE_MCPMARKETPLACECATALOG_FAILURE,
    payload: error,
});

export const deleteMcpMarketplaceCatalogRequest = (McpMarketplaceCatalog: any) => ({
    type: DELETE_MCPMARKETPLACECATALOG_REQUEST,
    payload: McpMarketplaceCatalog,
});

export const deleteMcpMarketplaceCatalogSuccess = (McpMarketplaceCatalog: any) => ({
    type: DELETE_MCPMARKETPLACECATALOG_SUCCESS,
    payload: McpMarketplaceCatalog,
});

export const deleteMcpMarketplaceCatalogFailure = (error: Error) => ({
    type: DELETE_MCPMARKETPLACECATALOG_FAILURE,
    payload: error,
});
