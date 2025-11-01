import { createApi } from '@reduxjs/toolkit/query/react'
import { Principal } from '@thor/model/Principal'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type PrincipalResponse = Principal[]

export const PrincipalService = createApi({
  reducerPath: 'Principal', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Principal'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPrincipalsPaged: build.query<PrincipalResponse, { page: number; size?: number; example?: Partial<Principal> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Principal?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Principal' as const, id })),
              { type: 'Principal', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPrincipals: build.query<PrincipalResponse, { example?: Partial<Principal> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Principal?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Principal`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Principal' as const, id })),
              { type: 'Principal', id: 'LIST' },
            ]
          : [{ type: 'Principal', id: 'LIST' }],
    }),

    // 3) Create
    addPrincipal: build.mutation<Principal, Partial<Principal>>({
      query: (body) => ({
        url: `Principal`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Principal', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getPrincipal: build.query<Principal, string>({
      query: (id) => `Principal/${id}`,
      providesTags: (result, error, id) => [{ type: 'Principal', id }],
    }),

    // 5) Update
    updatePrincipal: build.mutation<void, Pick<Principal, 'id'> & Partial<Principal>>({
      query: ({ id, ...patch }) => ({
        url: `Principal/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PrincipalService.util.updateQueryData('getPrincipal', id, (draft) => {
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
        { type: 'Principal', id },
        { type: 'Principal', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deletePrincipal: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Principal/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Principal', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetPrincipalsPagedQuery`
export const {
  useGetPrincipalsPagedQuery,     // immediate fetch
  useLazyGetPrincipalsPagedQuery, // lazy fetch
  useGetPrincipalQuery,
  useGetPrincipalsQuery,
  useAddPrincipalMutation,
  useUpdatePrincipalMutation,
  useDeletePrincipalMutation,
} = PrincipalService
