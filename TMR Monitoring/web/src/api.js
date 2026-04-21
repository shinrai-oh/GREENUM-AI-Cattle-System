import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1/tmr',
});

// Attach stored JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tmr_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// On 401 clear the stored token so the login screen shows
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tmr_token');
      // Trigger re-render by dispatching a storage event
      window.dispatchEvent(new Event('tmr-auth-expired'));
    }
    return Promise.reject(err);
  }
);

export async function login(username, password) {
  const res = await axios.post('/api/v1/auth/login', { username, password });
  const token = res.data.token;
  localStorage.setItem('tmr_token', token);
  return token;
}

export function logout() {
  localStorage.removeItem('tmr_token');
}

export function getToken() {
  return localStorage.getItem('tmr_token');
}
