import { createSlice } from "@reduxjs/toolkit";
const TaskSlice = createSlice({
    name: "Tasks",
    initialState: [],
    reducers: {
        TaskAdded(state, action) {
            state.push(action.payload);
        },
        TaskValueToggled(state, action) {
            console.log("Task TOGGLE");
            console.warn(JSON.stringify(action));
            const Task = state.find((Task) => Task.id === action.payload.TaskId);
            if (Task) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        TaskpropertySet(state, action) {
            const Task = state.find((Task) => Task.id === action.payload.TaskId);
            if (Task) {
                //  Task[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { TaskAdded, TaskValueToggled, TaskpropertySet } = TaskSlice.actions;
export default TaskSlice.reducer;
//# sourceMappingURL=TaskReducer.js.map