import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";

export type WorkflowEvent = { type: string; payload?: Record<string, any> };

export const VAIWorkflowEventService = createApi({
  reducerPath: "VAIWorkflowEventService",
  baseQuery: customBaseQuery,
  tagTypes: ["WorkflowEvent"],
  endpoints: (build) => ({
    publishWorkflowEvent: build.mutation<
      { status?: string } | string,
      WorkflowEvent
    >({
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
