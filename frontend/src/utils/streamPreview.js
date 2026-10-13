function partialJsonString(text, field) {
  const marker = `"${field}"`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return '';

  const colonIndex = text.indexOf(':', markerIndex + marker.length);
  if (colonIndex === -1) return '';

  const quoteIndex = text.indexOf('"', colonIndex + 1);
  if (quoteIndex === -1) return '';

  let escaped = false;
  let endIndex = quoteIndex + 1;
  for (; endIndex < text.length; endIndex++) {
    const char = text[endIndex];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      break;
    }
  }

  let content = text.slice(quoteIndex + 1, endIndex);
  while (content) {
    try {
      return JSON.parse(`"${content}"`);
    } catch {
      content = content.slice(0, -1);
    }
  }

  return '';
}

export function getStreamPreview(text, fields) {
  return fields
    .map(({ key, label }) => ({
      label,
      text: partialJsonString(text, key)
    }))
    .filter(({ text }) => text);
}
