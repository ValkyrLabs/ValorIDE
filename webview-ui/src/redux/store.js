// CUSTOM REDUX INTEGRATION
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { AuthService } from "./services/AuthService";
import { LogoutService } from "./services/LogoutService";
import { ApplicationService } from "./services/ApplicationService";
import { PrincipalService } from "./services/PrincipalService";
import { ThorHostingService } from "./services/ThorHostingService";
import { BalanceResponseService } from "..//redux/services/BalanceResponseService";
import { UsageTransactionService } from "..//redux/services/UsageTransactionService";
import { PaymentTransactionService } from "..//redux/services/PaymentTransactionService";
import { DigitalProductService } from "./services/DigitalProductService";
import { creditsApi } from "../services/creditsApi";
// cool!
import { websocketMiddleware } from "./middleware/websocketMiddleware";
import websocketReducer from "../components/ServerConsole/websocketSlice";
// import the thorapi generated reducers and middleware
import middlewares from "../redux/middlewares";
import thorMiddlewares from "..//redux/middlewares";
import { reducer as thorReducer } from "..//redux/store";
// combine reducers
const rootReducer = combineReducers({
    ...thorReducer,
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
    [creditsApi.reducerPath]: creditsApi.reducer,
});
const reducer = rootReducer;
const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        .concat(middlewares) // add the custom middlewares
        .concat(thorMiddlewares) // add the  generated middlewares
        .concat(BalanceResponseService.middleware)
        .concat(UsageTransactionService.middleware)
        .concat(PaymentTransactionService.middleware)
        .concat(AuthService.middleware)
        .concat(ApplicationService.middleware)
        .concat(PrincipalService.middleware)
        .concat(ThorHostingService.middleware)
        .concat(DigitalProductService.middleware)
        .concat(creditsApi.middleware)
        .concat(websocketMiddleware),
});
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);
export default store;
//# sourceMappingURL=store.js.map