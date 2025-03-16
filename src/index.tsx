import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import './print.css';
import App from './App';
import ErrorApp from './components/ErrorApp';
import { ErrorBoundary } from 'react-error-boundary';

const root = ReactDOM.createRoot(
  document.getElementById('root')! // eslint-disable-line @typescript-eslint/no-non-null-assertion -- index.html
);
root.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorApp}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

registerSW({
  onOfflineReady() {
    console.log("Ready to work offline!");
  },
});
