import { createApi } from "@reduxjs/toolkit/query/react"
import { WebsocketMessage } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type WebsocketMessageResponse = WebsocketMessage[]

export const WebsocketMessageService = createApi({
	reducerPath: "WebsocketMessage", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["WebsocketMessage"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getWebsocketMessagesPaged: build.query<WebsocketMessageResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `WebsocketMessage?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "WebsocketMessage" as const, id })),
							{ type: "WebsocketMessage", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getWebsocketMessages: build.query<WebsocketMessageResponse, void>({
			query: () => `WebsocketMessage`,
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "WebsocketMessage" as const, id })),
							{ type: "WebsocketMessage", id: "LIST" },
						]
					: [{ type: "WebsocketMessage", id: "LIST" }],
		}),

		// 3) Create
		addWebsocketMessage: build.mutation<WebsocketMessage, Partial<WebsocketMessage>>({
			query: (body) => ({
				url: `WebsocketMessage`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "WebsocketMessage", id: "LIST" }],
		}),

		// 4) Get single by ID
		getWebsocketMessage: build.query<WebsocketMessage, string>({
			query: (id) => `WebsocketMessage/${id}`,
			providesTags: (result, error, id) => [{ type: "WebsocketMessage", id }],
		}),

		// 5) Update
		updateWebsocketMessage: build.mutation<void, Pick<WebsocketMessage, "id"> & Partial<WebsocketMessage>>({
			query: ({ id, ...patch }) => ({
				url: `WebsocketMessage/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						WebsocketMessageService.util.updateQueryData("getWebsocketMessage", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "WebsocketMessage", id }],
		}),

		// 6) Delete
		deleteWebsocketMessage: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `WebsocketMessage/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "WebsocketMessage", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetWebsocketMessagesPagedQuery`
export const {
	useGetWebsocketMessagesPagedQuery, // immediate fetch
	useLazyGetWebsocketMessagesPagedQuery, // lazy fetch
	useGetWebsocketMessageQuery,
	useGetWebsocketMessagesQuery,
	useAddWebsocketMessageMutation,
	useUpdateWebsocketMessageMutation,
	useDeleteWebsocketMessageMutation,
} = WebsocketMessageService
