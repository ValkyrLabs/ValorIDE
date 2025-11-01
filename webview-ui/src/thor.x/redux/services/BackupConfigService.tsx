import { createApi } from '@reduxjs/toolkit/query/react'
import { BackupConfig } from '@thor/model/BackupConfig'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type BackupConfigResponse = BackupConfig[]

export const BackupConfigService = createApi({
  reducerPath: 'BackupConfig', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['BackupConfig'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getBackupConfigsPaged: build.query<BackupConfigResponse, { page: number; size?: number; example?: Partial<BackupConfig> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `BackupConfig?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BackupConfig' as const, id })),
              { type: 'BackupConfig', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getBackupConfigs: build.query<BackupConfigResponse, { example?: Partial<BackupConfig> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `BackupConfig?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `BackupConfig`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BackupConfig' as const, id })),
              { type: 'BackupConfig', id: 'LIST' },
            ]
          : [{ type: 'BackupConfig', id: 'LIST' }],
    }),

    // 3) Create
    addBackupConfig: build.mutation<BackupConfig, Partial<BackupConfig>>({
      query: (body) => ({
        url: `BackupConfig`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'BackupConfig', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getBackupConfig: build.query<BackupConfig, string>({
      query: (id) => `BackupConfig/${id}`,
      providesTags: (result, error, id) => [{ type: 'BackupConfig', id }],
    }),

    // 5) Update
    updateBackupConfig: build.mutation<void, Pick<BackupConfig, 'id'> & Partial<BackupConfig>>({
      query: ({ id, ...patch }) => ({
        url: `BackupConfig/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            BackupConfigService.util.updateQueryData('getBackupConfig', id, (draft) => {
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
        { type: 'BackupConfig', id },
        { type: 'BackupConfig', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteBackupConfig: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `BackupConfig/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'BackupConfig', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetBackupConfigsPagedQuery`
export const {
  useGetBackupConfigsPagedQuery,     // immediate fetch
  useLazyGetBackupConfigsPagedQuery, // lazy fetch
  useGetBackupConfigQuery,
  useGetBackupConfigsQuery,
  useAddBackupConfigMutation,
  useUpdateBackupConfigMutation,
  useDeleteBackupConfigMutation,
} = BackupConfigService
