import api from './client';
import type { AuthResponse, User } from '../types';

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  knowledgeLevel: string;
}) => {
  const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
  return res.data.data;
};

export const loginUser = async (data: { email: string; password: string }) => {
  const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', data);
  return res.data.data;
};

export const getMe = async () => {
  const res = await api.get<{ success: boolean; data: User & { studentProfile?: any } }>('/auth/me');
  return res.data.data;
};