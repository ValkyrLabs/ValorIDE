import { createApi } from '@reduxjs/toolkit/query/react'
import { ChannelSubscription } from '@thor/model/ChannelSubscription'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ChannelSubscriptionResponse = ChannelSubscription[]

export const ChannelSubscriptionService = createApi({
  reducerPath: 'ChannelSubscription', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ChannelSubscription'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getChannelSubscriptionsPaged: build.query<ChannelSubscriptionResponse, { page: number; size?: number; example?: Partial<ChannelSubscription> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ChannelSubscription?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChannelSubscription' as const, id })),
              { type: 'ChannelSubscription', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getChannelSubscriptions: build.query<ChannelSubscriptionResponse, { example?: Partial<ChannelSubscription> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ChannelSubscription?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ChannelSubscription`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChannelSubscription' as const, id })),
              { type: 'ChannelSubscription', id: 'LIST' },
            ]
          : [{ type: 'ChannelSubscription', id: 'LIST' }],
    }),

    // 3) Create
    addChannelSubscription: build.mutation<ChannelSubscription, Partial<ChannelSubscription>>({
      query: (body) => ({
        url: `ChannelSubscription`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ChannelSubscription', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getChannelSubscription: build.query<ChannelSubscription, string>({
      query: (id) => `ChannelSubscription/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChannelSubscription', id }],
    }),

    // 5) Update
    updateChannelSubscription: build.mutation<void, Pick<ChannelSubscription, 'id'> & Partial<ChannelSubscription>>({
      query: ({ id, ...patch }) => ({
        url: `ChannelSubscription/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ChannelSubscriptionService.util.updateQueryData('getChannelSubscription', id, (draft) => {
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
        { type: 'ChannelSubscription', id },
        { type: 'ChannelSubscription', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteChannelSubscription: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ChannelSubscription/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ChannelSubscription', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetChannelSubscriptionsPagedQuery`
export const {
  useGetChannelSubscriptionsPagedQuery,     // immediate fetch
  useLazyGetChannelSubscriptionsPagedQuery, // lazy fetch
  useGetChannelSubscriptionQuery,
  useGetChannelSubscriptionsQuery,
  useAddChannelSubscriptionMutation,
  useUpdateChannelSubscriptionMutation,
  useDeleteChannelSubscriptionMutation,
} = ChannelSubscriptionService
