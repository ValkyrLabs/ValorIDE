import { createApi } from "@reduxjs/toolkit/query/react"
import { McpToolCallResponse } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type McpToolCallResponseResponse = McpToolCallResponse[]

export const McpToolCallResponseService = createApi({
	reducerPath: "McpToolCallResponse", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["McpToolCallResponse"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getMcpToolCallResponsesPaged: build.query<McpToolCallResponseResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `McpToolCallResponse?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "McpToolCallResponse" as const, id })),
							{ type: "McpToolCallResponse", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getMcpToolCallResponses: build.query<McpToolCallResponseResponse, void>({
			query: () => `McpToolCallResponse`,
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "McpToolCallResponse" as const, id })),
							{ type: "McpToolCallResponse", id: "LIST" },
						]
					: [{ type: "McpToolCallResponse", id: "LIST" }],
		}),

		// 3) Create
		addMcpToolCallResponse: build.mutation<McpToolCallResponse, Partial<McpToolCallResponse>>({
			query: (body) => ({
				url: `McpToolCallResponse`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "McpToolCallResponse", id: "LIST" }],
		}),

		// 4) Get single by ID
		getMcpToolCallResponse: build.query<McpToolCallResponse, string>({
			query: (id) => `McpToolCallResponse/${id}`,
			providesTags: (result, error, id) => [{ type: "McpToolCallResponse", id }],
		}),

		// 5) Update
		updateMcpToolCallResponse: build.mutation<void, Pick<McpToolCallResponse, "id"> & Partial<McpToolCallResponse>>({
			query: ({ id, ...patch }) => ({
				url: `McpToolCallResponse/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						McpToolCallResponseService.util.updateQueryData("getMcpToolCallResponse", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "McpToolCallResponse", id }],
		}),

		// 6) Delete
		deleteMcpToolCallResponse: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `McpToolCallResponse/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "McpToolCallResponse", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetMcpToolCallResponsesPagedQuery`
export const {
	useGetMcpToolCallResponsesPagedQuery, // immediate fetch
	useLazyGetMcpToolCallResponsesPagedQuery, // lazy fetch
	useGetMcpToolCallResponseQuery,
	useGetMcpToolCallResponsesQuery,
	useAddMcpToolCallResponseMutation,
	useUpdateMcpToolCallResponseMutation,
	useDeleteMcpToolCallResponseMutation,
} = McpToolCallResponseService
