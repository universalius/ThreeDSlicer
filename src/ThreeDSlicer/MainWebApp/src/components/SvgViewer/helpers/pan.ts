import { ACTION_PAN, MODE_IDLE, MODE_PANNING } from '../constants';
import { SvgViewerDimensions, SvgViewerProps, SvgViewerState } from '../SvgViewer1';
import { Point, SvgViewBox, ViewerMouseAction } from '../types';
import { set, getSVGPoint, VieweroldState, getSVGPoint1 } from './common';
import { fromObject, translate, transform, applyToPoints, Matrix } from 'transformation-matrix';

type PanValue = ViewerValue & {
  d: number;
};

export const pan1 = ({
  svgViewbox,
  viewer,
  delta,
  transformMatrix,
  panLimit,
}: {
  svgViewbox: SvgViewBox;
  viewer: {
    width: number;
    height: number;
  };
  delta: {
    x: number;
    y: number;
  };
  transformMatrix: Matrix;
  panLimit?: number;
}): Matrix => {
  const { minX, minY, width, height } = svgViewbox;

  let matrix = transform(transformMatrix, translate(delta.x, delta.y));

  if (panLimit) {
    const [{ x: x1, y: y1 }, { x: x2, y: y2 }] = applyToPoints(matrix, [
      { x: minX + panLimit, y: minY + panLimit },
      { x: minX + width - panLimit, y: minY + height - panLimit },
    ]);

    let moveX = 0;
    if (viewer.width - x1 < 0) {
      moveX = viewer.width - x1;
    } else if (x2 < 0) {
      moveX = -x2;
    }

    let moveY = 0;
    if (viewer.height - y1 < 0) {
      moveY = viewer.height - y1;
    } else if (y2 < 0) {
      moveY = -y2;
    }

    matrix = transform(translate(moveX, moveY), matrix);
  }

  return transformMatrix;
};

export const pan = (
  oldState: SvgViewerState,
  delta: Point,
  dimensions: SvgViewerDimensions,
  panLimit?: number,
): Matrix => {
  // console.log('pan', delta);

  const { viewbox: svgViewbox, width: viewerWidth, height: viewerHeight } = dimensions;
  const { minX, minY, width, height } = svgViewbox;

  let matrix = transform(oldState.transformMatrix, translate(delta.x, delta.y));

  if (panLimit) {
    const [{ x: x1, y: y1 }, { x: x2, y: y2 }] = applyToPoints(matrix, [
      { x: minX + panLimit, y: minY + panLimit },
      { x: minX + width - panLimit, y: minY + height - panLimit },
    ]);

    let moveX = 0;
    if (viewerWidth - x1 < 0) {
      moveX = viewerWidth - x1;
    } else if (x2 < 0) {
      moveX = -x2;
    }

    let moveY = 0;
    if (viewerHeight - y1 < 0) {
      moveY = viewerHeight - y1;
    } else if (y2 < 0) {
      moveY = -y2;
    }

    matrix = transform(translate(moveX, moveY), matrix);
  }

  return matrix;
};

export const startPanning = (oldState: SvgViewerState, mousePos: Point): PanValue =>
  set(
    oldState,
    {
      mode: MODE_PANNING,
      startX: viewerX,
      startY: viewerY,
      endX: viewerX,
      endY: viewerY,
    },
    ACTION_PAN,
  ) as PanValue;

export const updatePanning = (oldState: SvgViewerState, mousePos: Point, dimensions: SvgViewerDimensions): PanValue => {
  if (oldState.action !== ViewerMouseAction.PANNING) {
    throw new Error(`update pan not allowed in this mode ${oldState.action}`);
  }

  const oldMousePos = oldState.mousePos;
  const start = getSVGPoint(oldState.transformMatrix, oldMousePos);
  const end = getSVGPoint(oldState.transformMatrix, mousePos);

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  return pan(oldState, { x: deltaX, y: deltaY }, dimensions);
};

export const stopPanning = (oldState: SvgViewerState): PanValue =>
  set(
    oldState,
    {
      mode: MODE_IDLE,
      startX: null,
      startY: null,
      endX: null,
      endY: null,
    },
    ACTION_PAN,
  ) as PanValue;

export const autoPanIfNeeded = (oldState: SvgViewerState, mousePos: Point): PanValue => {
  let deltaX = 0;
  let deltaY = 0;

  if (viewerY <= 20) deltaY = 2;
  if (oldState.viewerWidth - viewerX <= 20) deltaX = -2;
  if (oldState.viewerHeight - viewerY <= 20) deltaY = -2;
  if (viewerX <= 20) deltaX = 2;

  deltaX /= oldState.d;
  deltaY /= oldState.d;

  return deltaX === 0 && deltaY === 0 ? value : pan(oldState, deltaX, deltaY);
};
