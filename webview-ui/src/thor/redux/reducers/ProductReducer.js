import { createSlice } from "@reduxjs/toolkit";
const ProductSlice = createSlice({
    name: "Products",
    initialState: [],
    reducers: {
        ProductAdded(state, action) {
            state.push(action.payload);
        },
        ProductValueToggled(state, action) {
            console.log("Product TOGGLE");
            console.warn(JSON.stringify(action));
            const Product = state.find((Product) => Product.id === action.payload.ProductId);
            if (Product) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ProductpropertySet(state, action) {
            const Product = state.find((Product) => Product.id === action.payload.ProductId);
            if (Product) {
                //  Product[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ProductAdded, ProductValueToggled, ProductpropertySet } = ProductSlice.actions;
export default ProductSlice.reducer;
//# sourceMappingURL=ProductReducer.js.map