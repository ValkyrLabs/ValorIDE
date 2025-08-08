// defines the Redux Actions for McpMarketplaceItem

// McpMarketplaceItem

export const FETCH_MCPMARKETPLACEITEM_REQUEST = "FETCH_MCPMARKETPLACEITEM_REQUEST"
export const FETCH_MCPMARKETPLACEITEM_SUCCESS = "FETCH_MCPMARKETPLACEITEM_SUCCESS"
export const FETCH_MCPMARKETPLACEITEM_FAILURE = "FETCH_MCPMARKETPLACEITEM_FAILURE"

export const ADD_MCPMARKETPLACEITEM_REQUEST = "ADD_MCPMARKETPLACEITEM_REQUEST"
export const ADD_MCPMARKETPLACEITEM_SUCCESS = "ADD_MCPMARKETPLACEITEM_SUCCESS"
export const ADD_MCPMARKETPLACEITEM_FAILURE = "ADD_MCPMARKETPLACEITEM_FAILURE"

export const UPDATE_MCPMARKETPLACEITEM_REQUEST = "UPDATE_MCPMARKETPLACEITEM_REQUEST"
export const UPDATE_MCPMARKETPLACEITEM_SUCCESS = "UPDATE_MCPMARKETPLACEITEM_SUCCESS"
export const UPDATE_MCPMARKETPLACEITEM_FAILURE = "UPDATE_MCPMARKETPLACEITEM_FAILURE"

export const DELETE_MCPMARKETPLACEITEM_REQUEST = "DELETE_MCPMARKETPLACEITEM_REQUEST"
export const DELETE_MCPMARKETPLACEITEM_SUCCESS = "DELETE_MCPMARKETPLACEITEM_SUCCESS"
export const DELETE_MCPMARKETPLACEITEM_FAILURE = "DELETE_MCPMARKETPLACEITEM_FAILURE"

export const LIST_MCPMARKETPLACEITEM_REQUEST = "LIST_MCPMARKETPLACEITEM_REQUEST"
export const LIST_MCPMARKETPLACEITEM_SUCCESS = "LIST_MCPMARKETPLACEITEM_SUCCESS"
export const LIST_MCPMARKETPLACEITEM_FAILURE = "LIST_MCPMARKETPLACEITEM_FAILURE"

export const addMcpMarketplaceItemRequest = () => ({
	type: ADD_MCPMARKETPLACEITEM_REQUEST,
})

export const addMcpMarketplaceItemSuccess = (McpMarketplaceItems: any) => ({
	type: ADD_MCPMARKETPLACEITEM_SUCCESS,
	payload: McpMarketplaceItems,
})

export const addMcpMarketplaceItemFailure = (error: Error) => ({
	type: ADD_MCPMARKETPLACEITEM_FAILURE,
	payload: error,
})

export const fetchMcpMarketplaceItemRequest = () => ({
	type: FETCH_MCPMARKETPLACEITEM_REQUEST,
})

export const fetchMcpMarketplaceItemSuccess = (McpMarketplaceItems: any) => ({
	type: FETCH_MCPMARKETPLACEITEM_SUCCESS,
	payload: McpMarketplaceItems,
})

export const fetchMcpMarketplaceItemFailure = (error: Error) => ({
	type: FETCH_MCPMARKETPLACEITEM_FAILURE,
	payload: error,
})

export const listMcpMarketplaceItemRequest = () => ({
	type: LIST_MCPMARKETPLACEITEM_REQUEST,
})

export const listMcpMarketplaceItemSuccess = (McpMarketplaceItems: any) => ({
	type: LIST_MCPMARKETPLACEITEM_SUCCESS,
	payload: McpMarketplaceItems,
})

export const listMcpMarketplaceItemFailure = (error: Error) => ({
	type: LIST_MCPMARKETPLACEITEM_FAILURE,
	payload: error,
})

export const updateMcpMarketplaceItemRequest = (McpMarketplaceItem: any) => ({
	type: UPDATE_MCPMARKETPLACEITEM_REQUEST,
	payload: McpMarketplaceItem,
})

export const updateMcpMarketplaceItemSuccess = (McpMarketplaceItem: any) => ({
	type: UPDATE_MCPMARKETPLACEITEM_SUCCESS,
	payload: McpMarketplaceItem,
})

export const updateMcpMarketplaceItemFailure = (error: Error) => ({
	type: UPDATE_MCPMARKETPLACEITEM_FAILURE,
	payload: error,
})

export const deleteMcpMarketplaceItemRequest = (McpMarketplaceItem: any) => ({
	type: DELETE_MCPMARKETPLACEITEM_REQUEST,
	payload: McpMarketplaceItem,
})

export const deleteMcpMarketplaceItemSuccess = (McpMarketplaceItem: any) => ({
	type: DELETE_MCPMARKETPLACEITEM_SUCCESS,
	payload: McpMarketplaceItem,
})

export const deleteMcpMarketplaceItemFailure = (error: Error) => ({
	type: DELETE_MCPMARKETPLACEITEM_FAILURE,
	payload: error,
})
