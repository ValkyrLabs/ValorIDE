import { createApi } from '@reduxjs/toolkit/query/react'
import { Solution } from '@thor/model/Solution'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SolutionResponse = Solution[]

export const SolutionService = createApi({
  reducerPath: 'Solution', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Solution'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSolutionsPaged: build.query<SolutionResponse, { page: number; size?: number; example?: Partial<Solution> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Solution?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Solution' as const, id })),
              { type: 'Solution', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSolutions: build.query<SolutionResponse, { example?: Partial<Solution> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Solution?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Solution`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Solution' as const, id })),
              { type: 'Solution', id: 'LIST' },
            ]
          : [{ type: 'Solution', id: 'LIST' }],
    }),

    // 3) Create
    addSolution: build.mutation<Solution, Partial<Solution>>({
      query: (body) => ({
        url: `Solution`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Solution', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSolution: build.query<Solution, string>({
      query: (id) => `Solution/${id}`,
      providesTags: (result, error, id) => [{ type: 'Solution', id }],
    }),

    // 5) Update
    updateSolution: build.mutation<void, Pick<Solution, 'id'> & Partial<Solution>>({
      query: ({ id, ...patch }) => ({
        url: `Solution/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SolutionService.util.updateQueryData('getSolution', id, (draft) => {
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
        { type: 'Solution', id },
        { type: 'Solution', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSolution: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Solution/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Solution', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSolutionsPagedQuery`
export const {
  useGetSolutionsPagedQuery,     // immediate fetch
  useLazyGetSolutionsPagedQuery, // lazy fetch
  useGetSolutionQuery,
  useGetSolutionsQuery,
  useAddSolutionMutation,
  useUpdateSolutionMutation,
  useDeleteSolutionMutation,
} = SolutionService
