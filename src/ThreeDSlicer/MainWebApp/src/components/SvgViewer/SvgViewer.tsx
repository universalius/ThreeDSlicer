import React, {type CSSProperties, type ComponentType, type ElementType, type ReactElement, useCallback, useEffect, useRef, useState} from 'react';
import {toSVG} from 'transformation-matrix';
//events
import eventFactory from './factories/event-factory';
//features
import {pan as panFn} from './helpers/pan';
import {
  // getDefaultValue,
  isValueValid,
  reset as resetFn,
  setPointOnViewerCenter as setPointOnViewerCenterFn,
  setSVGViewBox,
  setViewerSize,
  setZoomLevels
} from './helpers/common';
import {
  onDoubleClick,
  onInterval,
  onMouseDown,
  onMouseEnterOrLeave,
  onMouseMove,
  onMouseUp,
  onWheel as onWheelFn
} from './helpers/interactions';
import parseViewBox from './parseViewBox';
// import {onTouchCancel, onTouchEnd, onTouchMove, onTouchStart} from './features/interactions-touch';

import {fitSelection as fitSelectionFn, fitToViewer as fitToViewerFn, zoom as zoomFn, zoomOnViewerCenter as zoomOnViewerCenterFn} from './features/zoom';
// import {closeMiniature as closeMiniatureFn, openMiniature as openMiniatureFn} from './features/miniature';
//ui
import cursorPolyfill from './ui/cursor-polyfill';
import BorderGradient from './ui/border-gradient';
import Selection from './ui/selection';
import Toolbar from './ui-toolbar/toolbar';
import detectTouch from './ui/detect-touch';
import Miniature from './ui-miniature/miniature';

import {
  ACTION_PAN,
  ACTION_ZOOM,
  ALIGN_BOTTOM,
  ALIGN_CENTER,
  ALIGN_LEFT,
  ALIGN_RIGHT,
  ALIGN_TOP,
  MODE_IDLE,
  MODE_PANNING,
  MODE_ZOOMING,
  POSITION_BOTTOM,
  POSITION_LEFT,
  POSITION_NONE,
  POSITION_RIGHT,
  POSITION_TOP,
  TOOL_AUTO,
  TOOL_NONE,
  TOOL_PAN,
  TOOL_ZOOM_IN,
  TOOL_ZOOM_OUT
} from './constants';

type ToolbarProps = React.ComponentProps<typeof Toolbar>;
type MiniatureProps = React.ComponentProps<typeof Miniature>;

type SvgViewerChildProps = {
  viewBox?: string;
  width?: number;
  height?: number;
  children?: React.ReactNode;
};

export type ReactSVGPanZoomProps = {
  width: number;
  height: number;
  value?: any;
  onChangeValue?: (value: any) => void;
  tool?: string;
  onChangeTool?: (tool: string) => void;
  background?: string;
  SVGBackground?: string;
  SVGStyle?: CSSProperties;
  style?: CSSProperties;
  className?: string;
  detectWheel?: boolean;
  detectAutoPan?: boolean;
  detectPinchGesture?: boolean;
  onZoom?: (value: any) => void;
  onPan?: (value: any) => void;
  onClick?: (event: any) => void;
  onDoubleClick?: (event: any) => void;
  onMouseUp?: (event: any) => void;
  onMouseMove?: (event: any) => void;
  onMouseDown?: (event: any) => void;
  // onTouchStart?: (event: any) => void;
  // onTouchMove?: (event: any) => void;
  // onTouchEnd?: (event: any) => void;
  // onTouchCancel?: (event: any) => void;
  preventPanOutside?: boolean;
  scaleFactor?: number;
  scaleFactorOnWheel?: number;
  scaleFactorMax?: number;
  scaleFactorMin?: number;
  modifierKeys?: string[];
  disableDoubleClickZoomWithToolAuto?: boolean;
  customMiniature?: ComponentType<any> | ElementType;
  miniatureProps?: Partial<MiniatureProps> & {
    position?: string;
  };
  customToolbar?: ComponentType<any> | ElementType;
  toolbarProps?: Partial<ToolbarProps> & {
    position?: string;
  };
  children: ReactElement<SvgViewerChildProps>;
};

