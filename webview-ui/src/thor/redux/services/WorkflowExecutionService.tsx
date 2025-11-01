import { createApi } from '@reduxjs/toolkit/query/react'
import { WorkflowExecution } from '@thor/model/WorkflowExecution'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type WorkflowExecutionResponse = WorkflowExecution[]

export const WorkflowExecutionService = createApi({
  reducerPath: 'WorkflowExecution', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['WorkflowExecution'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getWorkflowExecutionsPaged: build.query<WorkflowExecutionResponse, { page: number; size?: number; example?: Partial<WorkflowExecution> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `WorkflowExecution?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WorkflowExecution' as const, id })),
              { type: 'WorkflowExecution', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getWorkflowExecutions: build.query<WorkflowExecutionResponse, { example?: Partial<WorkflowExecution> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `WorkflowExecution?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `WorkflowExecution`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WorkflowExecution' as const, id })),
              { type: 'WorkflowExecution', id: 'LIST' },
            ]
          : [{ type: 'WorkflowExecution', id: 'LIST' }],
    }),

    // 3) Create
    addWorkflowExecution: build.mutation<WorkflowExecution, Partial<WorkflowExecution>>({
      query: (body) => ({
        url: `WorkflowExecution`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'WorkflowExecution', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getWorkflowExecution: build.query<WorkflowExecution, string>({
      query: (id) => `WorkflowExecution/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkflowExecution', id }],
    }),

    // 5) Update
    updateWorkflowExecution: build.mutation<void, Pick<WorkflowExecution, 'id'> & Partial<WorkflowExecution>>({
      query: ({ id, ...patch }) => ({
        url: `WorkflowExecution/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WorkflowExecutionService.util.updateQueryData('getWorkflowExecution', id, (draft) => {
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
        { type: 'WorkflowExecution', id },
        { type: 'WorkflowExecution', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteWorkflowExecution: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `WorkflowExecution/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'WorkflowExecution', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetWorkflowExecutionsPagedQuery`
export const {
  useGetWorkflowExecutionsPagedQuery,     // immediate fetch
  useLazyGetWorkflowExecutionsPagedQuery, // lazy fetch
  useGetWorkflowExecutionQuery,
  useGetWorkflowExecutionsQuery,
  useAddWorkflowExecutionMutation,
  useUpdateWorkflowExecutionMutation,
  useDeleteWorkflowExecutionMutation,
} = WorkflowExecutionService
