import { memo } from 'react';
import { DoubleSide, Vector2, Vector3 } from 'three';
import { Axises } from '../../../types';
import type { useModelObject } from '../useModelObject';

export type ViewName = 'front' | 'left' | 'top';

export const getAxisSlicePlaneMap = (modelSize: Vector3) => ({
  [Axises.XY]: {
    offsetAxis: 'z',
    front: { rotation: [0, 0, 0] as [number, number, number], extent: modelSize.z },
    top: { rotation: [0, 0, 0] as [number, number, number], extent: modelSize.y },
    left: { rotation: [0, 0, Math.PI / 2] as [number, number, number], extent: modelSize.x },
  },
  [Axises.XZ]: {
    offsetAxis: 'y',
    front: { rotation: [Math.PI / 2, 0, 0] as [number, number, number], extent: modelSize.x },
    top: { rotation: [Math.PI / 2, 0, 0] as [number, number, number], extent: modelSize.x },
    left: { rotation: [Math.PI / 2, 0, 0] as [number, number, number], extent: modelSize.y },
  },
  [Axises.YZ]: {
    offsetAxis: 'x',
    front: { rotation: [0, Math.PI / 2, 0] as [number, number, number], extent: modelSize.y },
    top: { rotation: [0, Math.PI / 2, Math.PI / 2] as [number, number, number], extent: modelSize.y },
    left: { rotation: [0, Math.PI / 2, 0] as [number, number, number], extent: modelSize.y },
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

  const planeSize: Record<ViewName, Vector2> = {
    front: new Vector2(modelSize.x, modelSize.y),
    top: new Vector2(modelSize.x, modelSize.y),
    left: new Vector2(modelSize.z, modelSize.y),
  };

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

  const size = planeSize[view];
  const rotation = axisPlaneView.rotation;

  return (
    <mesh position={position} rotation={rotation} scale={modelScale} renderOrder={10}>
      <boxGeometry args={[size.x, size.y, 1]} />
      <meshBasicMaterial
        color="red"
        transparent
        opacity={0.2}
        side={DoubleSide}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
});
