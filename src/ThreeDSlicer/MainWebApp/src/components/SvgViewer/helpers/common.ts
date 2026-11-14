import { MODE_IDLE } from '../constants';
import type { Point, SvgViewBox } from '../types';
import {
  applyToPoint,
  fromObject,
  identity,
  inverse,
  Matrix,
  scale,
  transform,
  translate,
} from 'transformation-matrix';

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

export const set = <T extends Record<string, unknown>>(value: T, patch: Partial<T>, action: string | null = null): T =>
  Object.freeze({
    ...value,
    ...patch,
    lastAction: action,
  }) as T;

export const isValueValid = (value: unknown): value is SvgViewerState => {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'version') &&
    (value as SvgViewerState).version === VERSION
  );
};

export const getSVGPoint = (matrix: Matrix, mousePos: Point) => {
  // console.log('matrix', matrix);
  const inverseMatrix = inverse(matrix);

  return applyToPoint(inverseMatrix, mousePos);
};

export const decompose = (value: SvgViewerState) => {
  const matrix = fromObject(value);

  return {
    scaleFactor: matrix.a,
    translationX: matrix.e,
    translationY: matrix.f,
  };
};

export const setFocus = (value: SvgViewerState, focus: boolean): SvgViewerState => set(value, { focus });

export const setViewerSize = (value: SvgViewerState, viewerWidth: number, viewerHeight: number): SvgViewerState =>
  set(value, { viewerWidth, viewerHeight });

export const setSVGViewBox = (value: SvgViewerState, svgViewbox: SvgViewBox): SvgViewerState =>
  set(value, { svgViewbox });

export const setZoomLevels = (
  value: SvgViewerState,
  scaleFactorMin: number | null,
  scaleFactorMax: number | null,
): SvgViewerState => set(value, { scaleFactorMin, scaleFactorMax });

export const setPointOnViewerCenter = (
  value: SvgViewerState,
  SVGPointX: number,
  SVGPointY: number,
  zoomLevel: number,
): SvgViewerState => {
  const { viewerWidth, viewerHeight } = value;

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

export const reset = (value: SvgViewerState): SvgViewerState =>
  set(value, {
    mode: MODE_IDLE,
    ...identity(),
  });

export const resetMode = (value: SvgViewerState): SvgViewerState =>
  set(value, {
    mode: DEFAULT_MODE,
    startX: null,
    startY: null,
    endX: null,
    endY: null,
  });
