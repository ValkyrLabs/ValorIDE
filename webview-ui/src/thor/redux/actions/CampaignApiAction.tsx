// defines the Redux Actions for Campaign

// Campaign

export const FETCH_CAMPAIGN_REQUEST = "FETCH_CAMPAIGN_REQUEST";
export const FETCH_CAMPAIGN_SUCCESS = "FETCH_CAMPAIGN_SUCCESS";
export const FETCH_CAMPAIGN_FAILURE = "FETCH_CAMPAIGN_FAILURE";

export const ADD_CAMPAIGN_REQUEST = "ADD_CAMPAIGN_REQUEST";
export const ADD_CAMPAIGN_SUCCESS = "ADD_CAMPAIGN_SUCCESS";
export const ADD_CAMPAIGN_FAILURE = "ADD_CAMPAIGN_FAILURE";

export const UPDATE_CAMPAIGN_REQUEST = "UPDATE_CAMPAIGN_REQUEST";
export const UPDATE_CAMPAIGN_SUCCESS = "UPDATE_CAMPAIGN_SUCCESS";
export const UPDATE_CAMPAIGN_FAILURE = "UPDATE_CAMPAIGN_FAILURE";

export const DELETE_CAMPAIGN_REQUEST = "DELETE_CAMPAIGN_REQUEST";
export const DELETE_CAMPAIGN_SUCCESS = "DELETE_CAMPAIGN_SUCCESS";
export const DELETE_CAMPAIGN_FAILURE = "DELETE_CAMPAIGN_FAILURE";

export const LIST_CAMPAIGN_REQUEST = "LIST_CAMPAIGN_REQUEST";
export const LIST_CAMPAIGN_SUCCESS = "LIST_CAMPAIGN_SUCCESS";
export const LIST_CAMPAIGN_FAILURE = "LIST_CAMPAIGN_FAILURE";

export const addCampaignRequest = () => ({
  type: ADD_CAMPAIGN_REQUEST,
});

export const addCampaignSuccess = (Campaigns: any) => ({
  type: ADD_CAMPAIGN_SUCCESS,
  payload: Campaigns,
});

export const addCampaignFailure = (error: Error) => ({
  type: ADD_CAMPAIGN_FAILURE,
  payload: error,
});

export const fetchCampaignRequest = () => ({
  type: FETCH_CAMPAIGN_REQUEST,
});

export const fetchCampaignSuccess = (Campaigns: any) => ({
  type: FETCH_CAMPAIGN_SUCCESS,
  payload: Campaigns,
});

export const fetchCampaignFailure = (error: Error) => ({
  type: FETCH_CAMPAIGN_FAILURE,
  payload: error,
});

export const listCampaignRequest = () => ({
  type: LIST_CAMPAIGN_REQUEST,
});

export const listCampaignSuccess = (Campaigns: any) => ({
  type: LIST_CAMPAIGN_SUCCESS,
  payload: Campaigns,
});

export const listCampaignFailure = (error: Error) => ({
  type: LIST_CAMPAIGN_FAILURE,
  payload: error,
});

export const updateCampaignRequest = (Campaign: any) => ({
  type: UPDATE_CAMPAIGN_REQUEST,
  payload: Campaign,
});

export const updateCampaignSuccess = (Campaign: any) => ({
  type: UPDATE_CAMPAIGN_SUCCESS,
  payload: Campaign,
});

export const updateCampaignFailure = (error: Error) => ({
  type: UPDATE_CAMPAIGN_FAILURE,
  payload: error,
});

export const deleteCampaignRequest = (Campaign: any) => ({
  type: DELETE_CAMPAIGN_REQUEST,
  payload: Campaign,
});

export const deleteCampaignSuccess = (Campaign: any) => ({
  type: DELETE_CAMPAIGN_SUCCESS,
  payload: Campaign,
});

export const deleteCampaignFailure = (error: Error) => ({
  type: DELETE_CAMPAIGN_FAILURE,
  payload: error,
});
