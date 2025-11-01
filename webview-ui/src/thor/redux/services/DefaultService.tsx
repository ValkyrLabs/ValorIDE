import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery';

/**
 * Placeholder RTK Query service that keeps generated middleware/store wiring
 * happy when a generic "Default" endpoint is referenced but no bespoke service
 * was emitted. Provides a valid reducer/middleware surface without endpoints.
 */
export const DefaultService = createApi({
  reducerPath: 'Default',
  baseQuery: customBaseQuery,
  tagTypes: [],
  endpoints: () => ({}),
});

// Maintain backwards-compatibility with the long-standing typo.
export const DefualtService = DefaultService;
export default DefaultService;
