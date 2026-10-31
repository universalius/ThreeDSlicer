import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { OBJLoader } from 'three-stdlib'
import { Box3, Vector3, type Group } from 'three'
import { useMemo } from 'react'

function getModelPlacement(object: Group) {
    object.updateMatrixWorld(true)

    const box = new Box3().setFromObject(object)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())

    const maxDimension = Math.max(size.x, size.y, size.z, 0.0001)
    const targetVisibleSize = 4
    const scale = targetVisibleSize / maxDimension

    const position: [number, number, number] = [
        -center.x * scale,
        -center.y * scale,
        -center.z * scale,
    ]

    return { scale, position }
}

function ModelFromText({ objText }: { objText: string }) {
    const object = useMemo(() => {
        const loader = new OBJLoader()
        return loader.parse(objText) as Group
    }, [objText])

    const { scale, position } = useMemo(() => getModelPlacement(object), [object])

    return <primitive object={object} scale={scale} position={position} />
}

function ModelFromUrl({ url }: { url: string }) {
    const object = useLoader(OBJLoader, url) as Group
    const { scale, position } = useMemo(() => getModelPlacement(object), [object])

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

export function ObjViewer({
    view = 'front',
    url,
    objText,
}: {
    view?: ViewName
    url?: string
    objText?: string
}) {
    const cameraPosition = cameraPositions[view]

    return (
        <div style={{ width: '100%', height: '100%', minHeight: 420 }}>
            <Canvas>
                <color attach="background" args={['#f8fafc']} />

                <OrthographicCamera
                    makeDefault
                    position={cameraPosition}
                    zoom={80}
                    near={0.1}
                    far={1000}
                />

                <ambientLight intensity={1.2} />
                <directionalLight position={[10, 10, 5]} intensity={1.8} />
                <directionalLight position={[-10, -5, -10]} intensity={0.8} />

                <Model url={url} objText={objText} />

                <OrbitControls
                    enableRotate={false}
                    enablePan={false}
                    enableZoom={true}
                    target={[0, 0, 0]}
                />
            </Canvas>
        </div>
    )
}
