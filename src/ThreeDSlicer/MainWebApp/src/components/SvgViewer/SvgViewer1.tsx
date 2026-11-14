import { identity, Matrix, toSVG } from 'transformation-matrix';
import { parseViewBox } from './helpers/parseViewBox';
import { ReactElement, useEffect, useState } from 'react';
import { isTouchDevice } from './helpers/detect-touch';
import {
  onMouseDown,
  onMouseMove,
  onMouseUp,
  // onDoubleClick,
  onMouseEnterOrLeave,
  onWheel,
} from './helpers/interactions';
import { Point, SvgElementProps, SvgViewBox, ViewerMouseAction } from './types';
import React from 'react';

export type SvgViewerState = { mousePos?: Point; action: ViewerMouseAction; transformMatrix?: Matrix };

export type SvgViewerProps = {
  viewerWidth: number;
  viewerHeight: number;
  className: string;
  svgElement: ReactElement<SvgElementProps>;
  tool: string;
};

export type SvgViewerDimensions = {
  width: number;
  height: number;
  viewbox: SvgViewBox;
};

export const SvgViewer1 = ({ viewerWidth, viewerHeight, className, svgElement, tool }: SvgViewerProps) => {
  const [svgState, setSvgState] = useState<SvgViewerState>({
    mousePos: { x: 0, y: 0 },
    action: ViewerMouseAction.IDLE,
    transformMatrix: identity(),
  });

  const viewerRef = React.useRef<SVGSVGElement>(null);
  const svgViewbox = parseViewBox(svgElement.props.viewBox ?? '');

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const newState = onMouseDown(event, viewerRef.current, tool, svgState);
    setSvgState(newState);
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    // let { left, top } = viewerRef.current.getBoundingClientRect();
    // let x = event.clientX - Math.round(left);
    // let y = event.clientY - Math.round(top);

    let newState = onMouseMove(event, viewerRef.current, tool, svgState, {
      width: viewerWidth,
      height: viewerHeight,
      viewbox: svgViewbox,
    });

    setSvgState(newState);

    // if (getValue !== nextValue) setValue(nextValue);
    // setPointerX(x);
    // setPointerY(y);
  };

  const handleMouseUp = (event: React.MouseEvent<SVGSVGElement>) => {
    let newState = onMouseMove(event, viewerRef.current, tool, svgState, {
      width: viewerWidth,
      height: viewerHeight,
      viewbox: svgViewbox,
    });

    setSvgState(newState);
  };

  // const handleMouseEnter = (event: React.MouseEvent<SVGSVGElement>) => {
  //   if (isTouchDevice()) return;
  //   let nextValue = onMouseEnterOrLeave(event, viewerRef.current, tool, getValue, viewerProps);
  //   if (getValue !== nextValue) setValue(nextValue);
  // };

  // const handleMouseLeave = (event: React.MouseEvent<SVGSVGElement>) => {
  //   let nextValue = onMouseEnterOrLeave(event, viewerRef.current, tool, getValue, viewerProps);
  //   if (getValue !== nextValue) setValue(nextValue);
  // };

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    // handleViewerEvent(event);
  };

  // const handleDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
  //   let nextValue = onDoubleClick(event, viewerRef.current, tool, getValue, viewerProps);
  //   if (getValue !== nextValue) setValue(nextValue);
  // };

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

  const handleOnWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    const scaleFactorOnWheel = 1.06;
    let newState = onWheel(event, viewerRef.current, svgState, scaleFactorOnWheel);
    setSvgState(newState);
  };

  return (
    <div style={{ position: 'relative', width: viewerWidth, height: viewerHeight }} className={className}>
      <svg
        ref={viewerRef}
        width={viewerWidth}
        height={viewerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        // onDoubleClick={handleDoubleClick}
        // onMouseEnter={handleMouseEnter}
        // onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onWheel={handleOnWheel}
      >
        <rect fill="#616264" x={0} y={0} width={viewerWidth} height={viewerHeight} style={{ pointerEvents: 'none' }} />

        <g
          transform={svgState?.transformMatrix ? toSVG(svgState.transformMatrix) : undefined}
          style={{ pointerEvents: 'none' }}
        >
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
