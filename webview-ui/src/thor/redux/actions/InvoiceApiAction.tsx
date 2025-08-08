// defines the Redux Actions for Invoice

// Invoice

export const FETCH_INVOICE_REQUEST = "FETCH_INVOICE_REQUEST"
export const FETCH_INVOICE_SUCCESS = "FETCH_INVOICE_SUCCESS"
export const FETCH_INVOICE_FAILURE = "FETCH_INVOICE_FAILURE"

export const ADD_INVOICE_REQUEST = "ADD_INVOICE_REQUEST"
export const ADD_INVOICE_SUCCESS = "ADD_INVOICE_SUCCESS"
export const ADD_INVOICE_FAILURE = "ADD_INVOICE_FAILURE"

export const UPDATE_INVOICE_REQUEST = "UPDATE_INVOICE_REQUEST"
export const UPDATE_INVOICE_SUCCESS = "UPDATE_INVOICE_SUCCESS"
export const UPDATE_INVOICE_FAILURE = "UPDATE_INVOICE_FAILURE"

export const DELETE_INVOICE_REQUEST = "DELETE_INVOICE_REQUEST"
export const DELETE_INVOICE_SUCCESS = "DELETE_INVOICE_SUCCESS"
export const DELETE_INVOICE_FAILURE = "DELETE_INVOICE_FAILURE"

export const LIST_INVOICE_REQUEST = "LIST_INVOICE_REQUEST"
export const LIST_INVOICE_SUCCESS = "LIST_INVOICE_SUCCESS"
export const LIST_INVOICE_FAILURE = "LIST_INVOICE_FAILURE"

export const addInvoiceRequest = () => ({
	type: ADD_INVOICE_REQUEST,
})

export const addInvoiceSuccess = (Invoices: any) => ({
	type: ADD_INVOICE_SUCCESS,
	payload: Invoices,
})

export const addInvoiceFailure = (error: Error) => ({
	type: ADD_INVOICE_FAILURE,
	payload: error,
})

export const fetchInvoiceRequest = () => ({
	type: FETCH_INVOICE_REQUEST,
})

export const fetchInvoiceSuccess = (Invoices: any) => ({
	type: FETCH_INVOICE_SUCCESS,
	payload: Invoices,
})

export const fetchInvoiceFailure = (error: Error) => ({
	type: FETCH_INVOICE_FAILURE,
	payload: error,
})

export const listInvoiceRequest = () => ({
	type: LIST_INVOICE_REQUEST,
})

export const listInvoiceSuccess = (Invoices: any) => ({
	type: LIST_INVOICE_SUCCESS,
	payload: Invoices,
})

export const listInvoiceFailure = (error: Error) => ({
	type: LIST_INVOICE_FAILURE,
	payload: error,
})

export const updateInvoiceRequest = (Invoice: any) => ({
	type: UPDATE_INVOICE_REQUEST,
	payload: Invoice,
})

export const updateInvoiceSuccess = (Invoice: any) => ({
	type: UPDATE_INVOICE_SUCCESS,
	payload: Invoice,
})

export const updateInvoiceFailure = (error: Error) => ({
	type: UPDATE_INVOICE_FAILURE,
	payload: error,
})

export const deleteInvoiceRequest = (Invoice: any) => ({
	type: DELETE_INVOICE_REQUEST,
	payload: Invoice,
})

export const deleteInvoiceSuccess = (Invoice: any) => ({
	type: DELETE_INVOICE_SUCCESS,
	payload: Invoice,
})

export const deleteInvoiceFailure = (error: Error) => ({
	type: DELETE_INVOICE_FAILURE,
	payload: error,
})
