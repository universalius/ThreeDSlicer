import React from 'react'

const parseCssStyle = (styleText: string): Record<string, string> => {
  const style: Record<string, string> = {}

  for (const declaration of styleText.split(';')) {
    const [rawKey, ...rest] = declaration.split(':')
    const key = rawKey?.trim()
    const value = rest.join(':').trim()

    if (!key || !value) {
      continue
    }

    style[key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value
  }

  return style
}

export const renderSvgNode = (node: Node): React.ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  const tagName = element.tagName.toLowerCase()
  const props: Record<string, unknown> = {}

  for (const attribute of Array.from(element.attributes)) {
    const { name, value } = attribute

    if (name === 'style') {
      props.style = parseCssStyle(value)
      continue
    }

    if (name === 'class') {
      props.className = value
      continue
    }

    props[name] = value
  }

  const children = Array.from(element.childNodes).map(renderSvgNode)

  return React.createElement(tagName, props, ...children)
}
