// defines the Redux Actions for SalesPipeline

// SalesPipeline

export const FETCH_SALESPIPELINE_REQUEST = 'FETCH_SALESPIPELINE_REQUEST';
export const FETCH_SALESPIPELINE_SUCCESS = 'FETCH_SALESPIPELINE_SUCCESS';
export const FETCH_SALESPIPELINE_FAILURE = 'FETCH_SALESPIPELINE_FAILURE';

export const ADD_SALESPIPELINE_REQUEST = 'ADD_SALESPIPELINE_REQUEST';
export const ADD_SALESPIPELINE_SUCCESS = 'ADD_SALESPIPELINE_SUCCESS';
export const ADD_SALESPIPELINE_FAILURE = 'ADD_SALESPIPELINE_FAILURE';

export const UPDATE_SALESPIPELINE_REQUEST = 'UPDATE_SALESPIPELINE_REQUEST';
export const UPDATE_SALESPIPELINE_SUCCESS = 'UPDATE_SALESPIPELINE_SUCCESS';
export const UPDATE_SALESPIPELINE_FAILURE = 'UPDATE_SALESPIPELINE_FAILURE';

export const DELETE_SALESPIPELINE_REQUEST = 'DELETE_SALESPIPELINE_REQUEST';
export const DELETE_SALESPIPELINE_SUCCESS = 'DELETE_SALESPIPELINE_SUCCESS';
export const DELETE_SALESPIPELINE_FAILURE = 'DELETE_SALESPIPELINE_FAILURE';

export const LIST_SALESPIPELINE_REQUEST = 'LIST_SALESPIPELINE_REQUEST';
export const LIST_SALESPIPELINE_SUCCESS = 'LIST_SALESPIPELINE_SUCCESS';
export const LIST_SALESPIPELINE_FAILURE = 'LIST_SALESPIPELINE_FAILURE';

export const addSalesPipelineRequest = () => ({
    type: ADD_SALESPIPELINE_REQUEST,
});

export const addSalesPipelineSuccess = (SalesPipelines: any) => ({
    type: ADD_SALESPIPELINE_SUCCESS,
    payload: SalesPipelines,
});

export const addSalesPipelineFailure = (error: Error) => ({
    type: ADD_SALESPIPELINE_FAILURE,
    payload: error,
});


export const fetchSalesPipelineRequest = () => ({
    type: FETCH_SALESPIPELINE_REQUEST,
});

export const fetchSalesPipelineSuccess = (SalesPipelines: any) => ({
    type: FETCH_SALESPIPELINE_SUCCESS,
    payload: SalesPipelines,
});

export const fetchSalesPipelineFailure = (error: Error) => ({
    type: FETCH_SALESPIPELINE_FAILURE,
    payload: error,
});

export const listSalesPipelineRequest = () => ({
    type: LIST_SALESPIPELINE_REQUEST,
});

export const listSalesPipelineSuccess = (SalesPipelines: any) => ({
    type: LIST_SALESPIPELINE_SUCCESS,
    payload: SalesPipelines,
});

export const listSalesPipelineFailure = (error: Error) => ({
    type: LIST_SALESPIPELINE_FAILURE,
    payload: error,
});

export const updateSalesPipelineRequest = (SalesPipeline: any) => ({
    type: UPDATE_SALESPIPELINE_REQUEST,
    payload: SalesPipeline,
});

export const updateSalesPipelineSuccess = (SalesPipeline: any) => ({
    type: UPDATE_SALESPIPELINE_SUCCESS,
    payload: SalesPipeline,
});

export const updateSalesPipelineFailure = (error: Error) => ({
    type: UPDATE_SALESPIPELINE_FAILURE,
    payload: error,
});

export const deleteSalesPipelineRequest = (SalesPipeline: any) => ({
    type: DELETE_SALESPIPELINE_REQUEST,
    payload: SalesPipeline,
});

export const deleteSalesPipelineSuccess = (SalesPipeline: any) => ({
    type: DELETE_SALESPIPELINE_SUCCESS,
    payload: SalesPipeline,
});

export const deleteSalesPipelineFailure = (error: Error) => ({
    type: DELETE_SALESPIPELINE_FAILURE,
    payload: error,
});
