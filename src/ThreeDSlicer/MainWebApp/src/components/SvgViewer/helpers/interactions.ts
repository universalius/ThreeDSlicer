import {MODE_PANNING, MODE_ZOOMING, TOOL_AUTO, TOOL_NONE, TOOL_PAN, TOOL_ZOOM_IN, TOOL_ZOOM_OUT} from '../constants';
import {type ViewerValue, getSVGPoint, setFocus} from './common';
import {autoPanIfNeeded, startPanning, stopPanning, updatePanning} from './pan';
import {startZooming, stopZooming, updateZooming, zoom} from './zoom';
import mapRange from './mapRange';

type ViewerCoords = {
  x: number;
  y: number;
};

type ModifierStateEvent = MouseEvent & {
  getModifierState?: (modifierKey: string) => boolean;
};

type InteractionEvent = MouseEvent | WheelEvent | ModifierStateEvent;

type InteractionProps = {
  scaleFactor: number;
  scaleFactorOnWheel: number;
  preventPanOutside?: boolean;
  detectWheel?: boolean;
  detectAutoPan?: boolean;
  disableDoubleClickZoomWithToolAuto?: boolean;
  modifierKeys?: string[];
};

export const getMousePosition = (event: MouseEvent, ViewerDOM: Element | null): ViewerCoords => {
  if (!ViewerDOM) {
    return {x: 0, y: 0};
  }

  const {left, top} = ViewerDOM.getBoundingClientRect();
  const x = event.clientX - Math.round(left);
  const y = event.clientY - Math.round(top);

  return {x, y};
};

export const onMouseDown = (
  event: InteractionEvent,
  ViewerDOM: Element | null,
  tool: string,
  value: ViewerValue,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): ViewerValue => {
  const {x, y} = coords ?? getMousePosition(event as MouseEvent, ViewerDOM);

  let nextValue = value;

  switch (tool) {
    case TOOL_ZOOM_OUT: {
      const SVGPoint = getSVGPoint(value, x, y);
      nextValue = zoom(value, SVGPoint.x, SVGPoint.y, 1 / props.scaleFactor);
      break;
    }

    case TOOL_ZOOM_IN:
      nextValue = startZooming(value, x, y);
      break;

    case TOOL_AUTO:
    case TOOL_PAN:
      nextValue = startPanning(value, x, y);
      break;

    default:
      return value;
  }

  event.preventDefault();
  return nextValue;
};

export const onMouseMove = (
  event: MouseEvent,
  ViewerDOM: Element | null,
  tool: string,
  value: ViewerValue,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): ViewerValue => {
  const {x, y} = coords ?? getMousePosition(event, ViewerDOM);

  const forceExit = event.buttons === 0;
  let nextValue = value;

  switch (tool) {
    case TOOL_ZOOM_IN:
      if (value.mode === MODE_ZOOMING) {
        nextValue = forceExit ? stopZooming(value, x, y, props.scaleFactor) : updateZooming(value, x, y);
      }
      break;

    case TOOL_AUTO:
    case TOOL_PAN:
      if (value.mode === MODE_PANNING) {
        nextValue = forceExit ? stopPanning(value) : updatePanning(value, x, y, props.preventPanOutside ? 20 : undefined);
      }
      break;

    default:
      return value;
  }

  event.preventDefault();
  return nextValue;
};

export const onMouseUp = (
  event: MouseEvent,
  ViewerDOM: Element | null,
  tool: string,
  value: ViewerValue,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): ViewerValue => {
  const {x, y} = coords ?? getMousePosition(event, ViewerDOM);

  let nextValue = value;

  switch (tool) {
    case TOOL_ZOOM_OUT:
      if (value.mode === MODE_ZOOMING) {
        nextValue = stopZooming(value, x, y, 1 / props.scaleFactor);
      }
      break;

    case TOOL_ZOOM_IN:
      if (value.mode === MODE_ZOOMING) {
        nextValue = stopZooming(value, x, y, props.scaleFactor);
      }
      break;

    case TOOL_AUTO:
    case TOOL_PAN:
      if (value.mode === MODE_PANNING) {
        nextValue = stopPanning(value);
      }
      break;

    default:
      return value;
  }

  event.preventDefault();
  return nextValue;
};

export const onDoubleClick = (
  event: ModifierStateEvent,
  ViewerDOM: Element | null,
  tool: string,
  value: ViewerValue,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): ViewerValue => {
  const {x, y} = coords ?? getMousePosition(event as MouseEvent, ViewerDOM);

  let nextValue = value;

  if (tool === TOOL_AUTO && !props.disableDoubleClickZoomWithToolAuto) {
    const {modifierKeys = []} = props;
    const SVGPoint = getSVGPoint(value, x, y);
    const modifierKeysReducer = (current: boolean, modifierKey: string) => current || !!event.getModifierState?.(modifierKey);
    const modifierKeyActive = modifierKeys.reduce(modifierKeysReducer, false);
    const scaleFactor = modifierKeyActive ? 1 / props.scaleFactor : props.scaleFactor;
    nextValue = zoom(value, SVGPoint.x, SVGPoint.y, scaleFactor);
  }

  event.preventDefault();
  return nextValue;
};

export const onWheel = (
  event: WheelEvent,
  ViewerDOM: Element | null,
  tool: string,
  value: ViewerValue,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): ViewerValue => {
  const {x, y} = coords ?? getMousePosition(event as unknown as MouseEvent, ViewerDOM);

  if (!props.detectWheel) return value;

  const delta = Math.max(-1, Math.min(1, event.deltaY));
  const scaleFactor = mapRange(delta, -1, 1, props.scaleFactorOnWheel, 1 / props.scaleFactorOnWheel);

  const SVGPoint = getSVGPoint(value, x, y);
  const nextValue = zoom(value, SVGPoint.x, SVGPoint.y, scaleFactor);

  event.preventDefault();
  return nextValue;
};

export const onMouseEnterOrLeave = (
  event: MouseEvent,
  ViewerDOM: Element | null,
  tool: string,
  value: ViewerValue,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): ViewerValue => {
  const nextValue = setFocus(value, event.type === 'mouseenter');

  event.preventDefault();
  return nextValue;
};

export const onInterval = (
  event: Event | null,
  ViewerDOM: Element | null,
  tool: string,
  value: ViewerValue,
  props: InteractionProps,
  coords: ViewerCoords | null = null,
): ViewerValue => {
  const {x, y} = coords ?? {x: 0, y: 0};

  if (!([TOOL_NONE, TOOL_AUTO].indexOf(tool) >= 0)) return value;
  if (!props.detectAutoPan) return value;
  if (!value.focus) return value;

  return autoPanIfNeeded(value, x, y);
};