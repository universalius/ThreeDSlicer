import ViewerMouseEvent from "./viewer-mouse-event";

type SupportedEventType =
  | 'mousemove'
  | 'mouseup'
  | 'mousedown'
  | 'click'
  | 'dblclick'
  | 'touchstart'
  | 'touchmove'
  | 'touchend'
  | 'touchcancel';

type EventFactoryValue = Record<string, unknown>;
type EventFactoryViewer = Element | null;

type EventFactoryEvent = {
  type: SupportedEventType | string;
};

const eventFactory = (
  originalEvent: EventFactoryEvent,
  value: EventFactoryValue,
  SVGViewer: EventFactoryViewer,
) => {
  const eventType = originalEvent.type;

  switch (eventType) {
    case 'mousemove':
    case 'mouseup':
    case 'mousedown':
    case 'click':
    case 'dblclick':
      return new ViewerMouseEvent(originalEvent as MouseEvent, value, SVGViewer);

    // case 'touchstart':
    // case 'touchmove':
    // case 'touchend':
    // case 'touchcancel':
    //   return new ViewerTouchEvent(originalEvent as TouchEvent, value, SVGViewer);

    default:
      throw new Error(`${eventType} not supported`);
  }
};

export default eventFactory;
