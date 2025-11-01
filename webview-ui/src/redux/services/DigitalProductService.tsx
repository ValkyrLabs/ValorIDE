import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";
import { Product } from "../../thor/model/Product";

export interface FileRecordSummary {
  id: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  status?: string;
  virusScanStatus?: string;
  createdDate?: string;
}

export interface DigitalAssetSummary {
  id: string;
  productId: string;
  fileId: string;
  deliveryMethod?: string;
  accessModel?: string;
  maxDownloads?: number;
  expiresAfterDays?: number;
  notifyCustomerOnExpiry?: boolean;
}

export interface ProductDeliveryConfigSummary {
  id?: string;
  productId: string;
  deliveryType?: string;
  autoFulfill?: boolean;
  fulfillmentWorkflowId?: string | null;
}

export interface DigitalProductDraftResponse {
  product: Product;
  digitalAsset: DigitalAssetSummary;
  deliveryConfig: ProductDeliveryConfigSummary;
  fileRecord: FileRecordSummary;
  storageFolder?: string | null;
}

export interface DraftRequestPayload {
  name?: string;
  description?: string;
  price?: number;
  maxDownloads?: number;
  expiresAfterDays?: number;
  notifyOnExpiry?: boolean;
}

export interface GenerateLinkResponse {
  accessId: string;
  downloadUrl?: string;
  expiresAt?: string;
  digitalAssetId?: string;
}

export interface CompleteFulfillmentResponse {
  task: any;
  grantedAccesses: any[];
}

export const DigitalProductService = createApi({
  reducerPath: "DigitalProductService",
  baseQuery: customBaseQuery,
  tagTypes: ["FileRecord", "DigitalProductDraft"],
  endpoints: (build) => ({
    listFileRecords: build.query<
      FileRecordSummary[],
      { page?: number; size?: number; status?: string }
    >({
      query: ({ page = 0, size = 25, status } = {}) => {
        const params: string[] = [`page=${page}`, `size=${size}`];
        if (status) {
          params.push(
            `example=${encodeURIComponent(
              JSON.stringify({ status: status.toUpperCase() }),
            )}`,
          );
        }
        return `FileRecord?${params.join("&")}`;
      },
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: "FileRecord" as const, id })),
            { type: "FileRecord", id: "LIST" },
          ]
          : [{ type: "FileRecord", id: "LIST" }],
    }),

    prepareDigitalProduct: build.mutation<
      DigitalProductDraftResponse,
      { fileId: string; payload?: DraftRequestPayload }
    >({
      query: ({ fileId, payload }) => ({
        url: `files/${fileId}/digital-products/draft`,
        method: "POST",
        body: payload ?? {},
      }),
      invalidatesTags: (result) =>
        result
          ? [
            { type: "DigitalProductDraft", id: result.product.id },
            { type: "FileRecord", id: "LIST" },
          ]
          : [{ type: "FileRecord", id: "LIST" }],
    }),

    createOrUpdateDigitalAsset: build.mutation<
      DigitalAssetSummary,
      { productId: string; body: Partial<DigitalAssetSummary> }
    >({
      query: ({ productId, body }) => ({
        url: `Product/${productId}/createDigitalAsset`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, args) => [
        { type: "DigitalProductDraft", id: args.productId },
      ],
    }),

    generateDownloadLink: build.mutation<
      GenerateLinkResponse,
      { productId: string; principalId?: string; validityMinutes?: number }
    >({
      query: ({ productId, principalId, validityMinutes }) => ({
        url: `Product/${productId}/generateDownloadLink`,
        method: "POST",
        body: { principalId, validityMinutes },
      }),
    }),

    completeFulfillmentTask: build.mutation<
      CompleteFulfillmentResponse,
      { taskId: string; status?: string; metadata?: Record<string, unknown> }
    >({
      query: ({ taskId, status, metadata }) => ({
        url: `OrderFulfillmentTask/${taskId}/complete`,
        method: "POST",
        body: { status, metadata },
      }),
    }),
  }),
});

export const {
  useListFileRecordsQuery,
  usePrepareDigitalProductMutation,
  useCreateOrUpdateDigitalAssetMutation,
  useGenerateDownloadLinkMutation,
  useCompleteFulfillmentTaskMutation,
} = DigitalProductService;
