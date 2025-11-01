import { createApi } from '@reduxjs/toolkit/query/react'
import { ExecModule } from '@thor/model/ExecModule'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ExecModuleResponse = ExecModule[]

export const ExecModuleService = createApi({
  reducerPath: 'ExecModule', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ExecModule'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getExecModulesPaged: build.query<ExecModuleResponse, { page: number; size?: number; example?: Partial<ExecModule> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ExecModule?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ExecModule' as const, id })),
              { type: 'ExecModule', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getExecModules: build.query<ExecModuleResponse, { example?: Partial<ExecModule> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ExecModule?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ExecModule`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ExecModule' as const, id })),
              { type: 'ExecModule', id: 'LIST' },
            ]
          : [{ type: 'ExecModule', id: 'LIST' }],
    }),

    // 3) Create
    addExecModule: build.mutation<ExecModule, Partial<ExecModule>>({
      query: (body) => ({
        url: `ExecModule`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ExecModule', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getExecModule: build.query<ExecModule, string>({
      query: (id) => `ExecModule/${id}`,
      providesTags: (result, error, id) => [{ type: 'ExecModule', id }],
    }),

    // 5) Update
    updateExecModule: build.mutation<void, Pick<ExecModule, 'id'> & Partial<ExecModule>>({
      query: ({ id, ...patch }) => ({
        url: `ExecModule/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ExecModuleService.util.updateQueryData('getExecModule', id, (draft) => {
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
        { type: 'ExecModule', id },
        { type: 'ExecModule', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteExecModule: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ExecModule/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ExecModule', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetExecModulesPagedQuery`
export const {
  useGetExecModulesPagedQuery,     // immediate fetch
  useLazyGetExecModulesPagedQuery, // lazy fetch
  useGetExecModuleQuery,
  useGetExecModulesQuery,
  useAddExecModuleMutation,
  useUpdateExecModuleMutation,
  useDeleteExecModuleMutation,
} = ExecModuleService
