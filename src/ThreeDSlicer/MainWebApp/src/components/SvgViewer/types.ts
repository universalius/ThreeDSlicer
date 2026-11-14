export type SvgViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type SvgElementProps = {
  viewBox?: string;
  width?: number;
  height?: number;
  children?: React.ReactNode;
};

export type Point = {
  x: number;
  y: number;
};

export enum ViewerMouseAction {
  IDLE = 'idle',
  PANNING = 'panning',
  ZOOMING = 'zooming',
}

export enum ViewerSvgAlign {
  CENTER = 'center',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
  COVER = 'cover',
}
