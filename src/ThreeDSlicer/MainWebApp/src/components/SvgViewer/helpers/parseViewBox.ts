export const parseViewBox = (
  viewbox: string,
): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} => {
  SVGSVGElement;

  // viewBox specs: https://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
  const numbers = viewbox
    .split(/[ ,]/) // split optional comma
    .filter(Boolean) // remove empty strings
    .map(Number); // cast to Number

  return {
    minX: numbers[0],
    minY: numbers[1],
    width: numbers[2],
    height: numbers[3],
  };
};
