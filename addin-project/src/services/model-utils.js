// Minimal model utilities (verify values in vendor docs as needed)
export function getModelContextWindow(model) {
  const map = {
    'gemini-1.5-flash': 8192,
    'gemini-1.5': 32768,
    'gemini-1.5-pro': 131072,
  };
  return map[model] || 8192; // conservative default
}

export function approxTokensFromWords(wordCount) {
  return Math.ceil(wordCount * 1.33);
}

export function approxTokensFromChars(charCount) {
  return Math.ceil(charCount / 4); // rough heuristic
}
