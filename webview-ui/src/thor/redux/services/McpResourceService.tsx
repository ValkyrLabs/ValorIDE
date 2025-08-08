import { createApi } from "@reduxjs/toolkit/query/react"
import { McpResource } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type McpResourceResponse = McpResource[]

export const McpResourceService = createApi({
	reducerPath: "McpResource", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["McpResource"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getMcpResourcesPaged: build.query<McpResourceResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `McpResource?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "McpResource" as const, id })),
							{ type: "McpResource", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getMcpResources: build.query<McpResourceResponse, void>({
			query: () => `McpResource`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "McpResource" as const, id })), { type: "McpResource", id: "LIST" }]
					: [{ type: "McpResource", id: "LIST" }],
		}),

		// 3) Create
		addMcpResource: build.mutation<McpResource, Partial<McpResource>>({
			query: (body) => ({
				url: `McpResource`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "McpResource", id: "LIST" }],
		}),

		// 4) Get single by ID
		getMcpResource: build.query<McpResource, string>({
			query: (id) => `McpResource/${id}`,
			providesTags: (result, error, id) => [{ type: "McpResource", id }],
		}),

		// 5) Update
		updateMcpResource: build.mutation<void, Pick<McpResource, "id"> & Partial<McpResource>>({
			query: ({ id, ...patch }) => ({
				url: `McpResource/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						McpResourceService.util.updateQueryData("getMcpResource", id, (draft) => {
							Object.assign(draft, patch)
						}),
					)
					try {
						await queryFulfilled
					} catch {
						patchResult.undo()
					}
				}
			},
			invalidatesTags: (result, error, { id }) => [{ type: "McpResource", id }],
		}),

		// 6) Delete
		deleteMcpResource: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `McpResource/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "McpResource", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetMcpResourcesPagedQuery`
export const {
	useGetMcpResourcesPagedQuery, // immediate fetch
	useLazyGetMcpResourcesPagedQuery, // lazy fetch
	useGetMcpResourceQuery,
	useGetMcpResourcesQuery,
	useAddMcpResourceMutation,
	useUpdateMcpResourceMutation,
	useDeleteMcpResourceMutation,
} = McpResourceService
