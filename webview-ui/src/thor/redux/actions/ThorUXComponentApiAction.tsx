// defines the Redux Actions for ThorUXComponent

// ThorUXComponent

export const FETCH_THORUXCOMPONENT_REQUEST = "FETCH_THORUXCOMPONENT_REQUEST"
export const FETCH_THORUXCOMPONENT_SUCCESS = "FETCH_THORUXCOMPONENT_SUCCESS"
export const FETCH_THORUXCOMPONENT_FAILURE = "FETCH_THORUXCOMPONENT_FAILURE"

export const ADD_THORUXCOMPONENT_REQUEST = "ADD_THORUXCOMPONENT_REQUEST"
export const ADD_THORUXCOMPONENT_SUCCESS = "ADD_THORUXCOMPONENT_SUCCESS"
export const ADD_THORUXCOMPONENT_FAILURE = "ADD_THORUXCOMPONENT_FAILURE"

export const UPDATE_THORUXCOMPONENT_REQUEST = "UPDATE_THORUXCOMPONENT_REQUEST"
export const UPDATE_THORUXCOMPONENT_SUCCESS = "UPDATE_THORUXCOMPONENT_SUCCESS"
export const UPDATE_THORUXCOMPONENT_FAILURE = "UPDATE_THORUXCOMPONENT_FAILURE"

export const DELETE_THORUXCOMPONENT_REQUEST = "DELETE_THORUXCOMPONENT_REQUEST"
export const DELETE_THORUXCOMPONENT_SUCCESS = "DELETE_THORUXCOMPONENT_SUCCESS"
export const DELETE_THORUXCOMPONENT_FAILURE = "DELETE_THORUXCOMPONENT_FAILURE"

export const LIST_THORUXCOMPONENT_REQUEST = "LIST_THORUXCOMPONENT_REQUEST"
export const LIST_THORUXCOMPONENT_SUCCESS = "LIST_THORUXCOMPONENT_SUCCESS"
export const LIST_THORUXCOMPONENT_FAILURE = "LIST_THORUXCOMPONENT_FAILURE"

export const addThorUXComponentRequest = () => ({
	type: ADD_THORUXCOMPONENT_REQUEST,
})

export const addThorUXComponentSuccess = (ThorUXComponents: any) => ({
	type: ADD_THORUXCOMPONENT_SUCCESS,
	payload: ThorUXComponents,
})

export const addThorUXComponentFailure = (error: Error) => ({
	type: ADD_THORUXCOMPONENT_FAILURE,
	payload: error,
})

export const fetchThorUXComponentRequest = () => ({
	type: FETCH_THORUXCOMPONENT_REQUEST,
})

export const fetchThorUXComponentSuccess = (ThorUXComponents: any) => ({
	type: FETCH_THORUXCOMPONENT_SUCCESS,
	payload: ThorUXComponents,
})

export const fetchThorUXComponentFailure = (error: Error) => ({
	type: FETCH_THORUXCOMPONENT_FAILURE,
	payload: error,
})

export const listThorUXComponentRequest = () => ({
	type: LIST_THORUXCOMPONENT_REQUEST,
})

export const listThorUXComponentSuccess = (ThorUXComponents: any) => ({
	type: LIST_THORUXCOMPONENT_SUCCESS,
	payload: ThorUXComponents,
})

export const listThorUXComponentFailure = (error: Error) => ({
	type: LIST_THORUXCOMPONENT_FAILURE,
	payload: error,
})

export const updateThorUXComponentRequest = (ThorUXComponent: any) => ({
	type: UPDATE_THORUXCOMPONENT_REQUEST,
	payload: ThorUXComponent,
})

export const updateThorUXComponentSuccess = (ThorUXComponent: any) => ({
	type: UPDATE_THORUXCOMPONENT_SUCCESS,
	payload: ThorUXComponent,
})

export const updateThorUXComponentFailure = (error: Error) => ({
	type: UPDATE_THORUXCOMPONENT_FAILURE,
	payload: error,
})

export const deleteThorUXComponentRequest = (ThorUXComponent: any) => ({
	type: DELETE_THORUXCOMPONENT_REQUEST,
	payload: ThorUXComponent,
})

export const deleteThorUXComponentSuccess = (ThorUXComponent: any) => ({
	type: DELETE_THORUXCOMPONENT_SUCCESS,
	payload: ThorUXComponent,
})

export const deleteThorUXComponentFailure = (error: Error) => ({
	type: DELETE_THORUXCOMPONENT_FAILURE,
	payload: error,
})
