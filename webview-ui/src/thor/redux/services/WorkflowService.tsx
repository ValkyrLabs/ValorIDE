import { createApi } from '@reduxjs/toolkit/query/react'
import { Workflow } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type WorkflowResponse = Workflow[]

export const WorkflowService = createApi({
  reducerPath: 'Workflow', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Workflow'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getWorkflowsPaged: build.query<WorkflowResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Workflow?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Workflow' as const, id })),
              { type: 'Workflow', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getWorkflows: build.query<WorkflowResponse, void>({
      query: () => `Workflow`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Workflow' as const, id })),
              { type: 'Workflow', id: 'LIST' },
            ]
          : [{ type: 'Workflow', id: 'LIST' }],
    }),

    // 3) Create
    addWorkflow: build.mutation<Workflow, Partial<Workflow>>({
      query: (body) => ({
        url: `Workflow`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Workflow', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getWorkflow: build.query<Workflow, string>({
      query: (id) => `Workflow/${id}`,
      providesTags: (result, error, id) => [{ type: 'Workflow', id }],
    }),

    // 5) Update
    updateWorkflow: build.mutation<void, Pick<Workflow, 'id'> & Partial<Workflow>>({
      query: ({ id, ...patch }) => ({
        url: `Workflow/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WorkflowService.util.updateQueryData('getWorkflow', id, (draft) => {
              Object.assign(draft, patch)
            })
          )
          try {
            await queryFulfilled
          } catch {
            patchResult.undo()
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Workflow', id }],
    }),

    // 6) Delete
    deleteWorkflow: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Workflow/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Workflow', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetWorkflowsPagedQuery`
export const {
  useGetWorkflowsPagedQuery,     // immediate fetch
  useLazyGetWorkflowsPagedQuery, // lazy fetch
  useGetWorkflowQuery,
  useGetWorkflowsQuery,
  useAddWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
} = WorkflowService