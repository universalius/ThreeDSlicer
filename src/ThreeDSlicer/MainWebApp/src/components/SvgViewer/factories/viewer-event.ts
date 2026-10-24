import {decompose} from '../helpers/common';

type ViewerEventValue = Record<string, unknown>;
type ViewerEventOriginal = MouseEvent | TouchEvent;
type ViewerEventTarget = Element | null;
type DecomposedValue = {
  scaleFactor: number;
  translationX: number;
  translationY: number;
};

export default class ViewerEvent {
  originalEvent: ViewerEventOriginal;
  value: ViewerEventValue;
  SVGViewer: ViewerEventTarget;
  protected _cacheDecomposedValue?: DecomposedValue;
  protected _cachePoint?: {x: number; y: number};

  constructor(originalEvent: ViewerEventOriginal, value: ViewerEventValue, SVGViewer: ViewerEventTarget) {
    this.originalEvent = originalEvent;
    this.value = value;
    this.SVGViewer = SVGViewer;
  }

  get scaleFactor(): number {
    this._cacheDecomposedValue = this._cacheDecomposedValue ?? decompose(this.value as never);
    return this._cacheDecomposedValue!.scaleFactor;
  }

  get translationX(): number {
    this._cacheDecomposedValue = this._cacheDecomposedValue ?? decompose(this.value as never);
    return this._cacheDecomposedValue!.translationX;
  }

  get translationY(): number {
    this._cacheDecomposedValue = this._cacheDecomposedValue ?? decompose(this.value as never);
    return this._cacheDecomposedValue!.translationY;
  }

  preventDefault(): void {
    this.originalEvent.preventDefault();
  }

  stopPropagation(): void {
    this.originalEvent.stopPropagation();
  }
}
