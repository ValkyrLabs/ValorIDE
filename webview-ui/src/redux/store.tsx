// CUSTOM REDUX INTEGRATION

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { AuthService } from "./services/AuthService";
import { LogoutService } from "./services/LogoutService";
import { BalanceResponseService } from "../thor/redux/services/BalanceResponseService";
import { UsageTransactionService } from "../thor/redux/services/UsageTransactionService";
import { PaymentTransactionService } from "../thor/redux/services/PaymentTransactionService";

// cool!
import { websocketMiddleware } from "./middleware/websocketMiddleware";
import websocketReducer from "../components/ServerConsole/websocketSlice";

// import the thorapi generated reducers and middleware
import middlewares from "../redux/middlewares";
import thorMiddlewares from "../thor/redux/middlewares";
import { reducer as thorReducer } from "../thor/redux/store";

// combine reducers
const rootReducer = combineReducers({
  ...thorReducer,
  websocket: websocketReducer,
  [AuthService.reducerPath]: AuthService.reducer,
  [LogoutService.reducerPath]: LogoutService.reducer,
  [BalanceResponseService.reducerPath]: BalanceResponseService.reducer,
  [UsageTransactionService.reducerPath]: UsageTransactionService.reducer,
  [PaymentTransactionService.reducerPath]: PaymentTransactionService.reducer,
});

const reducer = rootReducer;

const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(middlewares as any) // add the custom middlewares
      .concat(thorMiddlewares as any) // add the thor generated middlewares
      .concat(BalanceResponseService.middleware)
      .concat(UsageTransactionService.middleware)
      .concat(PaymentTransactionService.middleware)
      .concat(AuthService.middleware)
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
