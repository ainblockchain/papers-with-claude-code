declare module 'ws' {
  export default class WebSocket {
    constructor(url: string);
    readyState: number;
    send(data: string): void;
    close(): void;
    addEventListener(event: string, handler: (e: any) => void): void;
    removeEventListener(event: string, handler: (e: any) => void): void;
  }
}
