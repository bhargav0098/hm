import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import toast from 'react-hot-toast';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      setLoading: (isLoading) => set({ isLoading }),

      login: async (email, password, rememberMe) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password, rememberMe });
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false
          });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          toast.success('Welcome back! 👋');
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, message: err.response?.data?.message || 'Login failed' };
        }
      },

      register: async (fullName, email, password, gender) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { fullName, email, password, gender });
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false
          });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          toast.success('Account created! 🎉');
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, message: err.response?.data?.message || 'Registration failed' };
        }
      },


      logout: async () => {
        try {
          await api.post('/auth/logout', { refreshToken: get().refreshToken });
        } catch {}
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        toast.success('Logged out successfully');
      },

      updateUser: (userData) => set({ user: { ...get().user, ...userData } }),

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user });
        } catch {}
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
