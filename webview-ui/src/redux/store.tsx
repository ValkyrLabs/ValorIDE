// CUSTOM REDUX INTEGRATION

import { combineReducers, configureStore, Middleware } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { AuthService } from "./services/AuthService";
import { LogoutService } from "./services/LogoutService";
import { ApplicationService } from "./services/ApplicationService";
import { PrincipalService } from "./services/PrincipalService";
import { ThorHostingService } from "./services/ThorHostingService";
import { BalanceResponseService } from "@thorapi/redux/services/BalanceResponseService";
import { UsageTransactionService } from "@thorapi/redux/services/UsageTransactionService";
import { PaymentTransactionService } from "@thorapi/redux/services/PaymentTransactionService";
import { DigitalProductService } from "./services/DigitalProductService";
import { RatingService } from "@thorapi/redux/services/RatingService";
import { UserPreferenceService } from "@thorapi/redux/services/UserPreferenceService";
import { SalesOrderService } from "@thorapi/redux/services/SalesOrderService";
import { CustomerService } from "@thorapi/redux/services/CustomerService";
import { InvoiceService } from "@thorapi/redux/services/InvoiceService";
import { LlmDetailsService } from "@thorapi/redux/services/LlmDetailsService";
import { ContentDataService } from "@thorapi/redux/services/ContentDataService";
import { McpServerService } from "@thorapi/redux/services/McpServerService";
import { McpMarketplaceCatalogService } from "@thorapi/redux/services/McpMarketplaceCatalogService";
import { McpMarketplaceItemService } from "@thorapi/redux/services/McpMarketplaceItemService";
import { creditsApi } from "../services/creditsApi";
import apiErrorsReducer from "./slices/apiErrorsSlice";
import { apiErrorMiddleware } from "./middleware/apiErrorListener";

// cool!
import { websocketMiddleware } from "./middleware/websocketMiddleware";
import websocketReducer from "../components/ServerConsole/websocketSlice";

// import the thorapi generated reducers and middleware
import middlewares from "../redux/middlewares";

// combine reducers
const rootReducer = combineReducers({
  websocket: websocketReducer,
  [AuthService.reducerPath]: AuthService.reducer,
  [LogoutService.reducerPath]: LogoutService.reducer,
  [ApplicationService.reducerPath]: ApplicationService.reducer,
  [PrincipalService.reducerPath]: PrincipalService.reducer,
  [ThorHostingService.reducerPath]: ThorHostingService.reducer,
  [BalanceResponseService.reducerPath]: BalanceResponseService.reducer,
  [UsageTransactionService.reducerPath]: UsageTransactionService.reducer,
  [PaymentTransactionService.reducerPath]: PaymentTransactionService.reducer,
  [DigitalProductService.reducerPath]: DigitalProductService.reducer,
  [RatingService.reducerPath]: RatingService.reducer,
  [UserPreferenceService.reducerPath]: UserPreferenceService.reducer,
  [SalesOrderService.reducerPath]: SalesOrderService.reducer,
  [CustomerService.reducerPath]: CustomerService.reducer,
  [InvoiceService.reducerPath]: InvoiceService.reducer,
  [LlmDetailsService.reducerPath]: LlmDetailsService.reducer,
  [ContentDataService.reducerPath]: ContentDataService.reducer,
  [McpServerService.reducerPath]: McpServerService.reducer,
  [McpMarketplaceCatalogService.reducerPath]: McpMarketplaceCatalogService.reducer,
  [McpMarketplaceItemService.reducerPath]: McpMarketplaceItemService.reducer,
  [creditsApi.reducerPath]: creditsApi.reducer,
  apiErrors: apiErrorsReducer,
});

const reducer = rootReducer;

const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(middlewares as Middleware[]) // add the custom middlewares
      .concat(ThorHostingService.middleware)
      .concat(BalanceResponseService.middleware)
      .concat(UsageTransactionService.middleware)
      .concat(PaymentTransactionService.middleware)
      .concat(DigitalProductService.middleware)
      .concat(RatingService.middleware)
      .concat(UserPreferenceService.middleware)
      .concat(SalesOrderService.middleware)
      .concat(CustomerService.middleware)
      .concat(InvoiceService.middleware)
      .concat(LlmDetailsService.middleware)
      .concat(ContentDataService.middleware)
      .concat(McpServerService.middleware)
      .concat(McpMarketplaceCatalogService.middleware)
      .concat(McpMarketplaceItemService.middleware)
      .concat(creditsApi.middleware)
      .concat(apiErrorMiddleware)
      .concat(websocketMiddleware),
});

// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);

// Get the type of our store variable
export type AppStore = typeof store;

export type RootState = ReturnType<(typeof store)["getState"]>;

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = (typeof store)["dispatch"];

export default store;
