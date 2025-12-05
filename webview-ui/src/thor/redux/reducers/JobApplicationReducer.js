import { createSlice } from "@reduxjs/toolkit";
const JobApplicationSlice = createSlice({
    name: "JobApplications",
    initialState: [],
    reducers: {
        JobApplicationAdded(state, action) {
            state.push(action.payload);
        },
        JobApplicationValueToggled(state, action) {
            console.log("JobApplication TOGGLE");
            console.warn(JSON.stringify(action));
            const JobApplication = state.find((JobApplication) => JobApplication.id === action.payload.JobApplicationId);
            if (JobApplication) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        JobApplicationpropertySet(state, action) {
            const JobApplication = state.find((JobApplication) => JobApplication.id === action.payload.JobApplicationId);
            if (JobApplication) {
                //  JobApplication[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { JobApplicationAdded, JobApplicationValueToggled, JobApplicationpropertySet, } = JobApplicationSlice.actions;
export default JobApplicationSlice.reducer;
//# sourceMappingURL=JobApplicationReducer.js.map