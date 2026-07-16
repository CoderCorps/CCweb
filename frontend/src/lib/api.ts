import { handleMockRequest } from "./mockDb";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Set to true to bypass backend completely for static frontend hosting/testing
const FORCE_MOCK = false;

let inMemoryToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getAccessToken = () => {
  return inMemoryToken;
};

async function silentRefresh(): Promise<string | null> {
  if (FORCE_MOCK) {
    setAccessToken("mock-access-token");
    return "mock-access-token";
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const data = await res.json();
      const newToken = data.access_token;
      setAccessToken(newToken);
      return newToken;
    } catch (err) {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest(path: string, options: RequestOptions = {}) {
  const method = options.method || "GET";
  
  // Extract body for mock database (parse JSON string if necessary)
  let requestBody = options.body;
  if (typeof options.body === "string") {
    try {
      requestBody = JSON.parse(options.body);
    } catch (e) {
      // Keep as string
    }
  }

  if (FORCE_MOCK) {
    const mockRes = handleMockRequest(path, method, requestBody as Record<string, unknown> | FormData | undefined);
    return mockRes as unknown as Response;
  }

  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!options.skipAuth) {
    let token = getAccessToken();
    if (!token) {
      token = await silentRefresh();
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && !options.skipAuth) {
      const newToken = await silentRefresh();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        return fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return response;
  } catch (err) {
    console.warn("Backend API server unreachable. Falling back to frontend mock database.", err);
    const mockRes = handleMockRequest(path, method, requestBody as Record<string, unknown> | FormData | undefined);
    return mockRes as unknown as Response;
  }
}

export const api = {
  get: (path: string, options?: RequestOptions) =>
    apiRequest(path, { ...options, method: "GET" }),
  
  post: (path: string, body: Record<string, unknown> | FormData, options?: RequestOptions) =>
    apiRequest(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  
  patch: (path: string, body: Record<string, unknown> | FormData, options?: RequestOptions) =>
    apiRequest(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  
  put: (path: string, body: Record<string, unknown> | FormData, options?: RequestOptions) =>
    apiRequest(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  
  delete: (path: string, options?: RequestOptions) =>
    apiRequest(path, { ...options, method: "DELETE" }),
};
