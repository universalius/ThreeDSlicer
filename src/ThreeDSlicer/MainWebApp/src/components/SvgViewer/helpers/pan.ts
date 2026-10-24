import {ACTION_PAN, MODE_IDLE, MODE_PANNING} from '../constants';
import {set, getSVGPoint, ViewerValue} from './common';
import {fromObject, translate, transform, applyToPoints} from 'transformation-matrix';

type PanValue = ViewerValue & {
  d: number;
};

export const pan = (value: PanValue, SVGDeltaX: number, SVGDeltaY: number, panLimit?: number): PanValue => {
  let matrix = transform(
    fromObject(value),
    translate(SVGDeltaX, SVGDeltaY)
  );

  if (panLimit) {
    const [{x: x1, y: y1}, {x: x2, y: y2}] = applyToPoints(matrix, [
      {x: value.SVGMinX + panLimit, y: value.SVGMinY + panLimit},
      {x: value.SVGMinX + value.SVGWidth - panLimit, y: value.SVGMinY + value.SVGHeight - panLimit}
    ]);

    let moveX = 0;
    if (value.viewerWidth - x1 < 0) {
      moveX = value.viewerWidth - x1;
    } else if (x2 < 0) {
      moveX = -x2;
    }

    let moveY = 0;
    if (value.viewerHeight - y1 < 0) {
      moveY = value.viewerHeight - y1;
    } else if (y2 < 0) {
      moveY = -y2;
    }

    matrix = transform(
      translate(moveX, moveY),
      matrix
    );
  }

  return set(value, {
    mode: MODE_IDLE,
    ...matrix,
  }, ACTION_PAN) as PanValue;
};

export const startPanning = (value: PanValue, viewerX: number, viewerY: number): PanValue => set(value, {
  mode: MODE_PANNING,
  startX: viewerX,
  startY: viewerY,
  endX: viewerX,
  endY: viewerY
}, ACTION_PAN) as PanValue;

export const updatePanning = (value: PanValue, viewerX: number, viewerY: number, panLimit?: number): PanValue => {
  if (value.mode !== MODE_PANNING) {
    throw new Error(`update pan not allowed in this mode ${value.mode}`);
  }

  const {endX = 0, endY = 0} = value;
  const start = getSVGPoint(value, endX, endY);
  const end = getSVGPoint(value, viewerX, viewerY);

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  const nextValue = pan(value, deltaX, deltaY, panLimit);
  return set(nextValue, {
    mode: MODE_PANNING,
    endX: viewerX,
    endY: viewerY,
  }, ACTION_PAN) as PanValue;
};

export const stopPanning = (value: PanValue): PanValue => set(value, {
  mode: MODE_IDLE,
  startX: null,
  startY: null,
  endX: null,
  endY: null
}, ACTION_PAN) as PanValue;

export const autoPanIfNeeded = (value: PanValue, viewerX: number, viewerY: number): PanValue => {
  let deltaX = 0;
  let deltaY = 0;

  if (viewerY <= 20) deltaY = 2;
  if (value.viewerWidth - viewerX <= 20) deltaX = -2;
  if (value.viewerHeight - viewerY <= 20) deltaY = -2;
  if (viewerX <= 20) deltaX = 2;

  deltaX /= value.d;
  deltaY /= value.d;

  return deltaX === 0 && deltaY === 0 ? value : pan(value, deltaX, deltaY);
};
