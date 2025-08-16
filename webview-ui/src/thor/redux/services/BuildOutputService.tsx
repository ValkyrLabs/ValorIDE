import { createApi } from '@reduxjs/toolkit/query/react'
import { BuildOutput } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type BuildOutputResponse = BuildOutput[]

export const BuildOutputService = createApi({
  reducerPath: 'BuildOutput', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['BuildOutput'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getBuildOutputsPaged: build.query<BuildOutputResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `BuildOutput?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BuildOutput' as const, id })),
              { type: 'BuildOutput', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getBuildOutputs: build.query<BuildOutputResponse, void>({
      query: () => `BuildOutput`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BuildOutput' as const, id })),
              { type: 'BuildOutput', id: 'LIST' },
            ]
          : [{ type: 'BuildOutput', id: 'LIST' }],
    }),

    // 3) Create
    addBuildOutput: build.mutation<BuildOutput, Partial<BuildOutput>>({
      query: (body) => ({
        url: `BuildOutput`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'BuildOutput', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getBuildOutput: build.query<BuildOutput, string>({
      query: (id) => `BuildOutput/${id}`,
      providesTags: (result, error, id) => [{ type: 'BuildOutput', id }],
    }),

    // 5) Update
    updateBuildOutput: build.mutation<void, Pick<BuildOutput, 'id'> & Partial<BuildOutput>>({
      query: ({ id, ...patch }) => ({
        url: `BuildOutput/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            BuildOutputService.util.updateQueryData('getBuildOutput', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'BuildOutput', id }],
    }),

    // 6) Delete
    deleteBuildOutput: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `BuildOutput/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'BuildOutput', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetBuildOutputsPagedQuery`
export const {
  useGetBuildOutputsPagedQuery,     // immediate fetch
  useLazyGetBuildOutputsPagedQuery, // lazy fetch
  useGetBuildOutputQuery,
  useGetBuildOutputsQuery,
  useAddBuildOutputMutation,
  useUpdateBuildOutputMutation,
  useDeleteBuildOutputMutation,
} = BuildOutputService