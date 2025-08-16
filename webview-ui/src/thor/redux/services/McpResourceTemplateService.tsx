import { createApi } from '@reduxjs/toolkit/query/react'
import { McpResourceTemplate } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpResourceTemplateResponse = McpResourceTemplate[]

export const McpResourceTemplateService = createApi({
  reducerPath: 'McpResourceTemplate', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['McpResourceTemplate'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getMcpResourceTemplatesPaged: build.query<McpResourceTemplateResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `McpResourceTemplate?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpResourceTemplate' as const, id })),
              { type: 'McpResourceTemplate', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpResourceTemplates: build.query<McpResourceTemplateResponse, void>({
      query: () => `McpResourceTemplate`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpResourceTemplate' as const, id })),
              { type: 'McpResourceTemplate', id: 'LIST' },
            ]
          : [{ type: 'McpResourceTemplate', id: 'LIST' }],
    }),

    // 3) Create
    addMcpResourceTemplate: build.mutation<McpResourceTemplate, Partial<McpResourceTemplate>>({
      query: (body) => ({
        url: `McpResourceTemplate`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'McpResourceTemplate', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcpResourceTemplate: build.query<McpResourceTemplate, string>({
      query: (id) => `McpResourceTemplate/${id}`,
      providesTags: (result, error, id) => [{ type: 'McpResourceTemplate', id }],
    }),

    // 5) Update
    updateMcpResourceTemplate: build.mutation<void, Pick<McpResourceTemplate, 'id'> & Partial<McpResourceTemplate>>({
      query: ({ id, ...patch }) => ({
        url: `McpResourceTemplate/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpResourceTemplateService.util.updateQueryData('getMcpResourceTemplate', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'McpResourceTemplate', id }],
    }),

    // 6) Delete
    deleteMcpResourceTemplate: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `McpResourceTemplate/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'McpResourceTemplate', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpResourceTemplatesPagedQuery`
export const {
  useGetMcpResourceTemplatesPagedQuery,     // immediate fetch
  useLazyGetMcpResourceTemplatesPagedQuery, // lazy fetch
  useGetMcpResourceTemplateQuery,
  useGetMcpResourceTemplatesQuery,
  useAddMcpResourceTemplateMutation,
  useUpdateMcpResourceTemplateMutation,
  useDeleteMcpResourceTemplateMutation,
} = McpResourceTemplateService