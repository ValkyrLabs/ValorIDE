import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";

export type CreateCheckoutSessionArgs = {
  orderId: string; // UUID
  successUrl: string;
  cancelUrl: string;
  currency?: string; // e.g. 'usd'
};

export type CreateCheckoutSessionResponse = {
  session_id?: string;
  checkout_url?: string;
  error?: string;
  [k: string]: any;
};

export const CheckoutService = createApi({
  reducerPath: "CheckoutService",
  baseQuery: customBaseQuery,
  tagTypes: ["Checkout"],
  endpoints: (build) => ({
    // POST /v1/checkout/create-session
    createCheckoutSession: build.mutation<
      CreateCheckoutSessionResponse,
      CreateCheckoutSessionArgs
    >({
      query: (body) => ({
        url: `/checkout/create-session`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      invalidatesTags: [],
    }),
  }),
});

export const { useCreateCheckoutSessionMutation } = CheckoutService;
