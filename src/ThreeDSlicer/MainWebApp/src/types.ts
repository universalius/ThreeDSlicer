export enum Axises {
  XY,
  XZ,
  YZ,
}

export type WebViewMessage = {
  type?: string
  axis?: Axises
  relativePosition?: number
  svg?: string
}

export type WebViewBridge = {
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => void
  removeEventListener: (type: string, listener: (event: MessageEvent) => void) => void
  postMessage: (message: string) => void
}
