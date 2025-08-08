import { createApi } from "@reduxjs/toolkit/query/react"
import { Product } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type ProductResponse = Product[]

export const ProductService = createApi({
	reducerPath: "Product", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Product"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getProductsPaged: build.query<ProductResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Product?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "Product" as const, id })), { type: "Product", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getProducts: build.query<ProductResponse, void>({
			query: () => `Product`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Product" as const, id })), { type: "Product", id: "LIST" }]
					: [{ type: "Product", id: "LIST" }],
		}),

		// 3) Create
		addProduct: build.mutation<Product, Partial<Product>>({
			query: (body) => ({
				url: `Product`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Product", id: "LIST" }],
		}),

		// 4) Get single by ID
		getProduct: build.query<Product, string>({
			query: (id) => `Product/${id}`,
			providesTags: (result, error, id) => [{ type: "Product", id }],
		}),

		// 5) Update
		updateProduct: build.mutation<void, Pick<Product, "id"> & Partial<Product>>({
			query: ({ id, ...patch }) => ({
				url: `Product/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						ProductService.util.updateQueryData("getProduct", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Product", id }],
		}),

		// 6) Delete
		deleteProduct: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Product/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Product", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetProductsPagedQuery`
export const {
	useGetProductsPagedQuery, // immediate fetch
	useLazyGetProductsPagedQuery, // lazy fetch
	useGetProductQuery,
	useGetProductsQuery,
	useAddProductMutation,
	useUpdateProductMutation,
	useDeleteProductMutation,
} = ProductService
