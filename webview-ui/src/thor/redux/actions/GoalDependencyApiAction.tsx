// defines the Redux Actions for GoalDependency

// GoalDependency

export const FETCH_GOALDEPENDENCY_REQUEST = "FETCH_GOALDEPENDENCY_REQUEST"
export const FETCH_GOALDEPENDENCY_SUCCESS = "FETCH_GOALDEPENDENCY_SUCCESS"
export const FETCH_GOALDEPENDENCY_FAILURE = "FETCH_GOALDEPENDENCY_FAILURE"

export const ADD_GOALDEPENDENCY_REQUEST = "ADD_GOALDEPENDENCY_REQUEST"
export const ADD_GOALDEPENDENCY_SUCCESS = "ADD_GOALDEPENDENCY_SUCCESS"
export const ADD_GOALDEPENDENCY_FAILURE = "ADD_GOALDEPENDENCY_FAILURE"

export const UPDATE_GOALDEPENDENCY_REQUEST = "UPDATE_GOALDEPENDENCY_REQUEST"
export const UPDATE_GOALDEPENDENCY_SUCCESS = "UPDATE_GOALDEPENDENCY_SUCCESS"
export const UPDATE_GOALDEPENDENCY_FAILURE = "UPDATE_GOALDEPENDENCY_FAILURE"

export const DELETE_GOALDEPENDENCY_REQUEST = "DELETE_GOALDEPENDENCY_REQUEST"
export const DELETE_GOALDEPENDENCY_SUCCESS = "DELETE_GOALDEPENDENCY_SUCCESS"
export const DELETE_GOALDEPENDENCY_FAILURE = "DELETE_GOALDEPENDENCY_FAILURE"

export const LIST_GOALDEPENDENCY_REQUEST = "LIST_GOALDEPENDENCY_REQUEST"
export const LIST_GOALDEPENDENCY_SUCCESS = "LIST_GOALDEPENDENCY_SUCCESS"
export const LIST_GOALDEPENDENCY_FAILURE = "LIST_GOALDEPENDENCY_FAILURE"

export const addGoalDependencyRequest = () => ({
	type: ADD_GOALDEPENDENCY_REQUEST,
})

export const addGoalDependencySuccess = (GoalDependencys: any) => ({
	type: ADD_GOALDEPENDENCY_SUCCESS,
	payload: GoalDependencys,
})

export const addGoalDependencyFailure = (error: Error) => ({
	type: ADD_GOALDEPENDENCY_FAILURE,
	payload: error,
})

export const fetchGoalDependencyRequest = () => ({
	type: FETCH_GOALDEPENDENCY_REQUEST,
})

export const fetchGoalDependencySuccess = (GoalDependencys: any) => ({
	type: FETCH_GOALDEPENDENCY_SUCCESS,
	payload: GoalDependencys,
})

export const fetchGoalDependencyFailure = (error: Error) => ({
	type: FETCH_GOALDEPENDENCY_FAILURE,
	payload: error,
})

export const listGoalDependencyRequest = () => ({
	type: LIST_GOALDEPENDENCY_REQUEST,
})

export const listGoalDependencySuccess = (GoalDependencys: any) => ({
	type: LIST_GOALDEPENDENCY_SUCCESS,
	payload: GoalDependencys,
})

export const listGoalDependencyFailure = (error: Error) => ({
	type: LIST_GOALDEPENDENCY_FAILURE,
	payload: error,
})

export const updateGoalDependencyRequest = (GoalDependency: any) => ({
	type: UPDATE_GOALDEPENDENCY_REQUEST,
	payload: GoalDependency,
})

export const updateGoalDependencySuccess = (GoalDependency: any) => ({
	type: UPDATE_GOALDEPENDENCY_SUCCESS,
	payload: GoalDependency,
})

export const updateGoalDependencyFailure = (error: Error) => ({
	type: UPDATE_GOALDEPENDENCY_FAILURE,
	payload: error,
})

export const deleteGoalDependencyRequest = (GoalDependency: any) => ({
	type: DELETE_GOALDEPENDENCY_REQUEST,
	payload: GoalDependency,
})

export const deleteGoalDependencySuccess = (GoalDependency: any) => ({
	type: DELETE_GOALDEPENDENCY_SUCCESS,
	payload: GoalDependency,
})

export const deleteGoalDependencyFailure = (error: Error) => ({
	type: DELETE_GOALDEPENDENCY_FAILURE,
	payload: error,
})
