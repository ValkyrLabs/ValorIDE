import { createApi } from '@reduxjs/toolkit/query/react'
import { McpTool } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpToolResponse = McpTool[]

export const McpToolService = createApi({
  reducerPath: 'McpTool', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['McpTool'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getMcpToolsPaged: build.query<McpToolResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `McpTool?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpTool' as const, id })),
              { type: 'McpTool', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpTools: build.query<McpToolResponse, void>({
      query: () => `McpTool`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpTool' as const, id })),
              { type: 'McpTool', id: 'LIST' },
            ]
          : [{ type: 'McpTool', id: 'LIST' }],
    }),

    // 3) Create
    addMcpTool: build.mutation<McpTool, Partial<McpTool>>({
      query: (body) => ({
        url: `McpTool`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'McpTool', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcpTool: build.query<McpTool, string>({
      query: (id) => `McpTool/${id}`,
      providesTags: (result, error, id) => [{ type: 'McpTool', id }],
    }),

    // 5) Update
    updateMcpTool: build.mutation<void, Pick<McpTool, 'id'> & Partial<McpTool>>({
      query: ({ id, ...patch }) => ({
        url: `McpTool/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpToolService.util.updateQueryData('getMcpTool', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'McpTool', id }],
    }),

    // 6) Delete
    deleteMcpTool: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `McpTool/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'McpTool', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpToolsPagedQuery`
export const {
  useGetMcpToolsPagedQuery,     // immediate fetch
  useLazyGetMcpToolsPagedQuery, // lazy fetch
  useGetMcpToolQuery,
  useGetMcpToolsQuery,
  useAddMcpToolMutation,
  useUpdateMcpToolMutation,
  useDeleteMcpToolMutation,
} = McpToolService