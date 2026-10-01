import { useState, useEffect, useCallback } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';
import { addToHistory } from '../utils/history';
import { STORAGE_KEYS, parseHistory } from '../utils/persisted';

interface UsePromptHistoryReturn {
  history: string[];
  addPrompt: (prompt: string) => void;
  removePrompt: (prompt: string) => void;
  clearHistory: () => void;
}

export function usePromptHistory(): UsePromptHistoryReturn {
  const [history, setHistory] = useState(() =>
    parseHistory(loadJSON(STORAGE_KEYS.history, [])),
  );

  useEffect(() => {
    saveJSON(STORAGE_KEYS.history, history);
  }, [history]);

  const addPrompt = useCallback((prompt: string) => {
    setHistory((prev) => addToHistory(prev, prompt));
  }, []);

  const removePrompt = useCallback((prompt: string) => {
    setHistory((prev) => prev.filter((item) => item !== prompt));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addPrompt, removePrompt, clearHistory };
}
