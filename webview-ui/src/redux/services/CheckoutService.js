import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";
export const CheckoutService = createApi({
    reducerPath: "CheckoutService",
    baseQuery: customBaseQuery,
    tagTypes: ["Checkout"],
    endpoints: (build) => ({
        // POST /v1/checkout/create-session
        createCheckoutSession: build.mutation({
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
//# sourceMappingURL=CheckoutService.js.map