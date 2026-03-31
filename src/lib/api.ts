import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Interceptor to add Firebase ID Token to all requests
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting Firebase ID Token:', error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
