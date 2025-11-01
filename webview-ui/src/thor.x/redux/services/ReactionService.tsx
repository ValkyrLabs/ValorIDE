import { createApi } from '@reduxjs/toolkit/query/react'
import { Reaction } from '@thor/model/Reaction'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ReactionResponse = Reaction[]

export const ReactionService = createApi({
  reducerPath: 'Reaction', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Reaction'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getReactionsPaged: build.query<ReactionResponse, { page: number; size?: number; example?: Partial<Reaction> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Reaction?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Reaction' as const, id })),
              { type: 'Reaction', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getReactions: build.query<ReactionResponse, { example?: Partial<Reaction> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Reaction?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Reaction`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Reaction' as const, id })),
              { type: 'Reaction', id: 'LIST' },
            ]
          : [{ type: 'Reaction', id: 'LIST' }],
    }),

    // 3) Create
    addReaction: build.mutation<Reaction, Partial<Reaction>>({
      query: (body) => ({
        url: `Reaction`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Reaction', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getReaction: build.query<Reaction, string>({
      query: (id) => `Reaction/${id}`,
      providesTags: (result, error, id) => [{ type: 'Reaction', id }],
    }),

    // 5) Update
    updateReaction: build.mutation<void, Pick<Reaction, 'id'> & Partial<Reaction>>({
      query: ({ id, ...patch }) => ({
        url: `Reaction/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ReactionService.util.updateQueryData('getReaction', id, (draft) => {
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
        { type: 'Reaction', id },
        { type: 'Reaction', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteReaction: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Reaction/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Reaction', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetReactionsPagedQuery`
export const {
  useGetReactionsPagedQuery,     // immediate fetch
  useLazyGetReactionsPagedQuery, // lazy fetch
  useGetReactionQuery,
  useGetReactionsQuery,
  useAddReactionMutation,
  useUpdateReactionMutation,
  useDeleteReactionMutation,
} = ReactionService
