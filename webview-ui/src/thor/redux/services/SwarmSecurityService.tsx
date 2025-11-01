import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmSecurity } from '@thor/model/SwarmSecurity'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmSecurityResponse = SwarmSecurity[]

export const SwarmSecurityService = createApi({
  reducerPath: 'SwarmSecurity', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmSecurity'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmSecuritysPaged: build.query<SwarmSecurityResponse, { page: number; size?: number; example?: Partial<SwarmSecurity> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmSecurity?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmSecurity' as const, id })),
              { type: 'SwarmSecurity', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmSecuritys: build.query<SwarmSecurityResponse, { example?: Partial<SwarmSecurity> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmSecurity?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmSecurity`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmSecurity' as const, id })),
              { type: 'SwarmSecurity', id: 'LIST' },
            ]
          : [{ type: 'SwarmSecurity', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmSecurity: build.mutation<SwarmSecurity, Partial<SwarmSecurity>>({
      query: (body) => ({
        url: `SwarmSecurity`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmSecurity', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmSecurity: build.query<SwarmSecurity, string>({
      query: (id) => `SwarmSecurity/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmSecurity', id }],
    }),

    // 5) Update
    updateSwarmSecurity: build.mutation<void, Pick<SwarmSecurity, 'id'> & Partial<SwarmSecurity>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmSecurity/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmSecurityService.util.updateQueryData('getSwarmSecurity', id, (draft) => {
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
        { type: 'SwarmSecurity', id },
        { type: 'SwarmSecurity', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmSecurity: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmSecurity/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmSecurity', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmSecuritysPagedQuery`
export const {
  useGetSwarmSecuritysPagedQuery,     // immediate fetch
  useLazyGetSwarmSecuritysPagedQuery, // lazy fetch
  useGetSwarmSecurityQuery,
  useGetSwarmSecuritysQuery,
  useAddSwarmSecurityMutation,
  useUpdateSwarmSecurityMutation,
  useDeleteSwarmSecurityMutation,
} = SwarmSecurityService
