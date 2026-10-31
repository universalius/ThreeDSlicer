import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { OBJLoader } from 'three-stdlib'
import { Box3, Vector2, Vector3, DoubleSide, type Group } from 'three'
import { memo, useMemo } from 'react'
import { Axises } from '../../types'

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

    return useMemo(() => {
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
    }, [object])
}

const ModelFromText = memo(function ModelFromText({ objText }: { objText: string }) {
    const { object, scale, position } = useModelObject({ objText })

    if (!object) {
        return null
    }

    return <primitive object={object} scale={scale} position={position} />
})

const ModelFromUrl = memo(function ModelFromUrl({ url }: { url: string }) {
    const { object, scale, position } = useModelObject({ url })

    if (!object) {
        return null
    }

    return <primitive object={object} scale={scale} position={position} />
})

type ViewName = 'front' | 'left' | 'top'

const cameraPositions: Record<ViewName, [number, number, number]> = {
    front: [0, 0, 10],
    left: [-10, 0, 0],
    top: [0, 10, 0],
}

const Model = memo(function Model({ url, objText }: { url?: string; objText?: string }) {
    if (objText) {
        return <ModelFromText objText={objText} />
    }

    if (url) {
        return <ModelFromUrl url={url} />
    }

    return null
})

const getAxisSlicePlaneMap = (modelSize: Vector3) => ({
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
})

const SlicePlane = memo(function SlicePlane({
    view,
    slicePosition,
    model,
    axis,
}: {
    view: ViewName
    axis: Axises
    slicePosition: number
    model: ReturnType<typeof useModelObject>
}) {
    console.log('SlicePlane render', { view, axis, slicePosition, model })


    const { size: modelSize, scale: modelScale } = model
    const axisPlane = getAxisSlicePlaneMap(modelSize)[axis]
    const axisPlaneView =axisPlane[view]
    const axisExtent = axisPlaneView.extent
    const offset = ((slicePosition - 50) / 50) * (axisExtent / 2) * modelScale

    const planeSize: Record<ViewName, Vector2> = {
        front: new Vector2(modelSize.x, modelSize.y),
        top: new Vector2(modelSize.x, modelSize.y),
        left: new Vector2(modelSize.z, modelSize.y),
    }

    const position = new Vector3(0, 0, 0)

    switch (axisPlane.offsetAxis) {
        case 'x':
            position.x = offset
            break
        case 'y':
            position.y = offset
            break
        case 'z':
            position.z = offset
            break
    }

    const size = planeSize[view]
    const rotation = axisPlaneView.rotation

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
})

export function ObjViewer({
    view = 'front',
    axis = Axises.XY,
    url,
    objText,
    slicePosition = 50,
}: {
    view?: ViewName
    axis?: Axises
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
                <SlicePlane view={view} axis={axis} slicePosition={slicePosition} model={model} />

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
