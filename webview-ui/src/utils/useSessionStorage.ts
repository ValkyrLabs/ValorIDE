import { useCallback, useEffect, useState } from 'react';

/**
 * Custom hook for persisting state to sessionStorage with automatic save/restore
 * @param key - The sessionStorage key to use
 * @param initialValue - The initial value if nothing is stored
 * @returns [value, setValue, clearValue] - Similar to useState but with persistence
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from sessionStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Save to sessionStorage whenever value changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        sessionStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key]);

  // Clear the stored value
  const clearValue = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
}

/**
 * Hook specifically for persisting chat input state
 * Includes both text content and selected images
 */
export function useChatInputPersistence() {
  const [inputValue, setInputValue] = useSessionStorage('valoride-chat-input', '');
  const [selectedImages, setSelectedImages] = useSessionStorage<string[]>('valoride-chat-images', []);

  // Clear both input and images
  const clearChatInput = useCallback(() => {
    setInputValue('');
    setSelectedImages([]);
  }, [setInputValue, setSelectedImages]);

  return {
    inputValue,
    setInputValue,
    selectedImages,
    setSelectedImages,
    clearChatInput,
  };
}
