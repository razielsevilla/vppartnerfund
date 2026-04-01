const isProduction = import.meta.env.PROD;

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (isProduction ? "/api" : "http://localhost:4000/api");
