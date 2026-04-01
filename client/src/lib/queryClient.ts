import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || text);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(text);
      }
      throw e;
    }
  }
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function apiRequest(method, url, data) {
  const cleanBase = API_BASE.replace(/\/$/, ""); // remove ending /
  const cleanUrl = url.startsWith("/") ? url : `/${url}`; // ensure one /

  const res = await fetch(`${cleanBase}${cleanUrl}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.message?.includes("401") || error?.message?.includes("403") || error?.message?.includes("404")) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: false,
    },
  },
});
