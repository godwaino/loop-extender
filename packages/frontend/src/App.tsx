import React, { useState } from "react";

const API_BASE = import.meta.env.PROD ? "/api" : "/api";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loopCount, setLoopCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("loopCount", String(loopCount));

    try {
      const res = await fetch(`${API_BASE}/loop`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setDownloadUrl(data.downloadUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px" }}>
      <h1>🎵 Background Audio Looper</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Upload Audio File:
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Loop Count: {loopCount}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={loopCount}
            onChange={(e) => setLoopCount(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Processing..." : "Loop Audio"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: "20px", color: "red" }}>
          Error: {error}
        </div>
      )}

      {downloadUrl && (
        <div style={{ marginTop: "20px" }}>
          <a
            href={downloadUrl}
            download
            style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            Download Looped Audio
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
