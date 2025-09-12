import { createApi } from '@reduxjs/toolkit/query/react'
import { Goal } from '@thor/model/Goal'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type GoalResponse = Goal[]

export const GoalService = createApi({
  reducerPath: 'Goal', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Goal'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getGoalsPaged: build.query<GoalResponse, { page: number; size?: number; example?: Partial<Goal> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Goal?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Goal' as const, id })),
              { type: 'Goal', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getGoals: build.query<GoalResponse, { example?: Partial<Goal> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Goal?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Goal`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Goal' as const, id })),
              { type: 'Goal', id: 'LIST' },
            ]
          : [{ type: 'Goal', id: 'LIST' }],
    }),

    // 3) Create
    addGoal: build.mutation<Goal, Partial<Goal>>({
      query: (body) => ({
        url: `Goal`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Goal', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getGoal: build.query<Goal, string>({
      query: (id) => `Goal/${id}`,
      providesTags: (result, error, id) => [{ type: 'Goal', id }],
    }),

    // 5) Update
    updateGoal: build.mutation<void, Pick<Goal, 'id'> & Partial<Goal>>({
      query: ({ id, ...patch }) => ({
        url: `Goal/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            GoalService.util.updateQueryData('getGoal', id, (draft) => {
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
        { type: 'Goal', id },
        { type: 'Goal', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteGoal: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Goal/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Goal', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetGoalsPagedQuery`
export const {
  useGetGoalsPagedQuery,     // immediate fetch
  useLazyGetGoalsPagedQuery, // lazy fetch
  useGetGoalQuery,
  useGetGoalsQuery,
  useAddGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
} = GoalService
