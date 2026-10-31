import React, { useEffect, useState } from 'react'
import { SvgRenderer } from './components/SvgRenderer'
import styles from './App.module.css'
import { Axises } from './types'
import type { WebViewMessage, WebViewBridge } from './types'
import svgTest from './components/svgTest.svg?raw'

declare global {
  interface Window {
    chrome?: {
      webview?: WebViewBridge
    }
  }
}

export default function App() {
  console.log('App component rendered')

  const [data, setData] = useState<WebViewMessage>()
  const [selectedAxis, setSelectedAxis] = useState<Axises>(Axises.XY)
  const [slicePosition, setSlicePosition] = useState<number>(50)
  const webview = window.chrome?.webview

  const handleMessage = (event: MessageEvent) => {
    console.log('Received message from WebView2:', event)

    try {
      setData(event.data)
    } catch (error) {
      console.error('Failed to parse WebView2 message:', error)
    }
  }

  const sendCrossSection = (axis: Axises) => {
    setSelectedAxis(axis)
    webview?.postMessage(JSON.stringify({ type: 'cross-section', axis }))
  }

  const handleSliceChange = (value: number) => {
    setSlicePosition(value)
  }

  const handleSliceCommit = () => {
    console.log('Sending slice position to WebView2:', slicePosition)
    webview?.postMessage(JSON.stringify({ type: 'cross-section', axis: selectedAxis, cutPosition: slicePosition }))
  }

  useEffect(() => {
    if (webview) {
      webview.addEventListener('message', handleMessage)
      webview.postMessage(JSON.stringify({ type: 'app-ready' }))
    }

    return () => {
      if (webview) {
        webview.removeEventListener('message', handleMessage)
      }
    }
  }, [webview])

  const svgMarkup = data?.svg ?? svgTest
  const axisOptions = [
    { label: 'Front', axis: Axises.XY },
    { label: 'Left', axis: Axises.YZ },
    { label: 'Top', axis: Axises.XZ },
  ]
  const selectedViewLabel = axisOptions.find(({ axis }) => axis === selectedAxis)?.label ?? 'Front'

  return (
    <div className={styles.appShell}>
      <div className={styles.buttonRow}>
        <div className={styles.buttonGroup}>
          {axisOptions.map(({ label, axis }) => (
            <button
              key={label}
              type="button"
              className={selectedAxis === axis ? `${styles.axisButton} ${styles.axisButtonSelected}` : styles.axisButton}
              onClick={() => sendCrossSection(axis)}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="range"
          min={1}
          max={99}
          value={slicePosition}
          onChange={(event) => handleSliceChange(Number(event.target.value))}
          onMouseUp={handleSliceCommit}
          className={styles.sliceSlider}
          aria-label="Slice position"
        />

        <div className={styles.selectedText}>View: {selectedViewLabel}</div>
      </div>

      {!svgMarkup ? (
        <div className={styles.loadingText}>Waiting for SVG data…</div>
      ) : (
        <div className={styles.svgPanel}>
          <SvgRenderer svgMarkup={svgMarkup} />
        </div>
      )}
    </div>
  )
}

