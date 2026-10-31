import React, { useEffect, useState } from 'react'
import { SvgRenderer } from './components/SvgRenderer'
import { ObjViewer } from './components/ObjViewer'
import styles from './App.module.css'
import { Axises } from './types'
import type { WebViewMessage, WebViewBridge, WebViewResponse, CrossSectionData, ObjData } from './types'
import svgTest from './components/svgTest.svg?raw'
// import objTest from './components/cube.obj?raw'
import objTest from './components/test_cross_section.obj?raw'

declare global {
  interface Window {
    chrome?: {
      webview?: WebViewBridge
    }
  }
}

export default function App() {
  console.log('App component rendered')

  const [svgData, setSvgData] = useState<string>()
  const [objData, setObjData] = useState<string>()
  const [selectedAxis, setSelectedAxis] = useState<Axises>(Axises.XY)
  const [slicePosition, setSlicePosition] = useState<number>(50)
  const webview = window.chrome?.webview
  const selectedView = selectedAxis === Axises.YZ ? 'left' : selectedAxis === Axises.XZ ? 'top' : 'front'

  const consumeMessage = (event: MessageEvent<WebViewResponse<unknown>>) => {
    console.log('Received message from WebView2:', event)

    try {
      if (event.data.type == 'app-ready') {
        setObjData((event.data.data as ObjData).obj)
      }

      if (event.data.type == 'cross-section') {
        setSvgData((event.data.data as CrossSectionData).svg)
      }
    } catch (error) {
      console.error('Failed to parse WebView2 message:', error)
    }
  }

  const sendCrossSectionMessage = (axis: Axises, cutPosition?: number) => {
    webview?.postMessage(JSON.stringify({ type: 'cross-section', axis, cutPosition }))
  }

  const handleAxisButtonClick = (axis: Axises) => {
    setSelectedAxis(axis)
    sendCrossSectionMessage(axis, slicePosition)
  }

  const handleSliceChange = (value: number) => {
    setSlicePosition(value)
  }

  const handleSliceCommit = () => {
    console.log('Sending slice position to WebView2:', slicePosition)
    sendCrossSectionMessage(selectedAxis, slicePosition)
  }

  useEffect(() => {
    if (webview) {
      webview.addEventListener('message', consumeMessage)
      webview.postMessage(JSON.stringify({ type: 'app-ready' }))
      webview.postMessage(JSON.stringify({ type: 'cross-section', axis: selectedAxis, cutPosition: slicePosition }))
    }

    return () => {
      if (webview) {
        webview.removeEventListener('message', consumeMessage)
      }
    }
  }, [webview])

  const svgMarkup = svgData ?? svgTest
  const objContent = objData ?? objTest
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
              onClick={() => handleAxisButtonClick(axis)}
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

      <div className={styles.viewerGrid}>
        {!svgMarkup ? (
          <div className={styles.loadingText}>Waiting for SVG data…</div>
        ) : (
          <div className={styles.svgPanel}>
            <SvgRenderer svgMarkup={svgMarkup} />
          </div>
        )}

        <div className={styles.modelPanel}>
          <div className={styles.panelTitle}>3D OBJ View</div>
          <ObjViewer view={selectedView} objText={objContent} />
        </div>
      </div>
    </div>
  )
}

