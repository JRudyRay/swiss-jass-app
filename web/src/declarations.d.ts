declare module '*.png' {
  const value: string;
  export default value;
}

// Fallback type shim for environments where socket.io-client types are not resolved
declare module 'socket.io-client' {
  export type Socket = any;
  export function io(url?: string, opts?: any): Socket;
}
