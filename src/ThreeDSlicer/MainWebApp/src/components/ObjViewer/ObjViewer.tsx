import { Canvas } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { memo } from 'react';
import { Axises } from '../../types';
import { SlicePlane, type ViewName } from './components/SlicePlane';
import { useModelObject } from './useModelObject';

const ModelFromText = memo(function ModelFromText({ objText }: { objText: string }) {
  const { object, scale, position } = useModelObject({ objText });

  if (!object) {
    return null;
  }

  return <primitive object={object} scale={scale} position={position} />;
});

const ModelFromUrl = memo(function ModelFromUrl({ url }: { url: string }) {
  const { object, scale, position } = useModelObject({ url });

  if (!object) {
    return null;
  }

  return <primitive object={object} scale={scale} position={position} />;
});

const cameraPositions: Record<ViewName, [number, number, number]> = {
  front: [0, 0, 10],
  left: [-10, 0, 0],
  top: [0, 10, 0],
};

type LightConfig = {
  key: [number, number, number];
  fill: [number, number, number];
};

const viewLights: Record<ViewName, LightConfig> = {
  front: {
    key: [8, 8, 10],
    fill: [-8, -4, 6],
  },
  left: {
    key: [-10, 8, 8],
    fill: [-6, -4, -8],
  },
  top: {
    key: [8, 10, 8],
    fill: [-8, 6, -8],
  },
};

const Model = memo(function Model({ url, objText }: { url?: string; objText?: string }) {
  if (objText) {
    return <ModelFromText objText={objText} />;
  }

  if (url) {
    return <ModelFromUrl url={url} />;
  }

  return null;
});

export function ObjViewer({
  view = 'front',
  axis = Axises.XY,
  url,
  objText,
  slicePosition = 50,
}: {
  view?: ViewName;
  axis?: Axises;
  url?: string;
  objText?: string;
  slicePosition?: number;
}) {
  const cameraPosition = cameraPositions[view];
  const lights = viewLights[view];
  const model = useModelObject({ url, objText });

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 250 }}>
      <Canvas>
        <color attach="background" args={['#f8fafc']} />

        <OrthographicCamera makeDefault position={cameraPosition} zoom={55} near={0.1} far={1000} />

        <ambientLight intensity={0.5} />
        <directionalLight position={lights.key} intensity={1.8} />
        <directionalLight position={lights.fill} intensity={0.45} />

        <Model url={url} objText={objText} />
        <SlicePlane view={view} axis={axis} slicePosition={slicePosition} model={model} />

        <OrbitControls enableRotate={false} enablePan={true} enableZoom={true} target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}