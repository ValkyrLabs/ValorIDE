// defines the Redux Actions for UserPreference

// UserPreference

export const FETCH_USERPREFERENCE_REQUEST = 'FETCH_USERPREFERENCE_REQUEST';
export const FETCH_USERPREFERENCE_SUCCESS = 'FETCH_USERPREFERENCE_SUCCESS';
export const FETCH_USERPREFERENCE_FAILURE = 'FETCH_USERPREFERENCE_FAILURE';

export const ADD_USERPREFERENCE_REQUEST = 'ADD_USERPREFERENCE_REQUEST';
export const ADD_USERPREFERENCE_SUCCESS = 'ADD_USERPREFERENCE_SUCCESS';
export const ADD_USERPREFERENCE_FAILURE = 'ADD_USERPREFERENCE_FAILURE';

export const UPDATE_USERPREFERENCE_REQUEST = 'UPDATE_USERPREFERENCE_REQUEST';
export const UPDATE_USERPREFERENCE_SUCCESS = 'UPDATE_USERPREFERENCE_SUCCESS';
export const UPDATE_USERPREFERENCE_FAILURE = 'UPDATE_USERPREFERENCE_FAILURE';

export const DELETE_USERPREFERENCE_REQUEST = 'DELETE_USERPREFERENCE_REQUEST';
export const DELETE_USERPREFERENCE_SUCCESS = 'DELETE_USERPREFERENCE_SUCCESS';
export const DELETE_USERPREFERENCE_FAILURE = 'DELETE_USERPREFERENCE_FAILURE';

export const LIST_USERPREFERENCE_REQUEST = 'LIST_USERPREFERENCE_REQUEST';
export const LIST_USERPREFERENCE_SUCCESS = 'LIST_USERPREFERENCE_SUCCESS';
export const LIST_USERPREFERENCE_FAILURE = 'LIST_USERPREFERENCE_FAILURE';

export const addUserPreferenceRequest = () => ({
    type: ADD_USERPREFERENCE_REQUEST,
});

export const addUserPreferenceSuccess = (UserPreferences: any) => ({
    type: ADD_USERPREFERENCE_SUCCESS,
    payload: UserPreferences,
});

export const addUserPreferenceFailure = (error: Error) => ({
    type: ADD_USERPREFERENCE_FAILURE,
    payload: error,
});


export const fetchUserPreferenceRequest = () => ({
    type: FETCH_USERPREFERENCE_REQUEST,
});

export const fetchUserPreferenceSuccess = (UserPreferences: any) => ({
    type: FETCH_USERPREFERENCE_SUCCESS,
    payload: UserPreferences,
});

export const fetchUserPreferenceFailure = (error: Error) => ({
    type: FETCH_USERPREFERENCE_FAILURE,
    payload: error,
});

export const listUserPreferenceRequest = () => ({
    type: LIST_USERPREFERENCE_REQUEST,
});

export const listUserPreferenceSuccess = (UserPreferences: any) => ({
    type: LIST_USERPREFERENCE_SUCCESS,
    payload: UserPreferences,
});

export const listUserPreferenceFailure = (error: Error) => ({
    type: LIST_USERPREFERENCE_FAILURE,
    payload: error,
});

export const updateUserPreferenceRequest = (UserPreference: any) => ({
    type: UPDATE_USERPREFERENCE_REQUEST,
    payload: UserPreference,
});

export const updateUserPreferenceSuccess = (UserPreference: any) => ({
    type: UPDATE_USERPREFERENCE_SUCCESS,
    payload: UserPreference,
});

export const updateUserPreferenceFailure = (error: Error) => ({
    type: UPDATE_USERPREFERENCE_FAILURE,
    payload: error,
});

export const deleteUserPreferenceRequest = (UserPreference: any) => ({
    type: DELETE_USERPREFERENCE_REQUEST,
    payload: UserPreference,
});

export const deleteUserPreferenceSuccess = (UserPreference: any) => ({
    type: DELETE_USERPREFERENCE_SUCCESS,
    payload: UserPreference,
});

export const deleteUserPreferenceFailure = (error: Error) => ({
    type: DELETE_USERPREFERENCE_FAILURE,
    payload: error,
});
