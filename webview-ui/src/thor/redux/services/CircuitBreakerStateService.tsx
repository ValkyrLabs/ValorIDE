import { createApi } from '@reduxjs/toolkit/query/react'
import { CircuitBreakerState } from '@thor/model/CircuitBreakerState'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type CircuitBreakerStateResponse = CircuitBreakerState[]

export const CircuitBreakerStateService = createApi({
  reducerPath: 'CircuitBreakerState', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['CircuitBreakerState'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getCircuitBreakerStatesPaged: build.query<CircuitBreakerStateResponse, { page: number; size?: number; example?: Partial<CircuitBreakerState> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `CircuitBreakerState?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'CircuitBreakerState' as const, id })),
              { type: 'CircuitBreakerState', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getCircuitBreakerStates: build.query<CircuitBreakerStateResponse, { example?: Partial<CircuitBreakerState> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `CircuitBreakerState?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `CircuitBreakerState`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'CircuitBreakerState' as const, id })),
              { type: 'CircuitBreakerState', id: 'LIST' },
            ]
          : [{ type: 'CircuitBreakerState', id: 'LIST' }],
    }),

    // 3) Create
    addCircuitBreakerState: build.mutation<CircuitBreakerState, Partial<CircuitBreakerState>>({
      query: (body) => ({
        url: `CircuitBreakerState`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'CircuitBreakerState', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getCircuitBreakerState: build.query<CircuitBreakerState, string>({
      query: (id) => `CircuitBreakerState/${id}`,
      providesTags: (result, error, id) => [{ type: 'CircuitBreakerState', id }],
    }),

    // 5) Update
    updateCircuitBreakerState: build.mutation<void, Pick<CircuitBreakerState, 'id'> & Partial<CircuitBreakerState>>({
      query: ({ id, ...patch }) => ({
        url: `CircuitBreakerState/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            CircuitBreakerStateService.util.updateQueryData('getCircuitBreakerState', id, (draft) => {
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
        { type: 'CircuitBreakerState', id },
        { type: 'CircuitBreakerState', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteCircuitBreakerState: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `CircuitBreakerState/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'CircuitBreakerState', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetCircuitBreakerStatesPagedQuery`
export const {
  useGetCircuitBreakerStatesPagedQuery,     // immediate fetch
  useLazyGetCircuitBreakerStatesPagedQuery, // lazy fetch
  useGetCircuitBreakerStateQuery,
  useGetCircuitBreakerStatesQuery,
  useAddCircuitBreakerStateMutation,
  useUpdateCircuitBreakerStateMutation,
  useDeleteCircuitBreakerStateMutation,
} = CircuitBreakerStateService
