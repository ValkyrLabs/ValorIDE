import { createApi } from '@reduxjs/toolkit/query/react'
import { Build } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type BuildResponse = Build[]

export const BuildService = createApi({
  reducerPath: 'Build', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Build'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getBuildsPaged: build.query<BuildResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Build?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Build' as const, id })),
              { type: 'Build', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getBuilds: build.query<BuildResponse, void>({
      query: () => `Build`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Build' as const, id })),
              { type: 'Build', id: 'LIST' },
            ]
          : [{ type: 'Build', id: 'LIST' }],
    }),

    // 3) Create
    addBuild: build.mutation<Build, Partial<Build>>({
      query: (body) => ({
        url: `Build`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Build', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getBuild: build.query<Build, string>({
      query: (id) => `Build/${id}`,
      providesTags: (result, error, id) => [{ type: 'Build', id }],
    }),

    // 5) Update
    updateBuild: build.mutation<void, Pick<Build, 'id'> & Partial<Build>>({
      query: ({ id, ...patch }) => ({
        url: `Build/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            BuildService.util.updateQueryData('getBuild', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'Build', id }],
    }),

    // 6) Delete
    deleteBuild: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Build/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Build', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetBuildsPagedQuery`
export const {
  useGetBuildsPagedQuery,     // immediate fetch
  useLazyGetBuildsPagedQuery, // lazy fetch
  useGetBuildQuery,
  useGetBuildsQuery,
  useAddBuildMutation,
  useUpdateBuildMutation,
  useDeleteBuildMutation,
} = BuildService