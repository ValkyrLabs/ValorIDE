// defines the Redux Actions for Logout

// Logout

export const FETCH_LOGOUT_REQUEST = "FETCH_LOGOUT_REQUEST"
export const FETCH_LOGOUT_SUCCESS = "FETCH_LOGOUT_SUCCESS"
export const FETCH_LOGOUT_FAILURE = "FETCH_LOGOUT_FAILURE"

export const ADD_LOGOUT_REQUEST = "ADD_LOGOUT_REQUEST"
export const ADD_LOGOUT_SUCCESS = "ADD_LOGOUT_SUCCESS"
export const ADD_LOGOUT_FAILURE = "ADD_LOGOUT_FAILURE"

export const UPDATE_LOGOUT_REQUEST = "UPDATE_LOGOUT_REQUEST"
export const UPDATE_LOGOUT_SUCCESS = "UPDATE_LOGOUT_SUCCESS"
export const UPDATE_LOGOUT_FAILURE = "UPDATE_LOGOUT_FAILURE"

export const DELETE_LOGOUT_REQUEST = "DELETE_LOGOUT_REQUEST"
export const DELETE_LOGOUT_SUCCESS = "DELETE_LOGOUT_SUCCESS"
export const DELETE_LOGOUT_FAILURE = "DELETE_LOGOUT_FAILURE"

export const LIST_LOGOUT_REQUEST = "LIST_LOGOUT_REQUEST"
export const LIST_LOGOUT_SUCCESS = "LIST_LOGOUT_SUCCESS"
export const LIST_LOGOUT_FAILURE = "LIST_LOGOUT_FAILURE"

export const addLogoutRequest = () => ({
	type: ADD_LOGOUT_REQUEST,
})

export const addLogoutSuccess = (Logouts) => ({
	type: ADD_LOGOUT_SUCCESS,
	payload: Logouts,
})

export const addLogoutFailure = (error) => ({
	type: ADD_LOGOUT_FAILURE,
	payload: error,
})

export const fetchLogoutRequest = () => ({
	type: FETCH_LOGOUT_REQUEST,
})

export const fetchLogoutSuccess = (Logouts) => ({
	type: FETCH_LOGOUT_SUCCESS,
	payload: Logouts,
})

export const fetchLogoutFailure = (error) => ({
	type: FETCH_LOGOUT_FAILURE,
	payload: error,
})

export const listLogoutRequest = () => ({
	type: LIST_LOGOUT_REQUEST,
})

export const listLogoutSuccess = (Logouts) => ({
	type: LIST_LOGOUT_SUCCESS,
	payload: Logouts,
})

export const listLogoutFailure = (error) => ({
	type: LIST_LOGOUT_FAILURE,
	payload: error,
})

export const updateLogoutRequest = (Logout) => ({
	type: UPDATE_LOGOUT_REQUEST,
	payload: Logout,
})

export const updateLogoutSuccess = (Logout) => ({
	type: UPDATE_LOGOUT_SUCCESS,
	payload: Logout,
})

export const updateLogoutFailure = (error) => ({
	type: UPDATE_LOGOUT_FAILURE,
	payload: error,
})

export const deleteLogoutRequest = (Logout) => ({
	type: DELETE_LOGOUT_REQUEST,
	payload: Logout,
})

export const deleteLogoutSuccess = (Logout) => ({
	type: DELETE_LOGOUT_SUCCESS,
	payload: Logout,
})

export const deleteLogoutFailure = (error) => ({
	type: DELETE_LOGOUT_FAILURE,
	payload: error,
})
