import { apiFetch } from './api';

export const authService = {
  login: async (email: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    
    console.log(`[authService] Attempting login via apiFetch to: /auth/login`);
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    
    localStorage.setItem('token', data.access_token);
    return data;
  },
  
  register: async (email: string, password: string) => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  logout: () => {
    localStorage.removeItem('token');
  },
  
  getMe: async () => {
    return apiFetch('/auth/me');
  }
};
