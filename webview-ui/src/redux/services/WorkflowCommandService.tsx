import { createApi } from "@reduxjs/toolkit/query/react";

import { Workflow } from "@thor/model"; // always use the generated when possible!

import customBaseQuery from "../../thor/redux/customBaseQuery"; // Import the custom base query

type WorkflowResponse = Workflow[];

export const WorkflowService = createApi({
  reducerPath: "Workflow", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Workflow"],
  endpoints: (build) => ({
    lazyGetWorkflows: build.query<
      WorkflowResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `Workflow?page=${page}&limit=${limit}`,
      providesTags: (result, page) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Workflow" as const, id })),
              { type: "Workflow", id: `PAGE_${page}` },
            ]
          : [],
    }),
    getWorkflows: build.query<WorkflowResponse, void>({
      query: () => "Workflow",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Workflow" as const, id })),
              { type: "Workflow", id: "LIST" },
            ]
          : [{ type: "Workflow", id: "LIST" }],
    }),
    addWorkflow: build.mutation<Workflow, Partial<Workflow>>({
      query: (body) => ({
        url: `Workflow`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Workflow", id: "LIST" }],
    }),
    getWorkflow: build.query<Workflow, string>({
      query: (id) => `Workflow/${id}`,
      providesTags: (result, error, id) => [{ type: "Workflow", id }],
    }),
    updateWorkflow: build.mutation<
      void,
      Pick<Workflow, "id"> & Partial<Workflow>
    >({
      query: ({ id, ...patch }) => ({
        url: `Workflow/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WorkflowService.util.updateQueryData("getWorkflow", id, (draft) => {
              Object.assign(draft, patch);
            }),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Workflow", id }],
    }),
    deleteWorkflow: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `Workflow/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Workflow", id }],
    }),

    // add commands!
    startWorkflow: build.mutation<{ success: boolean; id: string }, string>({
      query(id) {
        return {
          url: `vaiworkflow/start/${id}`,
          method: "GET",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Workflow", id }],
    }),
    stopWorkflow: build.mutation<{ success: boolean; id: string }, string>({
      query(id) {
        return {
          url: `vaiworkflow/stop/${id}`,
          method: "GET",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Workflow", id }],
    }),
    reloadWorkflow: build.mutation<{ success: boolean; id: string }, string>({
      query(id) {
        return {
          url: `vaiworkflow/loadSchedules`,
          method: "GET",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Workflow", id }],
    }),
    loadOas: build.mutation<{ success: boolean; id: string }, string>({
      query(id) {
        return {
          url: `vaiworkflow/loadSchedules`,
          method: "GET",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Workflow", id }],
    }),
  }),
});

export const {
  useLoadOasMutation,
  useReloadWorkflowMutation,
  useStartWorkflowMutation,
  useStopWorkflowMutation,

  useLazyGetWorkflowsQuery,
  useGetWorkflowQuery,
  useGetWorkflowsQuery,
  useAddWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
} = WorkflowService;
