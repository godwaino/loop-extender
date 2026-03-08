import React, { useMemo, useState } from "react";

type LoopResponse = {
  success: boolean;
  downloadUrl: string;
  filename?: string;
  loopDurationSeconds?: number;
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

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeStart, setYoutubeStart] = useState(30);
  const [youtubeDuration, setYoutubeDuration] = useState(8);
  const [youtubeUseBeatAlign, setYoutubeUseBeatAlign] = useState(true);

  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extractingYoutube, setExtractingYoutube] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!downloadUrl) return null;
    return `${downloadUrl}?t=${Date.now()}`;
  }, [downloadUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setInfoMessage(null);
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
    setInfoMessage(null);

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

  const handleYoutubeExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) return;

    setExtractingYoutube(true);
    setError(null);
    setInfoMessage(null);

    try {
      const body: Record<string, string | number> = {
        url: youtubeUrl,
        startTimeSeconds: youtubeStart,
      };

      if (youtubeUseBeatAlign) {
        body.bpm = bpm;
        body.beatsPerLoop = beatsPerLoop;
      } else {
        body.loopDurationSeconds = youtubeDuration;
      }

      const res = await fetch(`${API_BASE}/loop/extract-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as LoopResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "YouTube extraction failed");
      }

      setDownloadUrl(data.downloadUrl);
      setCurrentFilename(data.filename || extractFilename(data.downloadUrl));
      if (data.loopDurationSeconds) {
        setInfoMessage(`Extracted loop length: ${data.loopDurationSeconds.toFixed(3)}s`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtractingYoutube(false);
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>🎵 Continuous Audio Loop Extender</h1>
      <p style={{ color: "#555" }}>
        Build loops from uploaded files, extend existing outputs, or extract precise loop sections from YouTube songs.
      </p>

      <form onSubmit={handleSubmit}>
        <h2>Upload audio</h2>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Upload Audio File:</label>
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Initial Loop Count: {loopCount}</label>
          <input
            type="range"
            min="1"
            max="100"
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

        <button type="submit" disabled={!file || loading} style={{ padding: "10px 20px" }}>
          {loading ? "Processing..." : "Generate Loop"}
        </button>
      </form>

      <form onSubmit={handleYoutubeExtract} style={{ marginTop: "28px", borderTop: "1px solid #ddd", paddingTop: "18px" }}>
        <h2>Extract loop from YouTube (accurate mode)</h2>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>YouTube URL</label>
          <input
            type="url"
            required
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
          <label>
            Start time (sec)
            <input
              type="number"
              min={0}
              max={7200}
              value={youtubeStart}
              onChange={(e) => setYoutubeStart(Number(e.target.value))}
              style={{ marginLeft: "8px", width: "100px" }}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={youtubeUseBeatAlign}
              onChange={(e) => setYoutubeUseBeatAlign(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Use BPM/beats for extraction (recommended)
          </label>
        </div>

        {!youtubeUseBeatAlign && (
          <div style={{ marginBottom: "10px" }}>
            <label>
              Loop duration (sec)
              <input
                type="number"
                min={0.25}
                max={120}
                step={0.01}
                value={youtubeDuration}
                onChange={(e) => setYoutubeDuration(Number(e.target.value))}
                style={{ marginLeft: "8px", width: "100px" }}
              />
            </label>
          </div>
        )}

        <button type="submit" disabled={extractingYoutube || !youtubeUrl} style={{ padding: "10px 20px" }}>
          {extractingYoutube ? "Extracting..." : "Extract Loop From YouTube"}
        </button>
      </form>

      {error && <div style={{ marginTop: "20px", color: "red" }}>Error: {error}</div>}
      {infoMessage && <div style={{ marginTop: "12px", color: "#0b6" }}>{infoMessage}</div>}

      {downloadUrl && (
        <div style={{ marginTop: "24px", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Result</h2>
          {previewUrl && <audio key={previewUrl} controls style={{ width: "100%", marginBottom: "12px" }} src={previewUrl} />}

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
            <label>
              Extend by:
              <select
                value={extendCount}
                onChange={(e) => setExtendCount(Number(e.target.value))}
                style={{ marginLeft: "8px" }}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} loops
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleExtend} disabled={extending || !currentFilename} style={{ padding: "8px 12px" }}>
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
