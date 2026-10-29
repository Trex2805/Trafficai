export type AccountRole = 'user' | 'developer' | 'authority';
export type RequestedRole = AccountRole;
export type AccountStatus = 'active' | 'pending' | 'disabled';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  requested_role: RequestedRole;
  status: AccountStatus;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

interface RegisterResponse {
  message: string;
  user: AuthUser;
}

const API_ROOT = '/api/v1/auth';
const TOKEN_KEY = 'trafficai.accessToken';

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      typeof body.detail === 'string'
        ? body.detail
        : `Request failed with status ${response.status}`;

    throw new Error(detail);
  }

  return body as T;
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem('trafficai.user');
  // Remove the old mock session so it cannot restore a fake login.
  localStorage.removeItem('user');
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`${API_ROOT}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const result = await readJson<LoginResponse>(response);

  sessionStorage.setItem(TOKEN_KEY, result.access_token);
  sessionStorage.setItem('trafficai.user', JSON.stringify(result.user));
  localStorage.removeItem('user');

  return result.user;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  requested_role: RequestedRole;
}): Promise<RegisterResponse> {
  const response = await fetch(`${API_ROOT}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return readJson<RegisterResponse>(response);
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('No active session.');
  }

  const response = await fetch(`${API_ROOT}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await readJson<{ user: AuthUser }>(response);
  sessionStorage.setItem('trafficai.user', JSON.stringify(result.user));

  return result.user;
}

export async function fetchAuthenticatedBlobUrl(
  input: RequestInfo | URL,
): Promise<string> {
  const response = await authenticatedFetch(input);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body && typeof body.detail === 'string'
        ? body.detail
        : `Could not load protected media (${response.status}).`;
    throw new Error(message);
  }

  return URL.createObjectURL(await response.blob());
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
