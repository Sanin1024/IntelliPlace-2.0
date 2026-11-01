import api from './client';
import type { AuthResponse, User } from '../types';

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  ktuid?: string;
  universityId?: string;
  branchId?: number;
  batchId?: number;
  admissionYear?: number;
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

export const forgotPassword = async (email: string) => {
  const res = await api.post<{ success: boolean; message: string; resetToken?: string }>(
    '/auth/forgot-password',
    { email }
  );
  return res.data;
};

export const resetPassword = async (data: { token: string; newPassword: string }) => {
  const res = await api.post<{ success: boolean; message: string }>('/auth/reset-password', data);
  return res.data;
};

export const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
  const res = await api.post<{ success: boolean; message: string; data?: { token: string } }>(
    '/auth/change-password',
    data
  );
  return res.data;
};