const ReactSVGPanZoom = (props: ReactSVGPanZoomProps) => {
  const {
    style = {},
    background = "#616264",
    SVGBackground = "#fff",
    SVGStyle = {},
    detectWheel = true,
    detectAutoPan = true,
    detectPinchGesture = true,
    modifierKeys = ["Alt", "Shift", "Control"],
    preventPanOutside = true,
    scaleFactor = 1.1,
    scaleFactorOnWheel = 1.06,
    disableDoubleClickZoomWithToolAuto = false,
    onZoom = null,
    onPan = null,
    toolbarProps = {},
    miniatureProps = {},
  } = props;

  const viewerDOM = useRef(null);
  const autoPanIsRunning = useRef(true);
  const [pointerX, setPointerX] = useState(null);
  const [pointerY, setPointerY] = useState(null);
  const [defaultValue] = useState(() => {
    const {width: viewerWidth, height: viewerHeight, scaleFactorMin, scaleFactorMax, children} = props;
    const {viewBox: SVGViewBox} = children.props;

    if (SVGViewBox) {
      const [SVGMinX, SVGMinY, SVGWidth, SVGHeight] = parseViewBox(SVGViewBox);
      return getDefaultValue(viewerWidth, viewerHeight, SVGMinX, SVGMinY, SVGWidth, SVGHeight, scaleFactorMin, scaleFactorMax);
    }

    const {width: SVGWidth, height: SVGHeight} = children.props;
    return getDefaultValue(viewerWidth, viewerHeight, 0, 0, SVGWidth, SVGHeight, scaleFactorMin, scaleFactorMax);
  });

  const getValue = useCallback(() => {
    if (isValueValid(props.value)) return props.value;
    return defaultValue;
  }, [defaultValue, props.value]);

  const getTool = useCallback(() => {
    if (props.tool) return props.tool;
    return TOOL_NONE;
  }, [props.tool]);

  const setValue = useCallback((nextValue) => {
    let {onChangeValue, onZoom, onPan} = props;

    if (onChangeValue) onChangeValue(nextValue);
    if (nextValue.lastAction) {
      if (onZoom && nextValue.lastAction === ACTION_ZOOM) onZoom(nextValue);
      if (onPan && nextValue.lastAction === ACTION_PAN) onPan(nextValue);
    }
  }, [props]);

  const pan = useCallback((SVGDeltaX, SVGDeltaY) => {
    let nextValue = panFn(getValue(), SVGDeltaX, SVGDeltaY);
    setValue(nextValue);
  }, [getValue, setValue]);

  const zoom = useCallback((SVGPointX, SVGPointY, scaleFactor) => {
    let nextValue = zoomFn(getValue(), SVGPointX, SVGPointY, scaleFactor);
    setValue(nextValue);
  }, [getValue, setValue]);

  const fitSelection = useCallback((selectionSVGPointX, selectionSVGPointY, selectionWidth, selectionHeight) => {
    let nextValue = fitSelectionFn(getValue(), selectionSVGPointX, selectionSVGPointY, selectionWidth, selectionHeight);
    setValue(nextValue);
  }, [getValue, setValue]);

  const fitToViewer = useCallback((SVGAlignX = ALIGN_LEFT, SVGAlignY = ALIGN_TOP) => {
    let nextValue = fitToViewerFn(getValue(), SVGAlignX, SVGAlignY);
    setValue(nextValue);
  }, [getValue, setValue]);

  const zoomOnViewerCenter = useCallback((scaleFactor) => {
    let nextValue = zoomOnViewerCenterFn(getValue(), scaleFactor);
    setValue(nextValue);
  }, [getValue, setValue]);

  const setPointOnViewerCenter = useCallback((SVGPointX, SVGPointY, zoomLevel) => {
    let nextValue = setPointOnViewerCenterFn(getValue(), SVGPointX, SVGPointY, zoomLevel);
    setValue(nextValue);
  }, [getValue, setValue]);

  const resetView = useCallback(() => {
    let nextValue = resetFn(getValue());
    setValue(nextValue);
  }, [getValue, setValue]);

  const openMiniature = useCallback(() => {
    let nextValue = openMiniatureFn(getValue());
    setValue(nextValue);
  }, [getValue, setValue]);

  const closeMiniature = useCallback(() => {
    let nextValue = closeMiniatureFn(getValue());
    setValue(nextValue);
  }, [getValue, setValue]);

  const handleViewerEvent = useCallback((event) => {
    if (!([TOOL_NONE, TOOL_AUTO].indexOf(getTool()) >= 0)) return;
    if (event.target === viewerDOM.current) return;

    let eventsHandler = {
      click: props.onClick,
      dblclick: props.onDoubleClick,
      mousemove: props.onMouseMove,
      mouseup: props.onMouseUp,
      mousedown: props.onMouseDown,
      // touchstart: props.onTouchStart,
      // touchmove: props.onTouchMove,
      // touchend: props.onTouchEnd,
      // touchcancel: props.onTouchCancel,
    };

    let onEventHandler = eventsHandler[event.type];
    if (!onEventHandler) return;

    onEventHandler(eventFactory(event, props.value, viewerDOM.current));
  }, [getTool, props]);

  const autoPanLoop = useCallback(() => {
    let coords = {x: pointerX, y: pointerY};
    let nextValue = onInterval(null, viewerDOM.current, getTool(), getValue(), props, coords);
    if (getValue() !== nextValue) {
      setValue(nextValue);
    }

    if (autoPanIsRunning.current) {
      requestAnimationFrame(autoPanLoop);
    }
  }, [getValue, getTool, pointerX, pointerY, props, setValue]);

  const onWheel = useCallback((event) => {
    let nextValue = onWheelFn(event, viewerDOM.current, getTool(), getValue(), props);
    if (getValue() !== nextValue) setValue(nextValue);
  }, [getValue, getTool, props, setValue]);

  useEffect(() => {
    const value = getValue();
    let nextValue = value;
    let needUpdate = false;

    const {viewBox: SVGViewBox} = props.children.props;
    if (SVGViewBox) {
      const [x, y, width, height] = parseViewBox(SVGViewBox);

      if (value.SVGMinX !== x || value.SVGMinY !== y || value.SVGWidth !== width || value.SVGHeight !== height) {
        nextValue = setSVGViewBox(nextValue, x, y, width, height);
        needUpdate = true;
      }
    } else {
      const {width: SVGWidth, height: SVGHeight} = props.children.props;
      if (value.SVGWidth !== SVGWidth || value.SVGHeight !== SVGHeight) {
        nextValue = setSVGViewBox(nextValue, 0, 0, SVGWidth, SVGHeight);
        needUpdate = true;
      }
    }

    if (
      props.width !== value.viewerWidth ||
      props.height !== value.viewerHeight
    ) {
      nextValue = setViewerSize(nextValue, props.width, props.height);
      needUpdate = true;
    }

    if (
      props.scaleFactorMin !== value.scaleFactorMin ||
      props.scaleFactorMax !== value.scaleFactorMax
    ) {
      nextValue = setZoomLevels(nextValue, props.scaleFactorMin, props.scaleFactorMax);
      needUpdate = true;
    }

    if (needUpdate) {
      setValue(nextValue);
    }
  }, [getValue, props.children, props.height, props.scaleFactorMax, props.scaleFactorMin, props.width, setValue]);

  useEffect(() => {
    autoPanIsRunning.current = true;
    requestAnimationFrame(autoPanLoop);
    const currentViewer = viewerDOM.current;
    if (currentViewer) {
      currentViewer.addEventListener('wheel', onWheel, false);
    }

    return () => {
      autoPanIsRunning.current = false;
      if (currentViewer) {
        currentViewer.removeEventListener('wheel', onWheel);
      }
    };
  }, [autoPanLoop, onWheel]);

  let tool = getTool();
  let value = getValue();
  let {customToolbar: CustomToolbar = Toolbar, customMiniature: CustomMiniature = Miniature} = props;

  let panningWithToolAuto = tool === TOOL_AUTO
    && value.mode === MODE_PANNING
    && value.startX !== value.endX
    && value.startY !== value.endY;

  let cursor;

  if (tool === TOOL_PAN)
    cursor = cursorPolyfill(value.mode === MODE_PANNING ? 'grabbing' : 'grab');

  if (tool === TOOL_ZOOM_IN)
    cursor = cursorPolyfill('zoom-in');

  if (tool === TOOL_ZOOM_OUT)
    cursor = cursorPolyfill('zoom-out');

  if (panningWithToolAuto)
    cursor = cursorPolyfill('grabbing');

  let blockChildEvents = [TOOL_PAN, TOOL_ZOOM_IN, TOOL_ZOOM_OUT].indexOf(tool) >= 0;
  blockChildEvents = blockChildEvents || panningWithToolAuto;

  const touchAction = (props.detectPinchGesture || [TOOL_PAN, TOOL_AUTO].indexOf(getTool()) !== -1) ? 'none' : undefined;

  return (
    <div
      style={{position: "relative", width: value.viewerWidth, height: value.viewerHeight, ...style}}
      className={props.className}>
      <svg
        ref={ViewerDOMRef => viewerDOM.current = ViewerDOMRef}
        width={value.viewerWidth}
        height={value.viewerHeight}
        style={style}

        onMouseDown={event => {
          let nextValue = onMouseDown(event, viewerDOM.current, getTool(), getValue(), props);
          if (getValue() !== nextValue) setValue(nextValue);
          handleViewerEvent(event);
        }}
        onMouseMove={event => {
          let {left, top} = viewerDOM.current.getBoundingClientRect();
          let x = event.clientX - Math.round(left);
          let y = event.clientY - Math.round(top);

          let nextValue = onMouseMove(event, viewerDOM.current, getTool(), getValue(), props, {x, y});
          if (getValue() !== nextValue) setValue(nextValue);
          setPointerX(x);
          setPointerY(y);
          handleViewerEvent(event);
        }}
        onMouseUp={event => {
          let nextValue = onMouseUp(event, viewerDOM.current, getTool(), getValue(), props);
          if (getValue() !== nextValue) setValue(nextValue);
          handleViewerEvent(event);
        }}

        onClick={event => {
          handleViewerEvent(event);
        }}
        onDoubleClick={event => {
          let nextValue = onDoubleClick(event, viewerDOM.current, getTool(), getValue(), props);
          if (getValue() !== nextValue) setValue(nextValue);
          handleViewerEvent(event);
        }}

        onMouseEnter={event => {
          if (detectTouch()) return;
          let nextValue = onMouseEnterOrLeave(event, viewerDOM.current, getTool(), getValue(), props);
          if (getValue() !== nextValue) setValue(nextValue);
        }}
        onMouseLeave={event => {
          let nextValue = onMouseEnterOrLeave(event, viewerDOM.current, getTool(), getValue(), props);
          if (getValue() !== nextValue) setValue(nextValue);
        }}

        // onTouchStart={event => {
        //   let nextValue = onTouchStart(event, ViewerDOM.current, getTool(), getValue(), props);
        //   if (getValue() !== nextValue) setValue(nextValue);
        //   handleViewerEvent(event);
        // }}
        // onTouchMove={event => {
        //   let nextValue = onTouchMove(event, ViewerDOM.current, getTool(), getValue(), props);
        //   if (getValue() !== nextValue) setValue(nextValue);
        //   handleViewerEvent(event);
        // }}
        // onTouchEnd={event => {
        //   let nextValue = onTouchEnd(event, ViewerDOM.current, getTool(), getValue(), props);
        //   if (getValue() !== nextValue) setValue(nextValue);
        //   handleViewerEvent(event);
        // }}
        // onTouchCancel={event => {
        //   let nextValue = onTouchCancel(event, ViewerDOM.current, getTool(), getValue(), props);
        //   if (getValue() !== nextValue) setValue(nextValue);
        //   handleViewerEvent(event);
        // }}
        >

        <rect
          fill={background}
          x={0}
          y={0}
          width={value.viewerWidth}
          height={value.viewerHeight}
          style={{pointerEvents: "none"}}
        />

        <g
          transform={toSVG(value)}
          style={blockChildEvents ? {pointerEvents: "none"} : {}}>
          <rect
            fill={SVGBackground}
            style={SVGStyle}
            x={value.SVGMinX || 0}
            y={value.SVGMinY || 0}
            width={value.SVGWidth}
            height={value.SVGHeight}/>
          <g>
            {props.children.props.children}
          </g>
        </g>

        {/* {!([TOOL_NONE, TOOL_AUTO].indexOf(tool) >= 0 && props.detectAutoPan && value.focus) ? null : (
          <g style={{pointerEvents: "none"}}>
            {!(pointerY <= 20) ? null :
              <BorderGradient direction={POSITION_TOP} width={value.viewerWidth} height={value.viewerHeight}/>
            }

            {!(value.viewerWidth - pointerX <= 20) ? null :
              <BorderGradient direction={POSITION_RIGHT} width={value.viewerWidth} height={value.viewerHeight}/>
            }

            {!(value.viewerHeight - pointerY <= 20) ? null :
              <BorderGradient direction={POSITION_BOTTOM} width={value.viewerWidth} height={value.viewerHeight}/>
            }

            {!(value.focus && pointerX <= 20) ? null :
              <BorderGradient direction={POSITION_LEFT} width={value.viewerWidth} height={value.viewerHeight}/>
            }
          </g>
        )} */}

        {!(value.mode === MODE_ZOOMING) ? null :
          <Selection startX={value.startX} startY={value.startY} endX={value.endX} endY={value.endY}/>
        }
      </svg>

      {/* {toolbarProps.position === POSITION_NONE ? null :
        <CustomToolbar
          {...toolbarProps}
          value={value}
          onChangeValue={value => setValue(value)}
          tool={tool}
          onChangeTool={tool => props.onChangeTool(tool)}
        />}

      {miniatureProps.position === POSITION_NONE ? null :
        <CustomMiniature
          {...miniatureProps}
          value={value}
          onChangeValue={value => setValue(value)}
          SVGBackground={props.SVGBackground}
        >
          {props.children.props.children}
        </CustomMiniature>
      } */}
    </div>
  );
};

export default ReactSVGPanZoom;

