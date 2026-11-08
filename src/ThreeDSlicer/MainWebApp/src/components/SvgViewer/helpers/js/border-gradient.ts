import type { CSSProperties } from 'react';

const POSITION_TOP = 'top' as const;
const POSITION_RIGHT = 'right' as const;
const POSITION_BOTTOM = 'bottom' as const;
const POSITION_LEFT = 'left' as const;

type Direction =
  | typeof POSITION_TOP
  | typeof POSITION_RIGHT
  | typeof POSITION_BOTTOM
  | typeof POSITION_LEFT;

type BorderGradientProps = {
  direction: Direction;
  width: number;
  height: number;
  _uid?: string;
};

const prefixID = 'react-svg-pan-zoom_border_gradient';

const getTransform = (direction: Direction, width: number, height: number): string => {
  switch (direction) {
    case POSITION_TOP:
      return `translate(${width}, 0) rotate(90)`;
    case POSITION_RIGHT:
      return `translate(${width}, ${height}) rotate(180)`;
    case POSITION_BOTTOM:
      return `translate(0, ${height}) rotate(270)`;
    case POSITION_LEFT:
    default:
      return ' ';
  }
};

const BorderGradient = ({
  direction,
  width,
  height,
  _uid = 'default',
}: BorderGradientProps) => {
  const transform = getTransform(direction, width, height);
  const gradientID = `${prefixID}_gradient_${_uid}`;
  const maskID = `${prefixID}_mask_${_uid}`;
  const rectStyle: CSSProperties = {
    stroke: 'none',
    fill: `url(#${gradientID})`,
  };

  return (
    <g>
      <defs>
        <linearGradient
          id={gradientID}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
          spreadMethod="pad"
        >
          <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
        </linearGradient>

        <mask id={maskID} x="0" y="0" width="20" height={Math.max(width, height)}>
          <rect
            x="0"
            y="0"
            width="20"
            height={Math.max(width, height)}
            style={rectStyle}
          />
        </mask>
      </defs>

      <rect
        x="0"
        y="0"
        width="20"
        height={Math.max(width, height)}
        style={{ stroke: 'none', fill: '#000', mask: `url(#${maskID})` }}
        transform={transform}
      />
    </g>
  );
};

export { POSITION_TOP, POSITION_RIGHT, POSITION_BOTTOM, POSITION_LEFT };
export default BorderGradient;
