import { createApi } from '@reduxjs/toolkit/query/react'
import { McpToolPreset } from '@thor/model/McpToolPreset'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpToolPresetResponse = McpToolPreset[]

export const McpToolPresetService = createApi({
  reducerPath: 'McpToolPreset', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['McpToolPreset'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMcpToolPresetsPaged: build.query<McpToolPresetResponse, { page: number; size?: number; example?: Partial<McpToolPreset> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `McpToolPreset?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpToolPreset' as const, id })),
              { type: 'McpToolPreset', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpToolPresets: build.query<McpToolPresetResponse, { example?: Partial<McpToolPreset> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `McpToolPreset?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `McpToolPreset`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpToolPreset' as const, id })),
              { type: 'McpToolPreset', id: 'LIST' },
            ]
          : [{ type: 'McpToolPreset', id: 'LIST' }],
    }),

    // 3) Create
    addMcpToolPreset: build.mutation<McpToolPreset, Partial<McpToolPreset>>({
      query: (body) => ({
        url: `McpToolPreset`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'McpToolPreset', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcpToolPreset: build.query<McpToolPreset, string>({
      query: (id) => `McpToolPreset/${id}`,
      providesTags: (result, error, id) => [{ type: 'McpToolPreset', id }],
    }),

    // 5) Update
    updateMcpToolPreset: build.mutation<void, Pick<McpToolPreset, 'id'> & Partial<McpToolPreset>>({
      query: ({ id, ...patch }) => ({
        url: `McpToolPreset/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpToolPresetService.util.updateQueryData('getMcpToolPreset', id, (draft) => {
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
        { type: 'McpToolPreset', id },
        { type: 'McpToolPreset', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteMcpToolPreset: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `McpToolPreset/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'McpToolPreset', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpToolPresetsPagedQuery`
export const {
  useGetMcpToolPresetsPagedQuery,     // immediate fetch
  useLazyGetMcpToolPresetsPagedQuery, // lazy fetch
  useGetMcpToolPresetQuery,
  useGetMcpToolPresetsQuery,
  useAddMcpToolPresetMutation,
  useUpdateMcpToolPresetMutation,
  useDeleteMcpToolPresetMutation,
} = McpToolPresetService
