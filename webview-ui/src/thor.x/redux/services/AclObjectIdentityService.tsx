import { createApi } from '@reduxjs/toolkit/query/react'
import { AclObjectIdentity } from '@thor/model/AclObjectIdentity'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type AclObjectIdentityResponse = AclObjectIdentity[]

export const AclObjectIdentityService = createApi({
  reducerPath: 'AclObjectIdentity', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['AclObjectIdentity'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAclObjectIdentitysPaged: build.query<AclObjectIdentityResponse, { page: number; size?: number; example?: Partial<AclObjectIdentity> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `AclObjectIdentity?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AclObjectIdentity' as const, id })),
              { type: 'AclObjectIdentity', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAclObjectIdentitys: build.query<AclObjectIdentityResponse, { example?: Partial<AclObjectIdentity> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `AclObjectIdentity?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `AclObjectIdentity`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AclObjectIdentity' as const, id })),
              { type: 'AclObjectIdentity', id: 'LIST' },
            ]
          : [{ type: 'AclObjectIdentity', id: 'LIST' }],
    }),

    // 3) Create
    addAclObjectIdentity: build.mutation<AclObjectIdentity, Partial<AclObjectIdentity>>({
      query: (body) => ({
        url: `AclObjectIdentity`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AclObjectIdentity', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getAclObjectIdentity: build.query<AclObjectIdentity, string>({
      query: (id) => `AclObjectIdentity/${id}`,
      providesTags: (result, error, id) => [{ type: 'AclObjectIdentity', id }],
    }),

    // 5) Update
    updateAclObjectIdentity: build.mutation<void, Pick<AclObjectIdentity, 'id'> & Partial<AclObjectIdentity>>({
      query: ({ id, ...patch }) => ({
        url: `AclObjectIdentity/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AclObjectIdentityService.util.updateQueryData('getAclObjectIdentity', id, (draft) => {
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
        { type: 'AclObjectIdentity', id },
        { type: 'AclObjectIdentity', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteAclObjectIdentity: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `AclObjectIdentity/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'AclObjectIdentity', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetAclObjectIdentitysPagedQuery`
export const {
  useGetAclObjectIdentitysPagedQuery,     // immediate fetch
  useLazyGetAclObjectIdentitysPagedQuery, // lazy fetch
  useGetAclObjectIdentityQuery,
  useGetAclObjectIdentitysQuery,
  useAddAclObjectIdentityMutation,
  useUpdateAclObjectIdentityMutation,
  useDeleteAclObjectIdentityMutation,
} = AclObjectIdentityService
