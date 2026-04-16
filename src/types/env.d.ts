declare module '@env' {
  export const API_URL: string;
}

declare var crypto: {
  getRandomValues(array: Uint8Array): Uint8Array;
};
