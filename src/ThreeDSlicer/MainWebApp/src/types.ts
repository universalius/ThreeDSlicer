export type WebViewMessage = {
  type?: string
  svg?: string
}

export type WebViewBridge = {
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => void
  removeEventListener: (type: string, listener: (event: MessageEvent) => void) => void
  postMessage: (message: string) => void
}
