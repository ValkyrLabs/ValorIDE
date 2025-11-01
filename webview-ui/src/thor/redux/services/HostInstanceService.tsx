import { createApi } from '@reduxjs/toolkit/query/react'
import { HostInstance } from '@thor/model/HostInstance'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type HostInstanceResponse = HostInstance[]

export const HostInstanceService = createApi({
  reducerPath: 'HostInstance', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['HostInstance'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getHostInstancesPaged: build.query<HostInstanceResponse, { page: number; size?: number; example?: Partial<HostInstance> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `HostInstance?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'HostInstance' as const, id })),
              { type: 'HostInstance', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getHostInstances: build.query<HostInstanceResponse, { example?: Partial<HostInstance> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `HostInstance?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `HostInstance`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'HostInstance' as const, id })),
              { type: 'HostInstance', id: 'LIST' },
            ]
          : [{ type: 'HostInstance', id: 'LIST' }],
    }),

    // 3) Create
    addHostInstance: build.mutation<HostInstance, Partial<HostInstance>>({
      query: (body) => ({
        url: `HostInstance`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'HostInstance', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getHostInstance: build.query<HostInstance, string>({
      query: (id) => `HostInstance/${id}`,
      providesTags: (result, error, id) => [{ type: 'HostInstance', id }],
    }),

    // 5) Update
    updateHostInstance: build.mutation<void, Pick<HostInstance, 'id'> & Partial<HostInstance>>({
      query: ({ id, ...patch }) => ({
        url: `HostInstance/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            HostInstanceService.util.updateQueryData('getHostInstance', id, (draft) => {
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
        { type: 'HostInstance', id },
        { type: 'HostInstance', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteHostInstance: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `HostInstance/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'HostInstance', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetHostInstancesPagedQuery`
export const {
  useGetHostInstancesPagedQuery,     // immediate fetch
  useLazyGetHostInstancesPagedQuery, // lazy fetch
  useGetHostInstanceQuery,
  useGetHostInstancesQuery,
  useAddHostInstanceMutation,
  useUpdateHostInstanceMutation,
  useDeleteHostInstanceMutation,
} = HostInstanceService
