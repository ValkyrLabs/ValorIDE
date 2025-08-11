import { createApi } from "@reduxjs/toolkit/query/react";
import { Invoice } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type InvoiceResponse = Invoice[];

export const InvoiceService = createApi({
  reducerPath: "Invoice", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Invoice"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getInvoicesPaged: build.query<
      InvoiceResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `Invoice?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Invoice" as const, id })),
              { type: "Invoice", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getInvoices: build.query<InvoiceResponse, void>({
      query: () => `Invoice`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Invoice" as const, id })),
              { type: "Invoice", id: "LIST" },
            ]
          : [{ type: "Invoice", id: "LIST" }],
    }),

    // 3) Create
    addInvoice: build.mutation<Invoice, Partial<Invoice>>({
      query: (body) => ({
        url: `Invoice`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Invoice", id: "LIST" }],
    }),

    // 4) Get single by ID
    getInvoice: build.query<Invoice, string>({
      query: (id) => `Invoice/${id}`,
      providesTags: (result, error, id) => [{ type: "Invoice", id }],
    }),

    // 5) Update
    updateInvoice: build.mutation<void, Pick<Invoice, "id"> & Partial<Invoice>>(
      {
        query: ({ id, ...patch }) => ({
          url: `Invoice/${id}`,
          method: "PUT",
          body: patch,
        }),
        async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
          if (id) {
            const patchResult = dispatch(
              InvoiceService.util.updateQueryData("getInvoice", id, (draft) => {
                Object.assign(draft, patch);
              }),
            );
            try {
              await queryFulfilled;
            } catch {
              patchResult.undo();
            }
          }
        },
        invalidatesTags: (result, error, { id }) => [{ type: "Invoice", id }],
      },
    ),

    // 6) Delete
    deleteInvoice: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Invoice/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Invoice", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetInvoicesPagedQuery`
export const {
  useGetInvoicesPagedQuery, // immediate fetch
  useLazyGetInvoicesPagedQuery, // lazy fetch
  useGetInvoiceQuery,
  useGetInvoicesQuery,
  useAddInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} = InvoiceService;
