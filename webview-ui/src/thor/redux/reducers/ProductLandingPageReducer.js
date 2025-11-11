import { createSlice } from "@reduxjs/toolkit";
const ProductLandingPageSlice = createSlice({
    name: "ProductLandingPages",
    initialState: [],
    reducers: {
        ProductLandingPageAdded(state, action) {
            state.push(action.payload);
        },
        ProductLandingPageValueToggled(state, action) {
            console.log("ProductLandingPage TOGGLE");
            console.warn(JSON.stringify(action));
            const ProductLandingPage = state.find((ProductLandingPage) => ProductLandingPage.id === action.payload.ProductLandingPageId);
            if (ProductLandingPage) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ProductLandingPagepropertySet(state, action) {
            const ProductLandingPage = state.find((ProductLandingPage) => ProductLandingPage.id === action.payload.ProductLandingPageId);
            if (ProductLandingPage) {
                //  ProductLandingPage[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ProductLandingPageAdded, ProductLandingPageValueToggled, ProductLandingPagepropertySet } = ProductLandingPageSlice.actions;
export default ProductLandingPageSlice.reducer;
//# sourceMappingURL=ProductLandingPageReducer.js.map