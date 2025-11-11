import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";
export const VAIWorkflowEventService = createApi({
    reducerPath: "VAIWorkflowEventService",
    baseQuery: customBaseQuery,
    tagTypes: ["WorkflowEvent"],
    endpoints: (build) => ({
        publishWorkflowEvent: build.mutation({
            query: (body) => ({
                url: `/vaiworkflow/event`,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
            invalidatesTags: [],
        }),
    }),
});
export const { usePublishWorkflowEventMutation } = VAIWorkflowEventService;
//# sourceMappingURL=VAIWorkflowEventService.js.map