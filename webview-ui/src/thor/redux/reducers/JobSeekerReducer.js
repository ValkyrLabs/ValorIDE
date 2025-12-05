import { createSlice } from "@reduxjs/toolkit";
const JobSeekerSlice = createSlice({
    name: "JobSeekers",
    initialState: [],
    reducers: {
        JobSeekerAdded(state, action) {
            state.push(action.payload);
        },
        JobSeekerValueToggled(state, action) {
            console.log("JobSeeker TOGGLE");
            console.warn(JSON.stringify(action));
            const JobSeeker = state.find((JobSeeker) => JobSeeker.id === action.payload.JobSeekerId);
            if (JobSeeker) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        JobSeekerpropertySet(state, action) {
            const JobSeeker = state.find((JobSeeker) => JobSeeker.id === action.payload.JobSeekerId);
            if (JobSeeker) {
                //  JobSeeker[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { JobSeekerAdded, JobSeekerValueToggled, JobSeekerpropertySet } = JobSeekerSlice.actions;
export default JobSeekerSlice.reducer;
//# sourceMappingURL=JobSeekerReducer.js.map