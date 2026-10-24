import ViewerEvent from './viewer-event';
import {getMousePosition} from '../helpers/interactions';
import {getSVGPoint} from '../helpers/common';

type ViewerPoint = {
  x: number;
  y: number;
};

export default class ViewerMouseEvent extends ViewerEvent {
  get point(): ViewerPoint {
    if (!this._cachePoint) {
      const {originalEvent: event, SVGViewer, value} = this;
      const mousePosition = getMousePosition(event as MouseEvent, SVGViewer);
      this._cachePoint = getSVGPoint(value as never, mousePosition.x, mousePosition.y);
    }
    return this._cachePoint as ViewerPoint;
  }

  get x(): number {
    return this.point.x;
  }

  get y(): number {
    return this.point.y;
  }
}
