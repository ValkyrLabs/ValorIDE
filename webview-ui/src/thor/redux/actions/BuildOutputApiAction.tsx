// defines the Redux Actions for BuildOutput

// BuildOutput

export const FETCH_BUILDOUTPUT_REQUEST = 'FETCH_BUILDOUTPUT_REQUEST';
export const FETCH_BUILDOUTPUT_SUCCESS = 'FETCH_BUILDOUTPUT_SUCCESS';
export const FETCH_BUILDOUTPUT_FAILURE = 'FETCH_BUILDOUTPUT_FAILURE';

export const ADD_BUILDOUTPUT_REQUEST = 'ADD_BUILDOUTPUT_REQUEST';
export const ADD_BUILDOUTPUT_SUCCESS = 'ADD_BUILDOUTPUT_SUCCESS';
export const ADD_BUILDOUTPUT_FAILURE = 'ADD_BUILDOUTPUT_FAILURE';

export const UPDATE_BUILDOUTPUT_REQUEST = 'UPDATE_BUILDOUTPUT_REQUEST';
export const UPDATE_BUILDOUTPUT_SUCCESS = 'UPDATE_BUILDOUTPUT_SUCCESS';
export const UPDATE_BUILDOUTPUT_FAILURE = 'UPDATE_BUILDOUTPUT_FAILURE';

export const DELETE_BUILDOUTPUT_REQUEST = 'DELETE_BUILDOUTPUT_REQUEST';
export const DELETE_BUILDOUTPUT_SUCCESS = 'DELETE_BUILDOUTPUT_SUCCESS';
export const DELETE_BUILDOUTPUT_FAILURE = 'DELETE_BUILDOUTPUT_FAILURE';

export const LIST_BUILDOUTPUT_REQUEST = 'LIST_BUILDOUTPUT_REQUEST';
export const LIST_BUILDOUTPUT_SUCCESS = 'LIST_BUILDOUTPUT_SUCCESS';
export const LIST_BUILDOUTPUT_FAILURE = 'LIST_BUILDOUTPUT_FAILURE';

export const addBuildOutputRequest = () => ({
    type: ADD_BUILDOUTPUT_REQUEST,
});

export const addBuildOutputSuccess = (BuildOutputs: any) => ({
    type: ADD_BUILDOUTPUT_SUCCESS,
    payload: BuildOutputs,
});

export const addBuildOutputFailure = (error: Error) => ({
    type: ADD_BUILDOUTPUT_FAILURE,
    payload: error,
});


export const fetchBuildOutputRequest = () => ({
    type: FETCH_BUILDOUTPUT_REQUEST,
});

export const fetchBuildOutputSuccess = (BuildOutputs: any) => ({
    type: FETCH_BUILDOUTPUT_SUCCESS,
    payload: BuildOutputs,
});

export const fetchBuildOutputFailure = (error: Error) => ({
    type: FETCH_BUILDOUTPUT_FAILURE,
    payload: error,
});

export const listBuildOutputRequest = () => ({
    type: LIST_BUILDOUTPUT_REQUEST,
});

export const listBuildOutputSuccess = (BuildOutputs: any) => ({
    type: LIST_BUILDOUTPUT_SUCCESS,
    payload: BuildOutputs,
});

export const listBuildOutputFailure = (error: Error) => ({
    type: LIST_BUILDOUTPUT_FAILURE,
    payload: error,
});

export const updateBuildOutputRequest = (BuildOutput: any) => ({
    type: UPDATE_BUILDOUTPUT_REQUEST,
    payload: BuildOutput,
});

export const updateBuildOutputSuccess = (BuildOutput: any) => ({
    type: UPDATE_BUILDOUTPUT_SUCCESS,
    payload: BuildOutput,
});

export const updateBuildOutputFailure = (error: Error) => ({
    type: UPDATE_BUILDOUTPUT_FAILURE,
    payload: error,
});

export const deleteBuildOutputRequest = (BuildOutput: any) => ({
    type: DELETE_BUILDOUTPUT_REQUEST,
    payload: BuildOutput,
});

export const deleteBuildOutputSuccess = (BuildOutput: any) => ({
    type: DELETE_BUILDOUTPUT_SUCCESS,
    payload: BuildOutput,
});

export const deleteBuildOutputFailure = (error: Error) => ({
    type: DELETE_BUILDOUTPUT_FAILURE,
    payload: error,
});
