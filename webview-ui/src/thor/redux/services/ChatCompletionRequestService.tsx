import { createApi } from "@reduxjs/toolkit/query/react"
import { ChatCompletionRequest } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type ChatCompletionRequestResponse = ChatCompletionRequest[]

export const ChatCompletionRequestService = createApi({
	reducerPath: "ChatCompletionRequest", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["ChatCompletionRequest"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getChatCompletionRequestsPaged: build.query<ChatCompletionRequestResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `ChatCompletionRequest?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "ChatCompletionRequest" as const, id })),
							{ type: "ChatCompletionRequest", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getChatCompletionRequests: build.query<ChatCompletionRequestResponse, void>({
			query: () => `ChatCompletionRequest`,
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "ChatCompletionRequest" as const, id })),
							{ type: "ChatCompletionRequest", id: "LIST" },
						]
					: [{ type: "ChatCompletionRequest", id: "LIST" }],
		}),

		// 3) Create
		addChatCompletionRequest: build.mutation<ChatCompletionRequest, Partial<ChatCompletionRequest>>({
			query: (body) => ({
				url: `ChatCompletionRequest`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "ChatCompletionRequest", id: "LIST" }],
		}),

		// 4) Get single by ID
		getChatCompletionRequest: build.query<ChatCompletionRequest, string>({
			query: (id) => `ChatCompletionRequest/${id}`,
			providesTags: (result, error, id) => [{ type: "ChatCompletionRequest", id }],
		}),

		// 5) Update
		updateChatCompletionRequest: build.mutation<void, Pick<ChatCompletionRequest, "id"> & Partial<ChatCompletionRequest>>({
			query: ({ id, ...patch }) => ({
				url: `ChatCompletionRequest/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						ChatCompletionRequestService.util.updateQueryData("getChatCompletionRequest", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "ChatCompletionRequest", id }],
		}),

		// 6) Delete
		deleteChatCompletionRequest: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `ChatCompletionRequest/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "ChatCompletionRequest", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetChatCompletionRequestsPagedQuery`
export const {
	useGetChatCompletionRequestsPagedQuery, // immediate fetch
	useLazyGetChatCompletionRequestsPagedQuery, // lazy fetch
	useGetChatCompletionRequestQuery,
	useGetChatCompletionRequestsQuery,
	useAddChatCompletionRequestMutation,
	useUpdateChatCompletionRequestMutation,
	useDeleteChatCompletionRequestMutation,
} = ChatCompletionRequestService
