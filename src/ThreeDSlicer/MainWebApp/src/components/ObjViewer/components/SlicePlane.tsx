import { memo } from 'react';
import { DoubleSide, Vector2, Vector3 } from 'three';
import { Axises } from '../../../types';
import type { useModelObject } from '../useModelObject';

export type ViewName = 'front' | 'left' | 'top';

export const getAxisSlicePlaneMap = (modelSize: Vector3) => ({
  [Axises.XY]: {
    offsetAxis: 'z',
    size: new Vector2(modelSize.x, modelSize.y),
    front: { rotation: [0, 0, 0] as [number, number, number], extent: modelSize.z },
    top: { rotation: [0, 0, 0] as [number, number, number], extent: modelSize.z },
    left: { rotation: [0, 0, 0] as [number, number, number], extent: modelSize.z },
  },
  [Axises.XZ]: {
    offsetAxis: 'y',
    size: new Vector2(modelSize.x, modelSize.z),
    front: { rotation: [Math.PI / 2, 0, 0] as [number, number, number], extent: modelSize.y },
    top: { rotation: [Math.PI / 2, 0, 0] as [number, number, number], extent: modelSize.y },
    left: { rotation: [Math.PI / 2, 0, 0] as [number, number, number], extent: modelSize.y },
  },
  [Axises.YZ]: {
    offsetAxis: 'x',
    size: new Vector2(modelSize.z, modelSize.y),
    front: { rotation: [0, Math.PI / 2, 0] as [number, number, number], extent: modelSize.x },
    top: { rotation: [0, Math.PI / 2, 0] as [number, number, number], extent: modelSize.x },
    left: { rotation: [0, Math.PI / 2, 0] as [number, number, number], extent: modelSize.x },
  },
});

export const SlicePlane = memo(function SlicePlane({
  view,
  slicePosition,
  model,
  axis,
}: {
  view: ViewName;
  axis: Axises;
  slicePosition: number;
  model: ReturnType<typeof useModelObject>;
}) {
  const { size: modelSize, scale: modelScale } = model;
  const axisPlane = getAxisSlicePlaneMap(modelSize)[axis];
  const axisPlaneView = axisPlane[view];
  const axisExtent = axisPlaneView.extent;
  const offset = ((slicePosition - 50) / 50) * (axisExtent / 2) * modelScale;

  const position = new Vector3(0, 0, 0);

  switch (axisPlane.offsetAxis) {
    case 'x':
      position.x = offset;
      break;
    case 'y':
      position.y = offset;
      break;
    case 'z':
      position.z = offset;
      break;
  }

  const size = axisPlane.size;
  const rotation = axisPlaneView.rotation;

  const isPlaneFaceOn = (() => {
    switch (axis) {
      case Axises.XY:
        return view === 'front';
      case Axises.XZ:
        return view === 'top';
      case Axises.YZ:
        return view === 'left';
      default:
        return false;
    }
  })();

  const opacity = isPlaneFaceOn ? 0.08 : 0.2;

  return (
    <mesh position={position} rotation={rotation} scale={modelScale} renderOrder={10}>
      <boxGeometry args={[size.x, size.y, 1.5]} />
      <meshBasicMaterial color="red" transparent opacity={opacity} side={DoubleSide} depthTest={false} depthWrite={false} />
    </mesh>
  );
});