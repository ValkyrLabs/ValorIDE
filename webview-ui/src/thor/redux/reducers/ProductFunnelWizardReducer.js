import { createSlice } from "@reduxjs/toolkit";
const ProductFunnelWizardSlice = createSlice({
    name: "ProductFunnelWizards",
    initialState: [],
    reducers: {
        ProductFunnelWizardAdded(state, action) {
            state.push(action.payload);
        },
        ProductFunnelWizardValueToggled(state, action) {
            console.log("ProductFunnelWizard TOGGLE");
            console.warn(JSON.stringify(action));
            const ProductFunnelWizard = state.find((ProductFunnelWizard) => ProductFunnelWizard.id === action.payload.ProductFunnelWizardId);
            if (ProductFunnelWizard) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ProductFunnelWizardpropertySet(state, action) {
            const ProductFunnelWizard = state.find((ProductFunnelWizard) => ProductFunnelWizard.id === action.payload.ProductFunnelWizardId);
            if (ProductFunnelWizard) {
                //  ProductFunnelWizard[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ProductFunnelWizardAdded, ProductFunnelWizardValueToggled, ProductFunnelWizardpropertySet } = ProductFunnelWizardSlice.actions;
export default ProductFunnelWizardSlice.reducer;
//# sourceMappingURL=ProductFunnelWizardReducer.js.map