/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        platform: string;
        send: (channel: string, data: unknown) => void;
        receive: (channel: string, callback: (...args: unknown[]) => void) => void;
    };
}
