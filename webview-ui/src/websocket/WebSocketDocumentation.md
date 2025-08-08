# WebSocket Integration in React Frontend

This document provides comprehensive examples and documentation for WebSocket integration in React frontend.

## Overview

This project uses React, Redux, and WebSockets to provide real-time communication between the client and server. The WebSocket connection is managed by the `useWebSocket` hook, which dispatches events to the Redux store. The `WebSocketStatus` component displays the events from the store.

## Components

*   `WebSocketContext.tsx`: Defines the WebSocket context using React's `createContext`.
*   `useWebSocket.ts`: Manages the WebSocket connection using the `useWebSocket` hook.
*   `websocket.ts`: Contains the WebSocket URL.
*   `WebSocketStatus.tsx`: Displays the WebSocket connection status.
*   `WebSocketExample.tsx`: Provides an example of sending messages through the WebSocket.
*   `redux/websocketSlice.ts`: Defines the Redux slice for managing WebSocket events.
*   `redux/store.ts`: Configures the Redux store.

## Usage

1.  Import the `useWebSocket` hook and the `WebSocketProvider` component.
2.  Wrap your application with the `WebSocketProvider` component.
3.  Use the `useWebSocket` hook to manage the WebSocket connection.
4.  Use the `useWebSocketContext` hook to access the `sendMessage` function.
5.  Dispatch WebSocket events to the Redux store using the `dispatch` function.
6.  Display the WebSocket events from the Redux store using the `useSelector` hook.

## Example

```jsx
import React, { useState } from 'react';
import { useWebSocketContext } from '../websocket/WebSocketContext';

const WebSocketExample = () => {
  const { sendMessage } = useWebSocketContext();
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    sendMessage(message);
    setMessage('');
  };

  return (
    <div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
};

export default WebSocketExample;
```

## Redux Store

The Redux store is configured in the `redux/store.ts` file. The store contains a single reducer called `websocketReducer`, which is defined in the `redux/websocketSlice.ts` file. The `websocketReducer` manages the WebSocket events.

## WebSocket Events

The following WebSocket events are dispatched to the Redux store:

*   `connection`: Dispatched when the WebSocket connection is opened or closed.
*   `message`: Dispatched when a message is received from the server.
*   `error`: Dispatched when an error occurs.
*   `log`: Dispatched when a message is sent or received.

## Conclusion

This document provides comprehensive examples and documentation for WebSocket integration in React frontend. By following these examples, you can easily integrate WebSockets into your React applications.
