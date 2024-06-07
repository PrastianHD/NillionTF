declare module 'prompt-sync' {
  interface Prompt {
    (ask: string): string;
    (ask: string, options: { echo: string }): string;
    (ask: string, options: { value: string }): string;
    (ask: string, options: { ask: string }): string;
    history: string[];
  }
  const prompt: (options?: { sigint: boolean }) => Prompt;
  export default prompt;
}
