import { createApi } from "@reduxjs/toolkit/query/react"
import { Opportunity } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type OpportunityResponse = Opportunity[]

export const OpportunityService = createApi({
	reducerPath: "Opportunity", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Opportunity"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getOpportunitysPaged: build.query<OpportunityResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Opportunity?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "Opportunity" as const, id })),
							{ type: "Opportunity", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getOpportunitys: build.query<OpportunityResponse, void>({
			query: () => `Opportunity`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Opportunity" as const, id })), { type: "Opportunity", id: "LIST" }]
					: [{ type: "Opportunity", id: "LIST" }],
		}),

		// 3) Create
		addOpportunity: build.mutation<Opportunity, Partial<Opportunity>>({
			query: (body) => ({
				url: `Opportunity`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Opportunity", id: "LIST" }],
		}),

		// 4) Get single by ID
		getOpportunity: build.query<Opportunity, string>({
			query: (id) => `Opportunity/${id}`,
			providesTags: (result, error, id) => [{ type: "Opportunity", id }],
		}),

		// 5) Update
		updateOpportunity: build.mutation<void, Pick<Opportunity, "id"> & Partial<Opportunity>>({
			query: ({ id, ...patch }) => ({
				url: `Opportunity/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						OpportunityService.util.updateQueryData("getOpportunity", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Opportunity", id }],
		}),

		// 6) Delete
		deleteOpportunity: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Opportunity/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Opportunity", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetOpportunitysPagedQuery`
export const {
	useGetOpportunitysPagedQuery, // immediate fetch
	useLazyGetOpportunitysPagedQuery, // lazy fetch
	useGetOpportunityQuery,
	useGetOpportunitysQuery,
	useAddOpportunityMutation,
	useUpdateOpportunityMutation,
	useDeleteOpportunityMutation,
} = OpportunityService
