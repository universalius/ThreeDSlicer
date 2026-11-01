import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { Box3, Vector3, type Group } from 'three';
import { OBJLoader } from 'three-stdlib';

export function getModelPlacement(object: Group) {
  object.updateMatrixWorld(true);

  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());

  const maxDimension = Math.max(size.x, size.y, size.z, 0.0001);
  const targetVisibleSize = 4;
  const scale = targetVisibleSize / maxDimension;

  const position = new Vector3(-center.x * scale, -center.y * scale, -center.z * scale);

  return { scale, position, size };
}

export function useModelObject({ url, objText }: { url?: string; objText?: string }) {
  const loadedFromUrl = useLoader(OBJLoader, url ?? 'data:text/plain;base64,') as Group | undefined;

  const parsedFromText = useMemo(() => {
    if (!objText) {
      return null;
    }

    const loader = new OBJLoader();
    return loader.parse(objText) as Group;
  }, [objText]);

  const object = url ? loadedFromUrl : parsedFromText;

  return useMemo(() => {
    if (!object) {
      return {
        object: null,
        scale: 1,
        position: new Vector3(),
        size: new Vector3(),
      };
    }

    return {
      object,
      ...getModelPlacement(object),
    };
  }, [object]);
}
