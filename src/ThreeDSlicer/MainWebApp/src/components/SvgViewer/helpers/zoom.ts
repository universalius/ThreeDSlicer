import {fromObject, scale, transform, translate} from 'transformation-matrix';

import {
  ACTION_ZOOM,
  ALIGN_BOTTOM,
  ALIGN_CENTER,
  ALIGN_COVER,
  ALIGN_LEFT,
  ALIGN_RIGHT,
  ALIGN_TOP,
  MODE_IDLE,
  MODE_ZOOMING,
} from '../constants';
import {type ViewerValue, decompose, getSVGPoint, set} from './common';
import calculateBox from '../utils/calculateBox';

type ZoomValue = ViewerValue & {
  d: number;
};

export const isZoomLevelGoingOutOfBounds = (value: ZoomValue, scaleFactor: number): boolean => {
  const {scaleFactor: curScaleFactor} = decompose(value);
  const lessThanScaleFactorMin = value.scaleFactorMin !== null && (curScaleFactor * scaleFactor) < value.scaleFactorMin;
  const moreThanScaleFactorMax = value.scaleFactorMax !== null && (curScaleFactor * scaleFactor) > value.scaleFactorMax;

  return (lessThanScaleFactorMin && scaleFactor < 1) || (moreThanScaleFactorMax && scaleFactor > 1);
};

export const limitZoomLevel = (value: ZoomValue, matrix: Record<string, number>) => {
  let scaleLevel = matrix.a;

  if (value.scaleFactorMin != null) {
    scaleLevel = Math.max(scaleLevel, value.scaleFactorMin);
  }

  if (value.scaleFactorMax != null) {
    scaleLevel = Math.min(scaleLevel, value.scaleFactorMax);
  }

  return set(matrix as ZoomValue, {
    a: scaleLevel,
    d: scaleLevel,
  });
};

export const zoom = (value: ZoomValue, SVGPointX: number, SVGPointY: number, scaleFactor: number): ZoomValue => {
  if (isZoomLevelGoingOutOfBounds(value, scaleFactor)) {
    return value;
  }

  const matrix = transform(
    fromObject(value),
    translate(SVGPointX, SVGPointY),
    scale(scaleFactor, scaleFactor),
    translate(-SVGPointX, -SVGPointY),
  );

  return set(value, {
    mode: MODE_IDLE,
    ...matrix,
    startX: null,
    startY: null,
    endX: null,
    endY: null,
  }, ACTION_ZOOM) as ZoomValue;
};

export const fitSelection = (
  value: ZoomValue,
  selectionSVGPointX: number,
  selectionSVGPointY: number,
  selectionWidth: number,
  selectionHeight: number,
): ZoomValue => {
  const {viewerWidth, viewerHeight} = value;
  const scaleX = viewerWidth / selectionWidth;
  const scaleY = viewerHeight / selectionHeight;
  const scaleLevel = Math.min(scaleX, scaleY);

  const matrix = transform(
    scale(scaleLevel, scaleLevel),
    translate(-selectionSVGPointX, -selectionSVGPointY),
  );

  if (isZoomLevelGoingOutOfBounds(value, scaleLevel / value.d)) {
    return set(value, {
      mode: MODE_IDLE,
      startX: null,
      startY: null,
      endX: null,
      endY: null,
    }) as ZoomValue;
  }

  return set(value, {
    mode: MODE_IDLE,
    ...limitZoomLevel(value, matrix),
    startX: null,
    startY: null,
    endX: null,
    endY: null,
  }, ACTION_ZOOM) as ZoomValue;
};

