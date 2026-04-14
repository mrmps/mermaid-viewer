import type { UIMessage } from "ai";

export const MAX_CHAT_MESSAGES = 50;
export const MAX_CHAT_REQUEST_BYTES = 1_000_000;

const utf8Encoder = new TextEncoder();

export function getUtf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}

export function getJsonByteLength(value: unknown): number {
  return getUtf8ByteLength(JSON.stringify(value));
}

export function formatByteCount(bytes: number): string {
  if (bytes < 1_000) {
    return `${bytes} bytes`;
  }

  const units = [
    { size: 1_000_000, suffix: "MB" },
    { size: 1_000, suffix: "KB" },
  ];

  for (const unit of units) {
    if (bytes >= unit.size) {
      return `${(bytes / unit.size).toFixed(1)} ${unit.suffix}`;
    }
  }

  return `${bytes} bytes`;
}

export function getChatRequestTooLargeMessage(actualBytes: number): string {
  return `Chat request is too large (${formatByteCount(actualBytes)}). The limit is ${formatByteCount(MAX_CHAT_REQUEST_BYTES)}. Clear chat history or split the article into smaller parts and try again.`;
}

export function getChatRequestTooLargeError(
  body: unknown
): { actualBytes: number; message: string } | null {
  const actualBytes = getJsonByteLength(body);

  if (actualBytes <= MAX_CHAT_REQUEST_BYTES) {
    return null;
  }

  return {
    actualBytes,
    message: getChatRequestTooLargeMessage(actualBytes),
  };
}

export function getChatErrorMessage(error?: Error): string | undefined {
  const rawMessage = error?.message?.trim();
  if (!rawMessage) return undefined;

  try {
    const parsed = JSON.parse(rawMessage) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    // Fall back to the original message when the transport does not return JSON.
  }

  return rawMessage;
}

export function createTextOnlyUserMessage(text: string): UIMessage {
  return {
    id: "preview-user-message",
    role: "user",
    parts: [{ type: "text", text }],
  };
}
