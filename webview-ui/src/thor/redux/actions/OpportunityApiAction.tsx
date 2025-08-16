// defines the Redux Actions for Opportunity

// Opportunity

export const FETCH_OPPORTUNITY_REQUEST = 'FETCH_OPPORTUNITY_REQUEST';
export const FETCH_OPPORTUNITY_SUCCESS = 'FETCH_OPPORTUNITY_SUCCESS';
export const FETCH_OPPORTUNITY_FAILURE = 'FETCH_OPPORTUNITY_FAILURE';

export const ADD_OPPORTUNITY_REQUEST = 'ADD_OPPORTUNITY_REQUEST';
export const ADD_OPPORTUNITY_SUCCESS = 'ADD_OPPORTUNITY_SUCCESS';
export const ADD_OPPORTUNITY_FAILURE = 'ADD_OPPORTUNITY_FAILURE';

export const UPDATE_OPPORTUNITY_REQUEST = 'UPDATE_OPPORTUNITY_REQUEST';
export const UPDATE_OPPORTUNITY_SUCCESS = 'UPDATE_OPPORTUNITY_SUCCESS';
export const UPDATE_OPPORTUNITY_FAILURE = 'UPDATE_OPPORTUNITY_FAILURE';

export const DELETE_OPPORTUNITY_REQUEST = 'DELETE_OPPORTUNITY_REQUEST';
export const DELETE_OPPORTUNITY_SUCCESS = 'DELETE_OPPORTUNITY_SUCCESS';
export const DELETE_OPPORTUNITY_FAILURE = 'DELETE_OPPORTUNITY_FAILURE';

export const LIST_OPPORTUNITY_REQUEST = 'LIST_OPPORTUNITY_REQUEST';
export const LIST_OPPORTUNITY_SUCCESS = 'LIST_OPPORTUNITY_SUCCESS';
export const LIST_OPPORTUNITY_FAILURE = 'LIST_OPPORTUNITY_FAILURE';

export const addOpportunityRequest = () => ({
    type: ADD_OPPORTUNITY_REQUEST,
});

export const addOpportunitySuccess = (Opportunitys: any) => ({
    type: ADD_OPPORTUNITY_SUCCESS,
    payload: Opportunitys,
});

export const addOpportunityFailure = (error: Error) => ({
    type: ADD_OPPORTUNITY_FAILURE,
    payload: error,
});


export const fetchOpportunityRequest = () => ({
    type: FETCH_OPPORTUNITY_REQUEST,
});

export const fetchOpportunitySuccess = (Opportunitys: any) => ({
    type: FETCH_OPPORTUNITY_SUCCESS,
    payload: Opportunitys,
});

export const fetchOpportunityFailure = (error: Error) => ({
    type: FETCH_OPPORTUNITY_FAILURE,
    payload: error,
});

export const listOpportunityRequest = () => ({
    type: LIST_OPPORTUNITY_REQUEST,
});

export const listOpportunitySuccess = (Opportunitys: any) => ({
    type: LIST_OPPORTUNITY_SUCCESS,
    payload: Opportunitys,
});

export const listOpportunityFailure = (error: Error) => ({
    type: LIST_OPPORTUNITY_FAILURE,
    payload: error,
});

export const updateOpportunityRequest = (Opportunity: any) => ({
    type: UPDATE_OPPORTUNITY_REQUEST,
    payload: Opportunity,
});

export const updateOpportunitySuccess = (Opportunity: any) => ({
    type: UPDATE_OPPORTUNITY_SUCCESS,
    payload: Opportunity,
});

export const updateOpportunityFailure = (error: Error) => ({
    type: UPDATE_OPPORTUNITY_FAILURE,
    payload: error,
});

export const deleteOpportunityRequest = (Opportunity: any) => ({
    type: DELETE_OPPORTUNITY_REQUEST,
    payload: Opportunity,
});

export const deleteOpportunitySuccess = (Opportunity: any) => ({
    type: DELETE_OPPORTUNITY_SUCCESS,
    payload: Opportunity,
});

export const deleteOpportunityFailure = (error: Error) => ({
    type: DELETE_OPPORTUNITY_FAILURE,
    payload: error,
});
