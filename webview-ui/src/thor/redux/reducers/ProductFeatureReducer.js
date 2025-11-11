import { createSlice } from "@reduxjs/toolkit";
const ProductFeatureSlice = createSlice({
    name: "ProductFeatures",
    initialState: [],
    reducers: {
        ProductFeatureAdded(state, action) {
            state.push(action.payload);
        },
        ProductFeatureValueToggled(state, action) {
            console.log("ProductFeature TOGGLE");
            console.warn(JSON.stringify(action));
            const ProductFeature = state.find((ProductFeature) => ProductFeature.id === action.payload.ProductFeatureId);
            if (ProductFeature) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ProductFeaturepropertySet(state, action) {
            const ProductFeature = state.find((ProductFeature) => ProductFeature.id === action.payload.ProductFeatureId);
            if (ProductFeature) {
                //  ProductFeature[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ProductFeatureAdded, ProductFeatureValueToggled, ProductFeaturepropertySet } = ProductFeatureSlice.actions;
export default ProductFeatureSlice.reducer;
//# sourceMappingURL=ProductFeatureReducer.js.map