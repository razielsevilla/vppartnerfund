const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  displayName: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export const loginRequest = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Login failed");
  }

  return response.json();
};

export const sessionRequest = async (token: string): Promise<{ user: AuthUser }> => {
  const response = await fetch(`${API_URL}/auth/session`, {
    method: "GET",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error("Session invalid");
  }

  return response.json();
};

export const logoutRequest = async (token: string): Promise<void> => {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: authHeaders(token),
  });
};
