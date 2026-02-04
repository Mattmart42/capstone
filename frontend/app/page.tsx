'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [status, setStatus] = useState("Checking brain...");

  useEffect(() => {
    // We assume backend is running on port 8000
    axios.get('http://127.0.0.1:8000/health')
      .then(res => setStatus(`Brain says: ${res.data.status}`))
      .catch(err => setStatus("Brain is offline 🔴"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">Ikigai Nexus</h1>
      <p className="text-xl text-green-400 font-mono border border-green-400 p-4 rounded">
        {status}
      </p>
    </main>
  );
}