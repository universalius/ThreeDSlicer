export enum Axises {
  XY,
  XZ,
  YZ,
}


export type CrossSectionData = {
  svg?: string
}

export type ObjData = {
  obj?: string
}

export type WebViewMessage<T> = {
  type?: string,
  data: T
}

export type WebViewResponse<T> = {
  type?: string,
  data: T
}

export type WebViewBridge = {
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => void
  removeEventListener: (type: string, listener: (event: MessageEvent) => void) => void
  postMessage: (message: string) => void
}
