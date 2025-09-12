// defines the Redux Actions for PaymentTransaction

// PaymentTransaction

export const FETCH_PAYMENTTRANSACTION_REQUEST = 'FETCH_PAYMENTTRANSACTION_REQUEST';
export const FETCH_PAYMENTTRANSACTION_SUCCESS = 'FETCH_PAYMENTTRANSACTION_SUCCESS';
export const FETCH_PAYMENTTRANSACTION_FAILURE = 'FETCH_PAYMENTTRANSACTION_FAILURE';

export const ADD_PAYMENTTRANSACTION_REQUEST = 'ADD_PAYMENTTRANSACTION_REQUEST';
export const ADD_PAYMENTTRANSACTION_SUCCESS = 'ADD_PAYMENTTRANSACTION_SUCCESS';
export const ADD_PAYMENTTRANSACTION_FAILURE = 'ADD_PAYMENTTRANSACTION_FAILURE';

export const UPDATE_PAYMENTTRANSACTION_REQUEST = 'UPDATE_PAYMENTTRANSACTION_REQUEST';
export const UPDATE_PAYMENTTRANSACTION_SUCCESS = 'UPDATE_PAYMENTTRANSACTION_SUCCESS';
export const UPDATE_PAYMENTTRANSACTION_FAILURE = 'UPDATE_PAYMENTTRANSACTION_FAILURE';

export const DELETE_PAYMENTTRANSACTION_REQUEST = 'DELETE_PAYMENTTRANSACTION_REQUEST';
export const DELETE_PAYMENTTRANSACTION_SUCCESS = 'DELETE_PAYMENTTRANSACTION_SUCCESS';
export const DELETE_PAYMENTTRANSACTION_FAILURE = 'DELETE_PAYMENTTRANSACTION_FAILURE';

export const LIST_PAYMENTTRANSACTION_REQUEST = 'LIST_PAYMENTTRANSACTION_REQUEST';
export const LIST_PAYMENTTRANSACTION_SUCCESS = 'LIST_PAYMENTTRANSACTION_SUCCESS';
export const LIST_PAYMENTTRANSACTION_FAILURE = 'LIST_PAYMENTTRANSACTION_FAILURE';

export const addPaymentTransactionRequest = () => ({
    type: ADD_PAYMENTTRANSACTION_REQUEST,
});

export const addPaymentTransactionSuccess = (PaymentTransactions: any) => ({
    type: ADD_PAYMENTTRANSACTION_SUCCESS,
    payload: PaymentTransactions,
});

export const addPaymentTransactionFailure = (error: Error) => ({
    type: ADD_PAYMENTTRANSACTION_FAILURE,
    payload: error,
});


export const fetchPaymentTransactionRequest = () => ({
    type: FETCH_PAYMENTTRANSACTION_REQUEST,
});

export const fetchPaymentTransactionSuccess = (PaymentTransactions: any) => ({
    type: FETCH_PAYMENTTRANSACTION_SUCCESS,
    payload: PaymentTransactions,
});

export const fetchPaymentTransactionFailure = (error: Error) => ({
    type: FETCH_PAYMENTTRANSACTION_FAILURE,
    payload: error,
});

export const listPaymentTransactionRequest = () => ({
    type: LIST_PAYMENTTRANSACTION_REQUEST,
});

export const listPaymentTransactionSuccess = (PaymentTransactions: any) => ({
    type: LIST_PAYMENTTRANSACTION_SUCCESS,
    payload: PaymentTransactions,
});

export const listPaymentTransactionFailure = (error: Error) => ({
    type: LIST_PAYMENTTRANSACTION_FAILURE,
    payload: error,
});

export const updatePaymentTransactionRequest = (PaymentTransaction: any) => ({
    type: UPDATE_PAYMENTTRANSACTION_REQUEST,
    payload: PaymentTransaction,
});

export const updatePaymentTransactionSuccess = (PaymentTransaction: any) => ({
    type: UPDATE_PAYMENTTRANSACTION_SUCCESS,
    payload: PaymentTransaction,
});

export const updatePaymentTransactionFailure = (error: Error) => ({
    type: UPDATE_PAYMENTTRANSACTION_FAILURE,
    payload: error,
});

export const deletePaymentTransactionRequest = (PaymentTransaction: any) => ({
    type: DELETE_PAYMENTTRANSACTION_REQUEST,
    payload: PaymentTransaction,
});

export const deletePaymentTransactionSuccess = (PaymentTransaction: any) => ({
    type: DELETE_PAYMENTTRANSACTION_SUCCESS,
    payload: PaymentTransaction,
});

export const deletePaymentTransactionFailure = (error: Error) => ({
    type: DELETE_PAYMENTTRANSACTION_FAILURE,
    payload: error,
});
