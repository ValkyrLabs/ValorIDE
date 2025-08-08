import { createApi } from "@reduxjs/toolkit/query/react"
import { WebsocketSession } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type WebsocketSessionResponse = WebsocketSession[]

export const WebsocketSessionService = createApi({
	reducerPath: "WebsocketSession", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["WebsocketSession"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getWebsocketSessionsPaged: build.query<WebsocketSessionResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `WebsocketSession?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "WebsocketSession" as const, id })),
							{ type: "WebsocketSession", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getWebsocketSessions: build.query<WebsocketSessionResponse, void>({
			query: () => `WebsocketSession`,
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "WebsocketSession" as const, id })),
							{ type: "WebsocketSession", id: "LIST" },
						]
					: [{ type: "WebsocketSession", id: "LIST" }],
		}),

		// 3) Create
		addWebsocketSession: build.mutation<WebsocketSession, Partial<WebsocketSession>>({
			query: (body) => ({
				url: `WebsocketSession`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "WebsocketSession", id: "LIST" }],
		}),

		// 4) Get single by ID
		getWebsocketSession: build.query<WebsocketSession, string>({
			query: (id) => `WebsocketSession/${id}`,
			providesTags: (result, error, id) => [{ type: "WebsocketSession", id }],
		}),

		// 5) Update
		updateWebsocketSession: build.mutation<void, Pick<WebsocketSession, "id"> & Partial<WebsocketSession>>({
			query: ({ id, ...patch }) => ({
				url: `WebsocketSession/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						WebsocketSessionService.util.updateQueryData("getWebsocketSession", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "WebsocketSession", id }],
		}),

		// 6) Delete
		deleteWebsocketSession: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `WebsocketSession/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "WebsocketSession", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetWebsocketSessionsPagedQuery`
export const {
	useGetWebsocketSessionsPagedQuery, // immediate fetch
	useLazyGetWebsocketSessionsPagedQuery, // lazy fetch
	useGetWebsocketSessionQuery,
	useGetWebsocketSessionsQuery,
	useAddWebsocketSessionMutation,
	useUpdateWebsocketSessionMutation,
	useDeleteWebsocketSessionMutation,
} = WebsocketSessionService
