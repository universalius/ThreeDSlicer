import { Matrix, toSVG } from 'transformation-matrix';
import { parseViewBox } from './helpers/parseViewBox';
import { ReactElement, useState } from 'react';
import { isTouchDevice } from './helpers/detect-touch';
import {
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
  onMouseEnterOrLeave,
  onMouseDown1,
} from './helpers/interactions';
import { Point, SvgElementProps, ViewerMouseAction } from './types';
import React from 'react';

export type SvgViewerState = { mousePos: Point; action: ViewerMouseAction; transformMatrix: Matrix };

export const SvgViewer = ({
  viewerWidth,
  viewerHeight,
  className,
  svgElement,
  tool,
}: {
  viewerWidth: number;
  viewerHeight: number;
  className: string;
  svgElement: ReactElement<SvgElementProps>;
  tool: string;
}) => {
  const [svgState, setSvgState] = useState<SvgViewerState>({
    mousePos: { x: 0, y: 0 },
    action: ViewerMouseAction.IDLE,
    transformMatrix: undefined,
  });

  const viewerRef = React.useRef<SVGSVGElement>(null);
  const svgViewbox = parseViewBox(svgElement.props.viewBox ?? '');

  const mapActionToMouseAction = (action: string): ViewerMouseAction => {
    switch (action) {
      case 'MODE_IDLE':
        return ViewerMouseAction.IDLE;
      case 'MODE_PANNING':
        return ViewerMouseAction.PANNING;
      case 'MODE_ZOOMING':
        return ViewerMouseAction.ZOOMING;
      default:
        return ViewerMouseAction.IDLE;
    }
  };

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const newState = onMouseDown(event, viewerRef.current, tool, undefined, undefined);
    setSvgState({
      ...svgState,
      mousePos: { x: newState.startX, y: newState.startY },
      action: mapActionToMouseAction(newState.mode),
    });
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    let { left, top } = viewerRef.current.getBoundingClientRect();
    let x = event.clientX - Math.round(left);
    let y = event.clientY - Math.round(top);

    let nextValue = onMouseMove(event, viewerRef.current, tool, getValue, viewerProps, { x, y });
    if (getValue !== nextValue) setValue(nextValue);
    setPointerX(x);
    setPointerY(y);
  };

  const handleMouseUp = (event: React.MouseEvent<SVGSVGElement>) => {
    let nextValue = onMouseUp(event, viewerRef.current, tool, getValue, viewerProps);
    if (getValue !== nextValue) setValue(nextValue);
  };

  const handleMouseEnter = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isTouchDevice()) return;
    let nextValue = onMouseEnterOrLeave(event, viewerRef.current, tool, getValue, viewerProps);
    if (getValue !== nextValue) setValue(nextValue);
  };

  const handleMouseLeave = (event: React.MouseEvent<SVGSVGElement>) => {
    let nextValue = onMouseEnterOrLeave(event, viewerRef.current, tool, getValue, viewerProps);
    if (getValue !== nextValue) setValue(nextValue);
  };

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    // handleViewerEvent(event);
  };

  const handleDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    let nextValue = onDoubleClick(event, viewerRef.current, tool, getValue, viewerProps);
    if (getValue !== nextValue) setValue(nextValue);
  };

  const handleTouchStart = (event: React.TouchEvent<SVGSVGElement>) => {
    // let nextValue = onTouchStart(event, viewerRef.current, tool, getValue, viewerProps);
    // if (getValue !== nextValue) setValue(nextValue);
  };

  const handleTouchMove = (event: React.TouchEvent<SVGSVGElement>) => {
    // let nextValue = onTouchMove(event, viewerRef.current, tool, getValue, viewerProps);
    // if (getValue !== nextValue) setValue(nextValue);
  };

  const handleTouchEnd = (event: React.TouchEvent<SVGSVGElement>) => {
    // let nextValue = onTouchEnd(event, viewerRef.current, tool, getValue, viewerProps);
    // if (getValue !== nextValue) setValue(nextValue);
  };

  const handleTouchCancel = (event: React.TouchEvent<SVGSVGElement>) => {
    // let nextValue = onTouchCancel(event, viewerRef.current, tool, getValue, viewerProps);
    // if (getValue !== nextValue) setValue(nextValue);
  };

  return (
    <div style={{ position: 'relative', width: viewerWidth, height: viewerHeight }} className={className}>
      <svg
        width={viewerWidth}
        height={viewerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <rect fill="#616264" x={0} y={0} width={viewerWidth} height={viewerHeight} style={{ pointerEvents: 'none' }} />

        <g transform={toSVG(transformMatrix)} style={{ pointerEvents: 'none' }}>
          <rect
            fill="#fff"
            x={svgViewbox.minX || 0}
            y={svgViewbox.minY || 0}
            width={svgViewbox.width}
            height={svgViewbox.height}
          />
          <g>{svgElement.props.children}</g>
        </g>
      </svg>
    </div>
  );
};
