// defines the Redux Actions for ChatCompletionResponse

// ChatCompletionResponse

export const FETCH_CHATCOMPLETIONRESPONSE_REQUEST = "FETCH_CHATCOMPLETIONRESPONSE_REQUEST"
export const FETCH_CHATCOMPLETIONRESPONSE_SUCCESS = "FETCH_CHATCOMPLETIONRESPONSE_SUCCESS"
export const FETCH_CHATCOMPLETIONRESPONSE_FAILURE = "FETCH_CHATCOMPLETIONRESPONSE_FAILURE"

export const ADD_CHATCOMPLETIONRESPONSE_REQUEST = "ADD_CHATCOMPLETIONRESPONSE_REQUEST"
export const ADD_CHATCOMPLETIONRESPONSE_SUCCESS = "ADD_CHATCOMPLETIONRESPONSE_SUCCESS"
export const ADD_CHATCOMPLETIONRESPONSE_FAILURE = "ADD_CHATCOMPLETIONRESPONSE_FAILURE"

export const UPDATE_CHATCOMPLETIONRESPONSE_REQUEST = "UPDATE_CHATCOMPLETIONRESPONSE_REQUEST"
export const UPDATE_CHATCOMPLETIONRESPONSE_SUCCESS = "UPDATE_CHATCOMPLETIONRESPONSE_SUCCESS"
export const UPDATE_CHATCOMPLETIONRESPONSE_FAILURE = "UPDATE_CHATCOMPLETIONRESPONSE_FAILURE"

export const DELETE_CHATCOMPLETIONRESPONSE_REQUEST = "DELETE_CHATCOMPLETIONRESPONSE_REQUEST"
export const DELETE_CHATCOMPLETIONRESPONSE_SUCCESS = "DELETE_CHATCOMPLETIONRESPONSE_SUCCESS"
export const DELETE_CHATCOMPLETIONRESPONSE_FAILURE = "DELETE_CHATCOMPLETIONRESPONSE_FAILURE"

export const LIST_CHATCOMPLETIONRESPONSE_REQUEST = "LIST_CHATCOMPLETIONRESPONSE_REQUEST"
export const LIST_CHATCOMPLETIONRESPONSE_SUCCESS = "LIST_CHATCOMPLETIONRESPONSE_SUCCESS"
export const LIST_CHATCOMPLETIONRESPONSE_FAILURE = "LIST_CHATCOMPLETIONRESPONSE_FAILURE"

export const addChatCompletionResponseRequest = () => ({
	type: ADD_CHATCOMPLETIONRESPONSE_REQUEST,
})

export const addChatCompletionResponseSuccess = (ChatCompletionResponses: any) => ({
	type: ADD_CHATCOMPLETIONRESPONSE_SUCCESS,
	payload: ChatCompletionResponses,
})

export const addChatCompletionResponseFailure = (error: Error) => ({
	type: ADD_CHATCOMPLETIONRESPONSE_FAILURE,
	payload: error,
})

export const fetchChatCompletionResponseRequest = () => ({
	type: FETCH_CHATCOMPLETIONRESPONSE_REQUEST,
})

export const fetchChatCompletionResponseSuccess = (ChatCompletionResponses: any) => ({
	type: FETCH_CHATCOMPLETIONRESPONSE_SUCCESS,
	payload: ChatCompletionResponses,
})

export const fetchChatCompletionResponseFailure = (error: Error) => ({
	type: FETCH_CHATCOMPLETIONRESPONSE_FAILURE,
	payload: error,
})

export const listChatCompletionResponseRequest = () => ({
	type: LIST_CHATCOMPLETIONRESPONSE_REQUEST,
})

export const listChatCompletionResponseSuccess = (ChatCompletionResponses: any) => ({
	type: LIST_CHATCOMPLETIONRESPONSE_SUCCESS,
	payload: ChatCompletionResponses,
})

export const listChatCompletionResponseFailure = (error: Error) => ({
	type: LIST_CHATCOMPLETIONRESPONSE_FAILURE,
	payload: error,
})

export const updateChatCompletionResponseRequest = (ChatCompletionResponse: any) => ({
	type: UPDATE_CHATCOMPLETIONRESPONSE_REQUEST,
	payload: ChatCompletionResponse,
})

export const updateChatCompletionResponseSuccess = (ChatCompletionResponse: any) => ({
	type: UPDATE_CHATCOMPLETIONRESPONSE_SUCCESS,
	payload: ChatCompletionResponse,
})

export const updateChatCompletionResponseFailure = (error: Error) => ({
	type: UPDATE_CHATCOMPLETIONRESPONSE_FAILURE,
	payload: error,
})

export const deleteChatCompletionResponseRequest = (ChatCompletionResponse: any) => ({
	type: DELETE_CHATCOMPLETIONRESPONSE_REQUEST,
	payload: ChatCompletionResponse,
})

export const deleteChatCompletionResponseSuccess = (ChatCompletionResponse: any) => ({
	type: DELETE_CHATCOMPLETIONRESPONSE_SUCCESS,
	payload: ChatCompletionResponse,
})

export const deleteChatCompletionResponseFailure = (error: Error) => ({
	type: DELETE_CHATCOMPLETIONRESPONSE_FAILURE,
	payload: error,
})
