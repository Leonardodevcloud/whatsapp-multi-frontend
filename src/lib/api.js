// src/lib/api.js
// API layer — fetch com credentials e refresh automático

const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const { body, method = 'GET', headers = {} } = options;

  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Token expirado — tentar refresh
  if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/me') && !endpoint.includes('/auth/login')) {
    const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      // Retry original request
      response = await fetch(`${BASE_URL}${endpoint}`, config);
    } else {
      // Refresh falhou — NÃO redirecionar (deixar o React Router tratar via RotaProtegida)
      throw new ApiError('Sessão expirada', 401);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.erro || 'Erro na requisição', response.status, data);
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export { ApiError };
export default api;