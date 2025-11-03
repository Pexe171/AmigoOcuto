import axios from 'axios';

export const api = axios.create({
  baseURL: '/api'
});

export type ApiError = {
  message: string;
};

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
};
