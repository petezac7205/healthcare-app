// Use VITE_API_URL from environment if available (for production), otherwise fallback to '/api' (for local dev proxy)
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      // Optionally dispatch an event or handle redirect
    }
    
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // If response is empty (like 204 No Content), don't try to parse json
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};