export const fitToViewer = (value: ZoomValue, SVGAlignX = ALIGN_LEFT, SVGAlignY = ALIGN_TOP): ZoomValue => {
  const {viewerWidth, viewerHeight, SVGMinX, SVGMinY, SVGWidth, SVGHeight} = value;

  const scaleX = viewerWidth / SVGWidth;
  const scaleY = viewerHeight / SVGHeight;
  const scaleLevel = Math.min(scaleX, scaleY);

  let scaleMatrix = scale(scaleLevel, scaleLevel);

  let translateX = -SVGMinX * scaleX;
  let translateY = -SVGMinY * scaleY;

  if (scaleX < scaleY) {
    const remainderY = viewerHeight - scaleX * SVGHeight;

    switch (SVGAlignY) {
      case ALIGN_TOP:
        translateY = -SVGMinY * scaleLevel;
        break;
      case ALIGN_CENTER:
        translateY = Math.round(remainderY / 2) - SVGMinY * scaleLevel;
        break;
      case ALIGN_BOTTOM:
        translateY = remainderY - SVGMinY * scaleLevel;
        break;
      case ALIGN_COVER: {
        scaleMatrix = scale(scaleY, scaleY);
        const remainderX = viewerWidth - scaleY * SVGWidth;
        translateX = SVGMinX + Math.round(remainderX / 2);
        break;
      }
      default:
        break;
    }
  } else {
    const remainderX = viewerWidth - scaleY * SVGWidth;

    switch (SVGAlignX) {
      case ALIGN_LEFT:
        translateX = -SVGMinX * scaleLevel;
        break;
      case ALIGN_CENTER:
        translateX = Math.round(remainderX / 2) - SVGMinX * scaleLevel;
        break;
      case ALIGN_RIGHT:
        translateX = remainderX - SVGMinX * scaleLevel;
        break;
      case ALIGN_COVER: {
        scaleMatrix = scale(scaleX, scaleX);
        const remainderY = viewerHeight - scaleX * SVGHeight;
        translateY = SVGMinY + Math.round(remainderY / 2);
        break;
      }
      default:
        break;
    }
  }

  const translationMatrix = translate(translateX, translateY);
  const matrix = transform(
    translationMatrix,
    scaleMatrix,
  );

  if (isZoomLevelGoingOutOfBounds(value, scaleLevel / value.d)) {
    return set(value, {
      mode: MODE_IDLE,
      startX: null,
      startY: null,
      endX: null,
      endY: null,
    }) as ZoomValue;
  }

  return set(value, {
    mode: MODE_IDLE,
    ...limitZoomLevel(value, matrix),
    startX: null,
    startY: null,
    endX: null,
    endY: null,
  }, ACTION_ZOOM) as ZoomValue;
};

export const zoomOnViewerCenter = (value: ZoomValue, scaleFactor: number): ZoomValue => {
  const {viewerWidth, viewerHeight} = value;
  const SVGPoint = getSVGPoint(value, viewerWidth / 2, viewerHeight / 2);
  return zoom(value, SVGPoint.x, SVGPoint.y, scaleFactor);
};

export const startZooming = (value: ZoomValue, viewerX: number, viewerY: number): ZoomValue => set(value, {
  mode: MODE_ZOOMING,
  startX: viewerX,
  startY: viewerY,
  endX: viewerX,
  endY: viewerY,
}) as ZoomValue;

export const updateZooming = (value: ZoomValue, viewerX: number, viewerY: number): ZoomValue => {
  if (value.mode !== MODE_ZOOMING) {
    throw new Error(`update selection not allowed in this mode ${value.mode}`);
  }

  return set(value, {
    endX: viewerX,
    endY: viewerY,
  }) as ZoomValue;
};

export const stopZooming = (value: ZoomValue, viewerX: number, viewerY: number, scaleFactor: number): ZoomValue => {
  const TOLERATED_DISTANCE = 7;
  const {startX, startY} = value;

  if (startX === null || startY === null) {
    const SVGPoint = getSVGPoint(value, viewerX, viewerY);
    return zoom(value, SVGPoint.x, SVGPoint.y, scaleFactor);
  }

  const start = getSVGPoint(value, startX, startY);
  const end = getSVGPoint(value, viewerX, viewerY);

  if (Math.abs(startX - viewerX) > TOLERATED_DISTANCE && Math.abs(startY - viewerY) > TOLERATED_DISTANCE) {
    const box = calculateBox(start, end);
    return fitSelection(value, box.x, box.y, box.width, box.height);
  }

  const SVGPoint = getSVGPoint(value, viewerX, viewerY);
  return zoom(value, SVGPoint.x, SVGPoint.y, scaleFactor);
};
