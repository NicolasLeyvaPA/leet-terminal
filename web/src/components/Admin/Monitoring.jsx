import React from 'react';

export default function Monitoring() {
  // Embed Grafana UI in an iframe. Assumes Grafana is reachable at /grafana on dev host.
  const grafanaUrl = process.env.REACT_APP_GRAFANA_URL || 'http://localhost:3000/dashboard/home';

  return (
    <div style={{height: '100%'}}>
      <h2>Admin Monitoring</h2>
      <p>Grafana dashboard (click to open in new tab if iframe blocked):</p>
      <iframe
        title="Grafana"
        src={grafanaUrl}
        style={{width: '100%', height: '80vh', border: '1px solid #ddd'}}
      />
    </div>
  );
}
