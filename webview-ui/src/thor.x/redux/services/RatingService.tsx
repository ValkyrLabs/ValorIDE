import { createApi } from '@reduxjs/toolkit/query/react'
import { Rating } from '@thor/model/Rating'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type RatingResponse = Rating[]

export const RatingService = createApi({
  reducerPath: 'Rating', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Rating'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getRatingsPaged: build.query<RatingResponse, { page: number; size?: number; example?: Partial<Rating> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Rating?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Rating' as const, id })),
              { type: 'Rating', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getRatings: build.query<RatingResponse, { example?: Partial<Rating> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Rating?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Rating`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Rating' as const, id })),
              { type: 'Rating', id: 'LIST' },
            ]
          : [{ type: 'Rating', id: 'LIST' }],
    }),

    // 3) Create
    addRating: build.mutation<Rating, Partial<Rating>>({
      query: (body) => ({
        url: `Rating`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Rating', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getRating: build.query<Rating, string>({
      query: (id) => `Rating/${id}`,
      providesTags: (result, error, id) => [{ type: 'Rating', id }],
    }),

    // 5) Update
    updateRating: build.mutation<void, Pick<Rating, 'id'> & Partial<Rating>>({
      query: ({ id, ...patch }) => ({
        url: `Rating/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            RatingService.util.updateQueryData('getRating', id, (draft) => {
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
        { type: 'Rating', id },
        { type: 'Rating', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteRating: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Rating/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Rating', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetRatingsPagedQuery`
export const {
  useGetRatingsPagedQuery,     // immediate fetch
  useLazyGetRatingsPagedQuery, // lazy fetch
  useGetRatingQuery,
  useGetRatingsQuery,
  useAddRatingMutation,
  useUpdateRatingMutation,
  useDeleteRatingMutation,
} = RatingService
