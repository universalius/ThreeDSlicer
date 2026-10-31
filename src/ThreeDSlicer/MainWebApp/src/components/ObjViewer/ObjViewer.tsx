import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { OBJLoader } from 'three-stdlib'
import { Box3, Vector2, Vector3, DoubleSide, type Group } from 'three'
import { useMemo } from 'react'

function getModelPlacement(object: Group) {
    object.updateMatrixWorld(true)

    const box = new Box3().setFromObject(object)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())

    const maxDimension = Math.max(size.x, size.y, size.z, 0.0001)
    const targetVisibleSize = 4
    const scale = targetVisibleSize / maxDimension

    const position = new Vector3(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale,
    )

    return { scale, position, size }
}

function useModelObject({ url, objText }: { url?: string; objText?: string }) {
    const loadedFromUrl = useLoader(OBJLoader, url ?? 'data:text/plain;base64,') as Group | undefined
    const parsedFromText = useMemo(() => {
        if (!objText) {
            return null
        }

        const loader = new OBJLoader()
        return loader.parse(objText) as Group
    }, [objText])

    const object = url ? loadedFromUrl : parsedFromText

    if (!object) {
        return {
            object: null,
            scale: 1,
            position: new Vector3(),
            size: new Vector3(),
        }
    }

    return {
        object,
        ...getModelPlacement(object),
    }
}

function ModelFromText({ objText }: { objText: string }) {
    const { object, scale, position } = useModelObject({ objText })

    return <primitive object={object} scale={scale} position={position} />
}

function ModelFromUrl({ url }: { url: string }) {
    const { object, scale, position } = useModelObject({ url })

    return <primitive object={object} scale={scale} position={position} />
}

type ViewName = 'front' | 'left' | 'top'

const cameraPositions: Record<ViewName, [number, number, number]> = {
    front: [0, 0, 10],
    left: [-10, 0, 0],
    top: [0, 10, 0],
}

function Model({ url, objText }: { url?: string; objText?: string }) {
    if (objText) {
        return <ModelFromText objText={objText} />
    }

    if (url) {
        return <ModelFromUrl url={url} />
    }

    return null
}

function SlicePlane({
    view,
    slicePosition,
    model,
}: {
    view: ViewName
    slicePosition: number
    model: ReturnType<typeof useModelObject>
}) {

console.log('SlicePlane render:', { view, slicePosition })

    const { size: modelSize, scale: modelScale } = model

    const axisExtent = {
        front: modelSize.z,
        top: modelSize.y,
        left: modelSize.x,
    }[view]

    const offset = ((slicePosition - 50) / 50) * (axisExtent / 2)

    const planeConfig: Record<
        ViewName,
        {
            position: Vector3
            rotation: [number, number, number]
            size: Vector2
        }
    > = {
        front: {
            position: new Vector3(0, 0, offset),
            rotation: [0, 0, 0],
            size: new Vector2(modelSize.x, modelSize.y),
        },
        top: {
            position: new Vector3(0, offset, 0),
            rotation: [0, 0, 0],
            size: new Vector2(modelSize.x, modelSize.y),
        },
        left: {
            position: new Vector3(0, 0, offset),
            rotation: [0, 0, Math.PI / 2],
            size: new Vector2(modelSize.z, modelSize.y),
        },
    }

    const { position, rotation, size } = planeConfig[view]

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
    )
}

export function ObjViewer({
    view = 'front',
    url,
    objText,
    slicePosition = 50,
}: {
    view?: ViewName
    url?: string
    objText?: string
    slicePosition?: number
}) {
    const cameraPosition = cameraPositions[view]
    const model = useModelObject({ url, objText })

    return (
        <div style={{ width: '100%', height: '100%', minHeight: 250 }}>
            <Canvas>
                <color attach="background" args={['#f8fafc']} />

                <OrthographicCamera
                    makeDefault
                    position={cameraPosition}
                    zoom={55}
                    near={0.1}
                    far={1000}
                />

                <ambientLight intensity={1.2} />
                <directionalLight position={[10, 10, 5]} intensity={1.8} />
                <directionalLight position={[-10, -5, -10]} intensity={0.8} />

                <Model url={url} objText={objText} />
                <SlicePlane view={view} slicePosition={slicePosition} model={model} />

                <OrbitControls
                    enableRotate={false}
                    enablePan={true}
                    enableZoom={true}
                    target={[0, 0, 0]}
                />
            </Canvas>
        </div>
    )
}
