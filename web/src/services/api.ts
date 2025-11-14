import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL
});

export type ApiError = {
  message: string;
};

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    if (error.response) {
      // Erro com resposta do servidor
      return error.response.data?.message ?? error.message;
    } else if (error.request) {
      // Requisição foi feita mas não houve resposta
      console.error('Erro de rede - servidor não respondeu:', error.request);
      return 'Não foi possível conectar ao servidor. Verifique se o servidor está rodando.';
    } else {
      // Erro ao configurar a requisição
      console.error('Erro ao configurar requisição:', error.message);
      return error.message;
    }
  }
  if (error instanceof Error) {
    console.error('Erro desconhecido:', error);
    return error.message;
  }
  console.error('Erro inesperado:', error);
  return 'Ocorreu um erro inesperado. Tente novamente.';
};

export const adminLogin = async (email: string, password: string): Promise<{ token: string }> => {
  try {
    const response = await api.post('/admin/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};
