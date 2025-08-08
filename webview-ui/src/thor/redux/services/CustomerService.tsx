import { createApi } from "@reduxjs/toolkit/query/react"
import { Customer } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type CustomerResponse = Customer[]

export const CustomerService = createApi({
	reducerPath: "Customer", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Customer"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getCustomersPaged: build.query<CustomerResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Customer?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "Customer" as const, id })), { type: "Customer", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getCustomers: build.query<CustomerResponse, void>({
			query: () => `Customer`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Customer" as const, id })), { type: "Customer", id: "LIST" }]
					: [{ type: "Customer", id: "LIST" }],
		}),

		// 3) Create
		addCustomer: build.mutation<Customer, Partial<Customer>>({
			query: (body) => ({
				url: `Customer`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Customer", id: "LIST" }],
		}),

		// 4) Get single by ID
		getCustomer: build.query<Customer, string>({
			query: (id) => `Customer/${id}`,
			providesTags: (result, error, id) => [{ type: "Customer", id }],
		}),

		// 5) Update
		updateCustomer: build.mutation<void, Pick<Customer, "id"> & Partial<Customer>>({
			query: ({ id, ...patch }) => ({
				url: `Customer/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						CustomerService.util.updateQueryData("getCustomer", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Customer", id }],
		}),

		// 6) Delete
		deleteCustomer: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Customer/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Customer", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetCustomersPagedQuery`
export const {
	useGetCustomersPagedQuery, // immediate fetch
	useLazyGetCustomersPagedQuery, // lazy fetch
	useGetCustomerQuery,
	useGetCustomersQuery,
	useAddCustomerMutation,
	useUpdateCustomerMutation,
	useDeleteCustomerMutation,
} = CustomerService
