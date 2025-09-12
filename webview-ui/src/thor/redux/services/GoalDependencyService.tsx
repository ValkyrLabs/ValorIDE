import { createApi } from '@reduxjs/toolkit/query/react'
import { GoalDependency } from '@thor/model/GoalDependency'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type GoalDependencyResponse = GoalDependency[]

export const GoalDependencyService = createApi({
  reducerPath: 'GoalDependency', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['GoalDependency'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getGoalDependencysPaged: build.query<GoalDependencyResponse, { page: number; size?: number; example?: Partial<GoalDependency> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `GoalDependency?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'GoalDependency' as const, id })),
              { type: 'GoalDependency', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getGoalDependencys: build.query<GoalDependencyResponse, { example?: Partial<GoalDependency> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `GoalDependency?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `GoalDependency`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'GoalDependency' as const, id })),
              { type: 'GoalDependency', id: 'LIST' },
            ]
          : [{ type: 'GoalDependency', id: 'LIST' }],
    }),

    // 3) Create
    addGoalDependency: build.mutation<GoalDependency, Partial<GoalDependency>>({
      query: (body) => ({
        url: `GoalDependency`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'GoalDependency', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getGoalDependency: build.query<GoalDependency, string>({
      query: (id) => `GoalDependency/${id}`,
      providesTags: (result, error, id) => [{ type: 'GoalDependency', id }],
    }),

    // 5) Update
    updateGoalDependency: build.mutation<void, Pick<GoalDependency, 'id'> & Partial<GoalDependency>>({
      query: ({ id, ...patch }) => ({
        url: `GoalDependency/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            GoalDependencyService.util.updateQueryData('getGoalDependency', id, (draft) => {
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
        { type: 'GoalDependency', id },
        { type: 'GoalDependency', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteGoalDependency: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `GoalDependency/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'GoalDependency', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetGoalDependencysPagedQuery`
export const {
  useGetGoalDependencysPagedQuery,     // immediate fetch
  useLazyGetGoalDependencysPagedQuery, // lazy fetch
  useGetGoalDependencyQuery,
  useGetGoalDependencysQuery,
  useAddGoalDependencyMutation,
  useUpdateGoalDependencyMutation,
  useDeleteGoalDependencyMutation,
} = GoalDependencyService
