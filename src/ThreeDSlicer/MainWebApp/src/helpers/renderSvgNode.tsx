import React from 'react'

const normalizeSvgAttributeName = (name: string): string => {
  if (name === 'class') {
    return 'className'
  }

  if (name === 'for') {
    return 'htmlFor'
  }

  if (name === 'viewBox') {
    return 'viewBox'
  }

  if (name.startsWith('data-') || name.startsWith('aria-')) {
    return name
  }

  if (name.includes(':')) {
    return name.replace(/:([a-z])/g, (_, letter: string) => letter.toUpperCase())
  }

  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

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
    const propName = normalizeSvgAttributeName(name)

    if (name === 'style') {
      props.style = parseCssStyle(value)
      continue
    }

    if (name === 'class') {
      props.className = value
      continue
    }

    props[propName] = value
  }

  const children = Array.from(element.childNodes).map(renderSvgNode)

  return React.createElement(tagName, props, ...children)
}
