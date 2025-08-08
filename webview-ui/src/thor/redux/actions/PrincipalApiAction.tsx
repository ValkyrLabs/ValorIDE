// defines the Redux Actions for Principal

// Principal

export const FETCH_PRINCIPAL_REQUEST = "FETCH_PRINCIPAL_REQUEST"
export const FETCH_PRINCIPAL_SUCCESS = "FETCH_PRINCIPAL_SUCCESS"
export const FETCH_PRINCIPAL_FAILURE = "FETCH_PRINCIPAL_FAILURE"

export const ADD_PRINCIPAL_REQUEST = "ADD_PRINCIPAL_REQUEST"
export const ADD_PRINCIPAL_SUCCESS = "ADD_PRINCIPAL_SUCCESS"
export const ADD_PRINCIPAL_FAILURE = "ADD_PRINCIPAL_FAILURE"

export const UPDATE_PRINCIPAL_REQUEST = "UPDATE_PRINCIPAL_REQUEST"
export const UPDATE_PRINCIPAL_SUCCESS = "UPDATE_PRINCIPAL_SUCCESS"
export const UPDATE_PRINCIPAL_FAILURE = "UPDATE_PRINCIPAL_FAILURE"

export const DELETE_PRINCIPAL_REQUEST = "DELETE_PRINCIPAL_REQUEST"
export const DELETE_PRINCIPAL_SUCCESS = "DELETE_PRINCIPAL_SUCCESS"
export const DELETE_PRINCIPAL_FAILURE = "DELETE_PRINCIPAL_FAILURE"

export const LIST_PRINCIPAL_REQUEST = "LIST_PRINCIPAL_REQUEST"
export const LIST_PRINCIPAL_SUCCESS = "LIST_PRINCIPAL_SUCCESS"
export const LIST_PRINCIPAL_FAILURE = "LIST_PRINCIPAL_FAILURE"

export const addPrincipalRequest = () => ({
	type: ADD_PRINCIPAL_REQUEST,
})

export const addPrincipalSuccess = (Principals: any) => ({
	type: ADD_PRINCIPAL_SUCCESS,
	payload: Principals,
})

export const addPrincipalFailure = (error: Error) => ({
	type: ADD_PRINCIPAL_FAILURE,
	payload: error,
})

export const fetchPrincipalRequest = () => ({
	type: FETCH_PRINCIPAL_REQUEST,
})

export const fetchPrincipalSuccess = (Principals: any) => ({
	type: FETCH_PRINCIPAL_SUCCESS,
	payload: Principals,
})

export const fetchPrincipalFailure = (error: Error) => ({
	type: FETCH_PRINCIPAL_FAILURE,
	payload: error,
})

export const listPrincipalRequest = () => ({
	type: LIST_PRINCIPAL_REQUEST,
})

export const listPrincipalSuccess = (Principals: any) => ({
	type: LIST_PRINCIPAL_SUCCESS,
	payload: Principals,
})

export const listPrincipalFailure = (error: Error) => ({
	type: LIST_PRINCIPAL_FAILURE,
	payload: error,
})

export const updatePrincipalRequest = (Principal: any) => ({
	type: UPDATE_PRINCIPAL_REQUEST,
	payload: Principal,
})

export const updatePrincipalSuccess = (Principal: any) => ({
	type: UPDATE_PRINCIPAL_SUCCESS,
	payload: Principal,
})

export const updatePrincipalFailure = (error: Error) => ({
	type: UPDATE_PRINCIPAL_FAILURE,
	payload: error,
})

export const deletePrincipalRequest = (Principal: any) => ({
	type: DELETE_PRINCIPAL_REQUEST,
	payload: Principal,
})

export const deletePrincipalSuccess = (Principal: any) => ({
	type: DELETE_PRINCIPAL_SUCCESS,
	payload: Principal,
})

export const deletePrincipalFailure = (error: Error) => ({
	type: DELETE_PRINCIPAL_FAILURE,
	payload: error,
})
