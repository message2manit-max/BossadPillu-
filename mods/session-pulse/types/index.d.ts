export type Pulse = { turns: number; tools: number; lastSeconds: number | null }

declare module 'claude-code' {
  interface PluginState {
    'session-pulse': { pulse: Pulse; isHidden: boolean }
  }
}
