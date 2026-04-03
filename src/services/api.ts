import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000', // depois você troca pra produção
});