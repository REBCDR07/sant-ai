const DEFAULT_API_BASE_URL = 'http://localhost:3000';

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = (
  envApiBaseUrl && envApiBaseUrl.trim().length > 0
    ? envApiBaseUrl
    : DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

type ApiErrorPayload = {
  error?: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  const fallbackText = await response.text();
  return { error: fallbackText } as T;
}

export async function postJson<TResponse>(
  path: string,
  payload: unknown,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = await parseJsonResponse<ApiErrorPayload>(response);
    const detail = errorPayload.error || `Erreur serveur (${response.status})`;
    throw new Error(detail);
  }

  return parseJsonResponse<TResponse>(response);
}
