import { MODE_PANNING, MODE_ZOOMING, TOOL_AUTO, TOOL_NONE, TOOL_PAN, TOOL_ZOOM_IN, TOOL_ZOOM_OUT } from '../constants';
import { getSVGPoint, setFocus } from './common';
import { autoPanIfNeeded, startPanning, stopPanning, updatePanning } from './pan';
import { startZooming, stopZooming, updateZooming, zoom } from './zoom';
import mapRange from './mapRange';
import { Matrix, toSVG } from 'transformation-matrix';
import { Point, ViewerMouseAction } from '../types';
import { SvgViewerState } from '../SvgViewer1';

type ViewerCoords = {
  x: number;
  y: number;
};

type InteractionProps = {
  scaleFactor: number;
  scaleFactorOnWheel: number;
  preventPanOutside?: boolean;
  detectWheel?: boolean;
  detectAutoPan?: boolean;
  disableDoubleClickZoomWithToolAuto?: boolean;
  modifierKeys?: string[];
};

export const getMousePosition = (event: React.MouseEvent<SVGSVGElement>, viewerRef: Element | null): Point => {
  if (!viewerRef) {
    return { x: 0, y: 0 };
  }

  const { left, top } = viewerRef.getBoundingClientRect();
  const x = event.clientX - Math.round(left);
  const y = event.clientY - Math.round(top);

  return { x, y };
};

export const onMouseDown = (
  event: React.MouseEvent<SVGSVGElement>,
  viewerRef: Element | null,
  tool: string,
  oldState: SvgViewerState,
  props: InteractionProps,
): SvgViewerState => {
  const point = getMousePosition(event, viewerRef);

  let nextState = oldState;

  switch (tool) {
    case TOOL_ZOOM_OUT: {
      const SVGPoint = getSVGPoint(oldState, point);
      nextState = zoom(oldState, SVGPoint.x, SVGPoint.y, 1 / props.scaleFactor);
      break;
    }

    case TOOL_ZOOM_IN:
      nextState = startZooming(oldState, point);
      break;

    case TOOL_AUTO:
    case TOOL_PAN:
      nextState = startPanning(oldState, point);
      break;

    default:
      return oldState;
  }

  event.preventDefault();
  return nextState;
};

export const onMouseMove = (
  event: React.MouseEvent<SVGSVGElement>,
  viewerRef: Element | null,
  tool: string,
  oldState: SvgViewerState,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): SvgViewerState => {
  const { x, y } = coords ?? getMousePosition(event, viewerRef);

  const forceExit = event.buttons === 0;
  let nextState = oldState;

  switch (tool) {
    case TOOL_ZOOM_IN:
      if (oldState.action === ViewerMouseAction.ZOOMING) {
        nextState = forceExit ? stopZooming(oldState, x, y, props.scaleFactor) : updateZooming(oldState, x, y);
      }
      break;

    case TOOL_AUTO:
    case TOOL_PAN:
      if (oldState.action === ViewerMouseAction.PANNING) {
        nextState = forceExit
          ? stopPanning(oldState)
          : updatePanning(oldState, x, y, props.preventPanOutside ? 20 : undefined);
      }
      break;

    default:
      return oldState;
  }

  event.preventDefault();
  return nextState;
};

export const onMouseUp = (
  event: React.MouseEvent<SVGSVGElement>,
  viewerRef: Element | null,
  tool: string,
  oldState: SvgViewerState,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): SvgViewerState => {
  const { x, y } = coords ?? getMousePosition(event, viewerRef);

  let nextState = oldState;

  switch (tool) {
    case TOOL_ZOOM_OUT:
      if (oldState.action === ViewerMouseAction.ZOOMING) {
        nextState = stopZooming(oldState, x, y, 1 / props.scaleFactor);
      }
      break;

    case TOOL_ZOOM_IN:
      if (oldState.action === ViewerMouseAction.ZOOMING) {
        nextState = stopZooming(oldState, x, y, props.scaleFactor);
      }
      break;

    case TOOL_AUTO:
    case TOOL_PAN:
      if (oldState.action === ViewerMouseAction.PANNING) {
        nextState = stopPanning(oldState);
      }
      break;

    default:
      return oldState;
  }

  event.preventDefault();
  return nextState;
};

export const onDoubleClick = (
  event: React.MouseEvent<SVGSVGElement>,
  viewerRef: Element | null,
  tool: string,
  oldState: SvgViewerState,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): SvgViewerState => {
  const { x, y } = coords ?? getMousePosition(event, viewerRef);

  let nextState = oldState;

  if (tool === TOOL_AUTO && !props.disableDoubleClickZoomWithToolAuto) {
    const { modifierKeys = [] } = props;
    const SVGPoint = getSVGPoint(oldState, x, y);
    const modifierKeysReducer = (current: boolean, modifierKey: string) =>
      current || !!event.getModifierState?.(modifierKey);
    const modifierKeyActive = modifierKeys.reduce(modifierKeysReducer, false);
    const scaleFactor = modifierKeyActive ? 1 / props.scaleFactor : props.scaleFactor;
    nextState = zoom(nextState, SVGPoint.x, SVGPoint.y, scaleFactor);
  }

  event.preventDefault();
  return nextState;
};

export const onWheel = (
  event: React.WheelEvent<SVGSVGElement>,
  viewerRef: Element | null,
  tool: string,
  oldState: SvgViewerState,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): SvgViewerState => {
  const { x, y } = coords ?? getMousePosition(event as unknown as MouseEvent, viewerRef);

  if (!props.detectWheel) return oldState;

  const delta = Math.max(-1, Math.min(1, event.deltaY));
  const scaleFactor = mapRange(delta, -1, 1, props.scaleFactorOnWheel, 1 / props.scaleFactorOnWheel);

  const SVGPoint = getSVGPoint(oldState, x, y);
  const nextoldState = zoom(oldState, SVGPoint.x, SVGPoint.y, scaleFactor);
  // window.__onWheelCalled = true;
  // window.__onWheelScale = scaleFactor;
  // window.__onWheelNextoldState = nextoldState;

  event.preventDefault();
  return nextoldState;
};

export const onMouseEnterOrLeave = (
  event: React.MouseEvent<SVGSVGElement>,
  viewerRef: Element | null,
  tool: string,
  oldState: SvgViewerState,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): SvgViewerState => {
  const nextoldState = setFocus(oldState, event.type === 'mouseenter');

  event.preventDefault();
  return nextoldState;
};

export const onInterval = (
  event: Event | null,
  viewerRef: Element | null,
  tool: string,
  oldState: SvgViewerState,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): SvgViewerState => {
  const { x, y } = coords ?? { x: 0, y: 0 };

  if (!([TOOL_NONE, TOOL_AUTO].indexOf(tool) >= 0)) return oldState;
  if (!props.detectAutoPan) return oldState;
  if (!oldState.focus) return oldState;

  return autoPanIfNeeded(oldState, x, y);
};
