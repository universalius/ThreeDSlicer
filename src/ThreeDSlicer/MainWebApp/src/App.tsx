import React, { useEffect, useState } from 'react';
import { SvgRenderer } from './components/SvgRenderer/SvgRenderer';
import { ObjViewer } from './components/ObjViewer/ObjViewer';
import styles from './App.module.css';
import { Axises } from './types';
import type { WebViewMessage, WebViewBridge, WebViewResponse, CrossSectionData, ObjData } from './types';
// import svgTest from './components/assets/svgTest.svg?raw';
import svgTest from './components/assets/mosfetSvgTest.svg?raw';
// import objTest from './components/assets/cube.obj?raw';
// import objTest from './components/assets/test_cross_section.obj?raw';
import objTest from './components/assets/Mosfet.obj?raw';

declare global {
  interface Window {
    chrome?: {
      webview?: WebViewBridge;
    };
  }
}

export default function App() {
  console.log('App component rendered');

  const [svgData, setSvgData] = useState<string>();
  const [objData, setObjData] = useState<string>();
  const [selectedAxis, setSelectedAxis] = useState<Axises>(Axises.XY);
  const [slicePosition, setSlicePosition] = useState<number>(50);
  const webview = window.chrome?.webview;
  const selectedView = selectedAxis === Axises.YZ ? 'left' : selectedAxis === Axises.XZ ? 'top' : 'front';

  const consumeMessage = (event: MessageEvent<WebViewResponse<unknown>>) => {
    console.log('Received message from WebView2:', event);

    try {
      if (event.data.type == 'app-ready') {
        setObjData((event.data.data as ObjData).obj);
      }

      if (event.data.type == 'cross-section') {
        setSvgData((event.data.data as CrossSectionData).svg);
      }
    } catch (error) {
      console.error('Failed to parse WebView2 message:', error);
    }
  };

  const sendCrossSectionMessage = (axis: Axises, cutPosition?: number) => {
    webview?.postMessage(JSON.stringify({ type: 'cross-section', axis, cutPosition }));
  };

  const handleAxisButtonClick = (axis: Axises) => {
    setSelectedAxis(axis);
    setSlicePosition(50);
    sendCrossSectionMessage(axis, slicePosition);
  };

  const handleSliceChange = (value: number) => {
    setSlicePosition(value);
  };

  const handleSliceCommit = () => {
    console.log('Sending slice position to WebView2:', slicePosition);
    sendCrossSectionMessage(selectedAxis, slicePosition);
  };

  useEffect(() => {
    if (webview) {
      webview.addEventListener('message', consumeMessage);
      webview.postMessage(JSON.stringify({ type: 'app-ready', viewportWidth: document.body.clientWidth, viewportHeight: document.body.clientHeight }));
      webview.postMessage(JSON.stringify({ type: 'cross-section', axis: selectedAxis, cutPosition: slicePosition }));
    }

    return () => {
      if (webview) {
        webview.removeEventListener('message', consumeMessage);
      }
    };
  }, [webview]);

  const svgMarkup = svgData ?? svgTest;
  const objContent = objData ?? objTest;
  const axisOptions = [
    { label: 'Front', axis: Axises.XY },
    { label: 'Left', axis: Axises.YZ },
    { label: 'Top', axis: Axises.XZ },
  ];
  const selectedViewLabel = axisOptions.find(({ axis }) => axis === selectedAxis)?.label ?? 'Front';
  const modelViews = [
    { label: 'Front', view: 'front' as const },
    { label: 'Top', view: 'top' as const },
    { label: 'Left', view: 'left' as const },
  ];

  return (
    <div className={styles.appShell}>
      <div className={styles.viewerGrid}>
        <div className={styles.modelPanel}>
          <h2 className={styles.panelTitle}>3D View</h2>
          <div className={styles.modelViewStack}>
            {modelViews.map(({ label, view }) => (
              <div key={view} className={styles.modelViewRow}>
                <div className={styles.modelViewLabel}>{label}</div>
                <div className={styles.modelViewCanvas}>
                  <ObjViewer view={view} objText={objContent} axis={selectedAxis} slicePosition={slicePosition} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.crossSectionColumn}>
          <h2>Cross section</h2>
          <div className={styles.controlsRow}>
            <div className={styles.buttonGroup}>
              {axisOptions.map(({ label, axis }) => (
                <button
                  key={label}
                  type="button"
                  className={
                    selectedAxis === axis ? `${styles.axisButton} ${styles.axisButtonSelected}` : styles.axisButton
                  }
                  onClick={() => handleAxisButtonClick(axis)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.sliderRow}>
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
              <div className={styles.sliceValue}>Slice: {slicePosition}</div>
            </div>

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
      </div>
    </div>
  );
}
