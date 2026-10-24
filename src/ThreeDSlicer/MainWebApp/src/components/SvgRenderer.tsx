import { useEffect, useMemo, useRef, useState } from 'react'
import { UncontrolledReactSVGPanZoom } from 'react-svg-pan-zoom'
import { renderSvgNode } from '../helpers/renderSvgNode'

export const SvgRenderer = ({ svgMarkup }: { svgMarkup: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
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
        width={viewportSize.width}
        height={viewportSize.height}
        defaultTool="auto"
        defaultValue={{}}
        scaleFactorMin={0.2}
        scaleFactorMax={8}
        background="transparent"
        miniatureProps={{ position: 'none' }}
        toolbarProps={{ position: 'none' }}
      >
        {renderedSvg}
      </UncontrolledReactSVGPanZoom>
    </div>
  )
}
