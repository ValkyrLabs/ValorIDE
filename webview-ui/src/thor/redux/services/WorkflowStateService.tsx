import { createApi } from '@reduxjs/toolkit/query/react'
import { WorkflowState } from '@thor/model/WorkflowState'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type WorkflowStateResponse = WorkflowState[]

export const WorkflowStateService = createApi({
  reducerPath: 'WorkflowState', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['WorkflowState'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getWorkflowStatesPaged: build.query<WorkflowStateResponse, { page: number; size?: number; example?: Partial<WorkflowState> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `WorkflowState?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WorkflowState' as const, id })),
              { type: 'WorkflowState', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getWorkflowStates: build.query<WorkflowStateResponse, { example?: Partial<WorkflowState> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `WorkflowState?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `WorkflowState`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WorkflowState' as const, id })),
              { type: 'WorkflowState', id: 'LIST' },
            ]
          : [{ type: 'WorkflowState', id: 'LIST' }],
    }),

    // 3) Create
    addWorkflowState: build.mutation<WorkflowState, Partial<WorkflowState>>({
      query: (body) => ({
        url: `WorkflowState`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'WorkflowState', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getWorkflowState: build.query<WorkflowState, string>({
      query: (id) => `WorkflowState/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkflowState', id }],
    }),

    // 5) Update
    updateWorkflowState: build.mutation<void, Pick<WorkflowState, 'id'> & Partial<WorkflowState>>({
      query: ({ id, ...patch }) => ({
        url: `WorkflowState/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WorkflowStateService.util.updateQueryData('getWorkflowState', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkflowState', id },
        { type: 'WorkflowState', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteWorkflowState: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `WorkflowState/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'WorkflowState', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetWorkflowStatesPagedQuery`
export const {
  useGetWorkflowStatesPagedQuery,     // immediate fetch
  useLazyGetWorkflowStatesPagedQuery, // lazy fetch
  useGetWorkflowStateQuery,
  useGetWorkflowStatesQuery,
  useAddWorkflowStateMutation,
  useUpdateWorkflowStateMutation,
  useDeleteWorkflowStateMutation,
} = WorkflowStateService
