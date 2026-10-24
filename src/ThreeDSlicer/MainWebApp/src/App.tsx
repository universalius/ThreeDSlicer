import React, { useEffect, useState } from 'react'
import { SvgRenderer } from './components/SvgRenderer'
import styles from './App.module.css'
import type { WebViewMessage, WebViewBridge } from './types'

declare global {
  interface Window {
    chrome?: {
      webview?: WebViewBridge
    }
  }
}

export default function App() {

console.log('App component rendered');


  const [data, setData] = useState<WebViewMessage>({ type: '', svg: '' })

  const handleMessage = (event: MessageEvent) => {
    console.log('Received message from WebView2:', event);

    try {
      setData(event.data)
    } catch (error) {
      console.error('Failed to parse WebView2 message:', error)
    }
  }

  useEffect(() => {
    const webview = window.chrome?.webview

    if (webview) {
      webview.addEventListener('message', handleMessage)
      webview.postMessage(JSON.stringify({ type: 'app-ready' }))
    }

    return () => {
      if (webview) {
        webview.removeEventListener('message', handleMessage)
      }
    }
  }, [])

  const svgMarkup = data?.svg ?? ''

  return (
    <div className={styles.appShell}>
      {/* {!svgMarkup ? (
        <div className={styles.loadingText}>Waiting for SVG data…</div>
      ) : ( */}
        <div className={styles.svgPanel}>
          <SvgRenderer svgMarkup={svgMarkup} />
        </div>
      {/* )} */}
    </div>
  )
}

