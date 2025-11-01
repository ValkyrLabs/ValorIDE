import { createSlice } from "@reduxjs/toolkit";

import { OrderFulfillmentTask } from '@thor/model/OrderFulfillmentTask';

const OrderFulfillmentTaskSlice = createSlice({
  name: "OrderFulfillmentTasks",
  initialState: [],

  reducers: {
    OrderFulfillmentTaskAdded(state, action) {
      state.push(action.payload);
    },

    OrderFulfillmentTaskValueToggled(state, action) {
      console.log("OrderFulfillmentTask TOGGLE")
      console.warn(JSON.stringify(action))
      const OrderFulfillmentTask:OrderFulfillmentTask = state.find((OrderFulfillmentTask) => OrderFulfillmentTask.id === action.payload.OrderFulfillmentTaskId);
      if (OrderFulfillmentTask) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    OrderFulfillmentTaskpropertySet(state, action) {
      const OrderFulfillmentTask = state.find((OrderFulfillmentTask) => OrderFulfillmentTask.id === action.payload.OrderFulfillmentTaskId);
      if (OrderFulfillmentTask) {
      //  OrderFulfillmentTask[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  OrderFulfillmentTaskAdded,
  OrderFulfillmentTaskValueToggled,
  OrderFulfillmentTaskpropertySet
} = OrderFulfillmentTaskSlice.actions;
export default OrderFulfillmentTaskSlice.reducer;
