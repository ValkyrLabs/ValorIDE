import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";
export const DigitalProductService = createApi({
    reducerPath: "DigitalProductService",
    baseQuery: customBaseQuery,
    tagTypes: ["FileRecord", "DigitalProductDraft"],
    endpoints: (build) => ({
        listFileRecords: build.query({
            query: ({ page = 0, size = 25, status } = {}) => {
                const params = [`page=${page}`, `size=${size}`];
                if (status) {
                    params.push(`example=${encodeURIComponent(JSON.stringify({ status: status.toUpperCase() }))}`);
                }
                return `FileRecord?${params.join("&")}`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "FileRecord", id })),
                    { type: "FileRecord", id: "LIST" },
                ]
                : [{ type: "FileRecord", id: "LIST" }],
        }),
        prepareDigitalProduct: build.mutation({
            query: ({ fileId, payload }) => ({
                url: `files/${fileId}/digital-products/draft`,
                method: "POST",
                body: payload ?? {},
            }),
            invalidatesTags: (result) => result
                ? [
                    { type: "DigitalProductDraft", id: result.product.id },
                    { type: "FileRecord", id: "LIST" },
                ]
                : [{ type: "FileRecord", id: "LIST" }],
        }),
        createOrUpdateDigitalAsset: build.mutation({
            query: ({ productId, body }) => ({
                url: `Product/${productId}/createDigitalAsset`,
                method: "POST",
                body,
            }),
            invalidatesTags: (result, error, args) => [
                { type: "DigitalProductDraft", id: args.productId },
            ],
        }),
        generateDownloadLink: build.mutation({
            query: ({ productId, principalId, validityMinutes }) => ({
                url: `Product/${productId}/generateDownloadLink`,
                method: "POST",
                body: { principalId, validityMinutes },
            }),
        }),
        completeFulfillmentTask: build.mutation({
            query: ({ taskId, status, metadata }) => ({
                url: `OrderFulfillmentTask/${taskId}/complete`,
                method: "POST",
                body: { status, metadata },
            }),
        }),
    }),
});
export const { useListFileRecordsQuery, usePrepareDigitalProductMutation, useCreateOrUpdateDigitalAssetMutation, useGenerateDownloadLinkMutation, useCompleteFulfillmentTaskMutation, } = DigitalProductService;
//# sourceMappingURL=DigitalProductService.js.map