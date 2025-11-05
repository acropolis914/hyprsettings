// globals.d.ts
declare global {
  interface Window {
    config: {
      apiUrl: string;
      debug?: boolean;
      // … whatever shape you want
    };
  }
}

export {};
