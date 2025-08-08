import { createApi } from "@reduxjs/toolkit/query/react"
import { McpResourceResponse } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type McpResourceResponseResponse = McpResourceResponse[]

export const McpResourceResponseService = createApi({
	reducerPath: "McpResourceResponse", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["McpResourceResponse"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getMcpResourceResponsesPaged: build.query<McpResourceResponseResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `McpResourceResponse?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "McpResourceResponse" as const, id })),
							{ type: "McpResourceResponse", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getMcpResourceResponses: build.query<McpResourceResponseResponse, void>({
			query: () => `McpResourceResponse`,
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "McpResourceResponse" as const, id })),
							{ type: "McpResourceResponse", id: "LIST" },
						]
					: [{ type: "McpResourceResponse", id: "LIST" }],
		}),

		// 3) Create
		addMcpResourceResponse: build.mutation<McpResourceResponse, Partial<McpResourceResponse>>({
			query: (body) => ({
				url: `McpResourceResponse`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "McpResourceResponse", id: "LIST" }],
		}),

		// 4) Get single by ID
		getMcpResourceResponse: build.query<McpResourceResponse, string>({
			query: (id) => `McpResourceResponse/${id}`,
			providesTags: (result, error, id) => [{ type: "McpResourceResponse", id }],
		}),

		// 5) Update
		updateMcpResourceResponse: build.mutation<void, Pick<McpResourceResponse, "id"> & Partial<McpResourceResponse>>({
			query: ({ id, ...patch }) => ({
				url: `McpResourceResponse/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						McpResourceResponseService.util.updateQueryData("getMcpResourceResponse", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "McpResourceResponse", id }],
		}),

		// 6) Delete
		deleteMcpResourceResponse: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `McpResourceResponse/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "McpResourceResponse", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetMcpResourceResponsesPagedQuery`
export const {
	useGetMcpResourceResponsesPagedQuery, // immediate fetch
	useLazyGetMcpResourceResponsesPagedQuery, // lazy fetch
	useGetMcpResourceResponseQuery,
	useGetMcpResourceResponsesQuery,
	useAddMcpResourceResponseMutation,
	useUpdateMcpResourceResponseMutation,
	useDeleteMcpResourceResponseMutation,
} = McpResourceResponseService
