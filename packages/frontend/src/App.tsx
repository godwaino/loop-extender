import React, { useMemo, useState } from "react";

type LoopResponse = {
  success: boolean;
  downloadUrl: string;
  filename?: string;
};

const API_BASE = "/api";

function extractFilename(downloadUrl: string): string | null {
  const parts = downloadUrl.split("/");
  return parts.length ? parts[parts.length - 1] : null;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loopCount, setLoopCount] = useState(3);
  const [extendCount, setExtendCount] = useState(2);
  const [enableBeatAlign, setEnableBeatAlign] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beatsPerLoop, setBeatsPerLoop] = useState(4);
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!downloadUrl) return null;
    return `${downloadUrl}?t=${Date.now()}`;
  }, [downloadUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setCurrentFilename(null);

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("loopCount", String(loopCount));

    if (enableBeatAlign) {
      formData.append("bpm", String(bpm));
      formData.append("beatsPerLoop", String(beatsPerLoop));
    }

    try {
      const res = await fetch(`${API_BASE}/loop`, {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as LoopResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setDownloadUrl(data.downloadUrl);
      setCurrentFilename(data.filename || extractFilename(data.downloadUrl));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!currentFilename) return;

    setExtending(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/loop/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: currentFilename,
          additionalLoops: extendCount,
          ...(enableBeatAlign ? { bpm, beatsPerLoop } : {}),
        }),
      });

      const data = (await res.json()) as LoopResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Extend failed");
      }

      setDownloadUrl(data.downloadUrl);
      setCurrentFilename(data.filename || extractFilename(data.downloadUrl));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtending(false);
    }
  };

  return (
    <div style={{ maxWidth: "720px", margin: "50px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>🎵 Continuous Audio Loop Extender</h1>
      <p style={{ color: "#555" }}>
        Upload a short audio clip, generate a loop, preview it, then keep extending it without re-uploading.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Upload Audio File:</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Initial Loop Count: {loopCount}</label>
          <input
            type="range"
            min="1"
            max="10"
            value={loopCount}
            onChange={(e) => setLoopCount(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "15px", padding: "12px", border: "1px solid #ddd", borderRadius: "6px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={enableBeatAlign}
              onChange={(e) => setEnableBeatAlign(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Smart beat alignment
          </label>
          <p style={{ margin: "0 0 10px 0", color: "#666", fontSize: "14px" }}>
            Trim each source loop to a beat-sized length before repeating.
          </p>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <label>
              BPM:
              <input
                type="number"
                min={40}
                max={240}
                value={bpm}
                disabled={!enableBeatAlign}
                onChange={(e) => setBpm(Number(e.target.value))}
                style={{ marginLeft: "8px", width: "90px" }}
              />
            </label>
            <label>
              Beats per loop:
              <input
                type="number"
                min={1}
                max={32}
                value={beatsPerLoop}
                disabled={!enableBeatAlign}
                onChange={(e) => setBeatsPerLoop(Number(e.target.value))}
                style={{ marginLeft: "8px", width: "90px" }}
              />
            </label>
          </div>
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
          {loading ? "Processing..." : "Generate Loop"}
        </button>
      </form>

      {error && <div style={{ marginTop: "20px", color: "red" }}>Error: {error}</div>}

      {downloadUrl && (
        <div style={{ marginTop: "24px", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Result</h2>
          {previewUrl && (
            <audio key={previewUrl} controls style={{ width: "100%", marginBottom: "12px" }} src={previewUrl} />
          )}

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
            <label>
              Extend by:
              <select
                value={extendCount}
                onChange={(e) => setExtendCount(Number(e.target.value))}
                style={{ marginLeft: "8px" }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} loops
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleExtend}
              disabled={extending || !currentFilename}
              style={{ padding: "8px 12px", cursor: extending ? "not-allowed" : "pointer" }}
            >
              {extending ? "Extending..." : "Extend Current Audio"}
            </button>
          </div>

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
            Download Current Audio
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
