import {MODE_IDLE} from '../constants';
import {applyToPoint, fromObject, identity, inverse, scale, transform, translate} from 'transformation-matrix';

const VERSION = 3;
export const DEFAULT_MODE = MODE_IDLE;

export type MatrixLike = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type ViewerValue = MatrixLike & {
  version: number;
  mode: string;
  focus: boolean;
  pinchPointDistance: number | null;
  prePinchMode: string | null;
  viewerWidth: number;
  viewerHeight: number;
  SVGMinX: number;
  SVGMinY: number;
  SVGWidth: number;
  SVGHeight: number;
  scaleFactorMin: number | null;
  scaleFactorMax: number | null;
  startX: number | null;
  startY: number | null;
  endX: number | null;
  endY: number | null;
  miniatureOpen: boolean;
  lastAction: string | null;
  [key: string]: unknown;
};

// export const getDefaultValue = (
//   viewerWidth: number,
//   viewerHeight: number,
//   SVGMinX: number,
//   SVGMinY: number,
//   SVGWidth: number,
//   SVGHeight: number,
//   scaleFactorMin: number | null = null,
//   scaleFactorMax: number | null = null,
// ): ViewerValue => set({}, {
//   ...identity(),
//   version: VERSION,
//   mode: DEFAULT_MODE,
//   focus: false,
//   pinchPointDistance: null,
//   prePinchMode: null,
//   viewerWidth,
//   viewerHeight,
//   SVGMinX,
//   SVGMinY,
//   SVGWidth,
//   SVGHeight,
//   scaleFactorMin,
//   scaleFactorMax,
//   startX: null,
//   startY: null,
//   endX: null,
//   endY: null,
//   miniatureOpen: true,
//   lastAction: null,
// });

export const set = <T extends Record<string, unknown>>(
  value: T,
  patch: Partial<T>,
  action: string | null = null,
): T => Object.freeze({
  ...value,
  ...patch,
  lastAction: action,
}) as T;

export const isValueValid = (value: unknown): value is ViewerValue => {
  return value !== null
    && typeof value === 'object'
    && Object.prototype.hasOwnProperty.call(value, 'version')
    && (value as ViewerValue).version === VERSION;
};

export const getSVGPoint = (value: ViewerValue, viewerX: number, viewerY: number) => {
  const matrix = fromObject(value);
  const inverseMatrix = inverse(matrix);

  return applyToPoint(inverseMatrix, {x: viewerX, y: viewerY});
};

export const decompose = (value: ViewerValue) => {
  const matrix = fromObject(value);

  return {
    scaleFactor: matrix.a,
    translationX: matrix.e,
    translationY: matrix.f,
  };
};

export const setFocus = (value: ViewerValue, focus: boolean): ViewerValue => set(value, {focus});

export const setViewerSize = (value: ViewerValue, viewerWidth: number, viewerHeight: number): ViewerValue =>
  set(value, {viewerWidth, viewerHeight});

export const setSVGViewBox = (
  value: ViewerValue,
  SVGMinX: number,
  SVGMinY: number,
  SVGWidth: number,
  SVGHeight: number,
): ViewerValue => set(value, {SVGMinX, SVGMinY, SVGWidth, SVGHeight});

export const setZoomLevels = (value: ViewerValue, scaleFactorMin: number | null, scaleFactorMax: number | null): ViewerValue =>
  set(value, {scaleFactorMin, scaleFactorMax});

export const setPointOnViewerCenter = (
  value: ViewerValue,
  SVGPointX: number,
  SVGPointY: number,
  zoomLevel: number,
): ViewerValue => {
  const {viewerWidth, viewerHeight} = value;

  const matrix = transform(
    translate(-SVGPointX + viewerWidth / 2, -SVGPointY + viewerHeight / 2),
    translate(SVGPointX, SVGPointY),
    scale(zoomLevel, zoomLevel),
    translate(-SVGPointX, -SVGPointY),
  );

  return set(value, {
    mode: MODE_IDLE,
    ...matrix,
  });
};

export const reset = (value: ViewerValue): ViewerValue => set(value, {
  mode: MODE_IDLE,
  ...identity(),
});

export const resetMode = (value: ViewerValue): ViewerValue => set(value, {
  mode: DEFAULT_MODE,
  startX: null,
  startY: null,
  endX: null,
  endY: null,
});
