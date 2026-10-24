import { useMemo } from 'react'
import { renderSvgNode } from '../helpers/renderSvgNode'

export const SvgRenderer = ({ svgMarkup }: { svgMarkup: string }) => {
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

  return renderedSvg
}
