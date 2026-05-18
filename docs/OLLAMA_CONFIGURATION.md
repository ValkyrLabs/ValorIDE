# Ollama Configuration Guide for ValorIDE

## Quick Start with Recommended Models

### Fast Models (Recommended for Balance)

- **gemma4** - 9B parameter model, excellent speed and quality for most tasks
  ```bash
  ollama pull gemma4
  ```

### Alternative Fast Models

- **mistral** - 7B, very fast, good for simple tasks
- **neural-chat** - 7B, lightweight and performant
- **phi** - 2.7B, ultra-light for resource-constrained systems

### Larger Models (If You Have Resources)

- **llama2** - 70B, slower but higher quality (requires significant RAM)
- **mistral 7b instruct** - Good balance of speed and accuracy

## Timeout Configuration

ValorIDE's Ollama provider uses intelligent streaming with per-chunk timeouts to handle slow models gracefully.

### Default Timeouts

- **Stream initialization**: 30-120 seconds (depending on model size)
- **Per-chunk timeout**: 120 seconds per received chunk
- **Keep-alive**: 10 minutes (maintains persistent connections)

### Adjusting Timeout (if needed)

Edit your ValorIDE settings:

```json
{
  "ollama.timeout": "180000" // 180 seconds for very large models
}
```

## Performance Tuning

### Configuration for gemma4

```json
{
  "apiProvider": "ollama",
  "ollamaModelId": "gemma4",
  "ollamaBaseUrl": "http://localhost:11434",
  "ollamaRequestTimeout": "120000",
  "ollamaKeepAlive": "10m",
  "ollamaApiOptionsCtxNum": "32768",
  "ollamaTemperature": "0.7",
  "ollamaTopP": "0.9"
}
```

### Streaming Optimization

The Ollama provider now uses intelligent chunk buffering:

- Text chunks are batched for efficiency
- Usage stats only sent on completion
- Logging throttled to prevent spam

## Troubleshooting

### Issue: Timeouts on model startup

**Solution**: First run may take longer as the model loads into memory. Subsequent runs will be faster due to keep-alive.

- Ensure you have enough RAM (gemma4 needs ~5GB)
- Check: `ollama list` to see loaded models
- Try: Increase timeout to 180000ms temporarily

### Issue: Streaming stalls

**Solution**: The handler now gracefully handles stream pauses. This is normal for large models.

- The model is still processing, not timing out
- Consider switching to a faster model like gemma4 or mistral

### Issue: Connection refused

**Solution**: Ollama server not running

```bash
ollama serve
```

### Issue: Model not found

**Solution**: Pull the model first

```bash
ollama pull gemma4
```

## Memory Requirements

| Model       | Size | RAM Required | Speed       |
| ----------- | ---- | ------------ | ----------- |
| gemma4      | 9B   | 5-6 GB       | ⚡⚡⚡ Fast |
| mistral     | 7B   | 4-5 GB       | ⚡⚡⚡ Fast |
| neural-chat | 7B   | 4-5 GB       | ⚡⚡⚡ Fast |
| llama2      | 13B  | 8-10 GB      | ⚡⚡ Medium |
| llama2-70b  | 70B  | 40+ GB       | ⚡ Slow     |

## Advanced Configuration

### Context Window

```json
{
  "ollamaApiOptionsCtxNum": "32768" // Larger context for longer conversations
}
```

### Temperature (Creativity)

```json
{
  "ollamaTemperature": "0.3" // Lower = more deterministic (0.0-1.0)
}
```

### Top-P (Diversity)

```json
{
  "ollamaTopP": "0.7" // Lower = more focused (0.0-1.0)
}
```

### Top-K (Token filtering)

```json
{
  "ollamaTopK": "40" // Lower = more focused sampling
}
```

## Best Practices

1. **Always use gemma4 or mistral** for production use - they're fast and reliable
2. **Keep Ollama running** in the background with `ollama serve`
3. **Monitor memory** usage - check Task Manager or `free -h`
4. **Start small** - try gemma4, then upgrade if needed
5. **Disable GPU sharing** if you experience timeouts - focus resources on model

## See Also

- [Ollama Documentation](https://ollama.ai)
- [Model Library](https://ollama.ai/library)
