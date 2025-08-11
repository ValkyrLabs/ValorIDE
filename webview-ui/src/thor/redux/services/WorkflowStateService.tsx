import { createApi } from "@reduxjs/toolkit/query/react";
import { WorkflowState } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type WorkflowStateResponse = WorkflowState[];

export const WorkflowStateService = createApi({
  reducerPath: "WorkflowState", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["WorkflowState"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getWorkflowStatesPaged: build.query<
      WorkflowStateResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `WorkflowState?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "WorkflowState" as const,
                id,
              })),
              { type: "WorkflowState", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getWorkflowStates: build.query<WorkflowStateResponse, void>({
      query: () => `WorkflowState`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "WorkflowState" as const,
                id,
              })),
              { type: "WorkflowState", id: "LIST" },
            ]
          : [{ type: "WorkflowState", id: "LIST" }],
    }),

    // 3) Create
    addWorkflowState: build.mutation<WorkflowState, Partial<WorkflowState>>({
      query: (body) => ({
        url: `WorkflowState`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "WorkflowState", id: "LIST" }],
    }),

    // 4) Get single by ID
    getWorkflowState: build.query<WorkflowState, string>({
      query: (id) => `WorkflowState/${id}`,
      providesTags: (result, error, id) => [{ type: "WorkflowState", id }],
    }),

    // 5) Update
    updateWorkflowState: build.mutation<
      void,
      Pick<WorkflowState, "id"> & Partial<WorkflowState>
    >({
      query: ({ id, ...patch }) => ({
        url: `WorkflowState/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WorkflowStateService.util.updateQueryData(
              "getWorkflowState",
              id,
              (draft) => {
                Object.assign(draft, patch);
              },
            ),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "WorkflowState", id },
      ],
    }),

    // 6) Delete
    deleteWorkflowState: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `WorkflowState/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "WorkflowState", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetWorkflowStatesPagedQuery`
export const {
  useGetWorkflowStatesPagedQuery, // immediate fetch
  useLazyGetWorkflowStatesPagedQuery, // lazy fetch
  useGetWorkflowStateQuery,
  useGetWorkflowStatesQuery,
  useAddWorkflowStateMutation,
  useUpdateWorkflowStateMutation,
  useDeleteWorkflowStateMutation,
} = WorkflowStateService;
