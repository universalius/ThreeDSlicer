import { useEffect, useMemo, useRef, useState } from 'react'
import { UncontrolledReactSVGPanZoom } from 'react-svg-pan-zoom'
import { renderSvgNode } from '../helpers/renderSvgNode'

export const SvgRenderer = ({ svgMarkup }: { svgMarkup: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewer = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const element = containerRef.current

    if (!element) {
      return
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setViewportSize({
        width: Math.max(300, Math.round(rect.width)),
        height: Math.max(250, Math.round(rect.height)),
      })

      viewer.current?.fitToViewer();
    }

    updateSize()


    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [])

  const renderedSvg = useMemo(() => {
    if (!svgMarkup) {
      return null
    }

    const parsed = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
    const svgElement = parsed.documentElement

    if (!svgElement || svgElement.nodeName.toLowerCase() !== 'svg') {
      return null
    }

    return renderSvgNode(svgElement)
  }, [svgMarkup])

  if (!renderedSvg) {
    return null
  }

  return (
    <div ref={containerRef} className="svgViewport">
      <UncontrolledReactSVGPanZoom
        ref={viewer}
        width={viewportSize.width}
        height={viewportSize.height}
        defaultTool="pan"
        scaleFactorMin={0.2}
        scaleFactorMax={8}
        background="transparent"
        miniatureProps={{ position: 'none' }}
        toolbarProps={{ position: 'none' }}
      >
        {renderedSvg}
      </UncontrolledReactSVGPanZoom>

      {/* <UncontrolledReactSVGPanZoom
        ref={viewer}
        width={500} height={500}
        onZoom={e => console.log('zoom')}
        onPan={e => console.log('pan')}
        onClick={event => console.log('click', event.x, event.y, event.originalEvent)}
      >
        <svg width="100%" height="100%">
          <g fillOpacity=".5" strokeWidth="4">
            <rect x="400" y="40" width="900" height="900" fill="#4286f4" stroke="#f4f142"/>
            <circle cx="108" cy="108.5" r="100" fill="#0ff" stroke="#0ff"/>
            <circle cx="180" cy="209.5" r="100" fill="#ff0" stroke="#ff0"/>
            <circle cx="220" cy="109.5" r="100" fill="#f0f" stroke="#f0f"/>
          </g>
        </svg>
      </UncontrolledReactSVGPanZoom> */}
    </div>
  )
}
