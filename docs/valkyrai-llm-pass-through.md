Valkyrai LLM Pass-Through: Client Connection Guide

- Endpoint: `POST http(s)://<your-valkyrai-host>/v1/llm-details/{serviceId}/chat`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your-jwt-token>` (if required)
- Body (ChatMessage):
  - `{ "role": "user", "content": "What is the capital of France?" }`

Example curl

curl -X POST "http://localhost:8080/v1/llm-details/123e4567-e89b-12d3-a456-426614174000/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "role": "user",
    "content": "What is the capital of France?"
  }'

Sample Response

{
  "content": "The capital of France is Paris."
}

LlmDetails Configuration (OpenAI pass-through)

- provider: `openai`
- apiType: `openai`
- apiKey: Your OpenAI API key (store securely)
- url: `https://api.openai.com/v1/chat/completions` (or your custom endpoint)
- version: e.g., `gpt-4o` (the model name)
- temperature: optional, e.g. `0.2`
- initialPrompt: optional, system prompt for the model

Summary

Configure a `LlmDetails` record for your target provider/model, note its `id` (UUID), then POST a ChatMessage to `/v1/llm-details/{serviceId}/chat`. The Valkyrai server routes the request to the upstream model and returns the response content.

