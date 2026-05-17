import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Camera,
  Gamepad2,
  Gauge,
  Headphones,
  Keyboard,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  MousePointer2,
  Pause,
  Play,
  RefreshCw,
  Square,
  Sun,
  Volume2,
  Wifi,
} from "lucide-react";
import "./styles.css";

const MUSIC_SRC = "/audio/midnight-balance.mp3";
const SUB_BASS_SRC = "/audio/sub-bass-calibration.mp3";
const INSTRUMENT_SEPARATION_SRC = "/audio/instrument-separation-test.mp3";
const BINAURAL_SRC = "/audio/binaural-wheatglass.mp3";
const BALANCE_DURATION_SECONDS = 233;
const MUSIC_TRACKS = [
  {
    id: "balance",
    title: "Balance",
    artist: "Spirto",
    album: "FalstaFF",
    src: MUSIC_SRC,
    cover: "/audio/midnight-balance-cover.jpg",
    fallbackDuration: BALANCE_DURATION_SECONDS,
    description: "How balanced headphones are can be judged by compositions with a wide range of sounds.",
    detail: "Playing double bass, vocals, violin sounds and other instruments seems to be a sufficient set.",
  },
  {
    id: "bass-balance",
    title: "Bass Balance",
    artist: "Sub Bass Calibration",
    album: "Sub bass calibration",
    src: SUB_BASS_SRC,
    cover: "/audio/sub-bass-cover-real.jpg",
    description: "Checks whether controlled sub bass stays deep without overpowering the rest of the mix.",
    detail: "An upright bass layer helps reveal boominess, uneven low-end response, or weak bass extension.",
  },
  {
    id: "vocal-clarity",
    title: "Vocal Clarity",
    artist: "Upload needed",
    album: "Male + female vocals",
    src: "",
    cover: "",
    description: "Uses male and female vocal ranges to check presence, warmth, and intelligibility.",
    detail: "Good headphones should keep voices clear without sounding nasal, recessed, or sharp.",
  },
  {
    id: "instrument-separation",
    title: "Instrument Separation",
    artist: "Instrument Separation Test",
    album: "Layer separation",
    src: INSTRUMENT_SEPARATION_SRC,
    cover: "/audio/instrument-separation-cover-real.jpg",
    description: "Layered strings, piano, and percussion help test how well instruments remain distinct.",
    detail: "The goal is to hear each layer without the mix collapsing into a crowded blur.",
  },
  {
    id: "soundstage",
    title: "Soundstage",
    artist: "Binaural Wheatglass",
    album: "Binaural spatial imaging",
    src: BINAURAL_SRC,
    cover: "/audio/binaural-wheatglass-cover-real.jpg",
    description: "Tests width, depth, and the sense of space around sounds.",
    detail: "Cinematic spatial imaging should feel open and placed around you rather than stuck in the center.",
  },
];


const TESTS = [
  { id: "mic", label: "Microphone", path: "/mic/", icon: Mic },
  { id: "audio", label: "Audio", path: "/audio/", icon: Volume2 },
  { id: "webcam", label: "Webcam", path: "/webcam/", icon: Camera },
  { id: "gamepad", label: "Gamepad", path: "/gamepad/", icon: Gamepad2 },
  { id: "keyboard", label: "Keyboard", path: "/keyboard/", icon: Keyboard },
  { id: "mouse", label: "Mouse", path: "/mouse/", icon: MousePointer2 },
  { id: "speed", label: "Speed", path: "/speed/", icon: Gauge },
];

const TEST_COPY = {
  mic: {
    does: "Checks whether your microphone is detected, captures input, and records a short playback sample.",
    instructions: "Allow microphone access, choose the input device you want to test, speak into it, then use Record to confirm playback quality.",
  },
  audio: {
    does: "Checks speaker output, left-right channel routing, stereo playback, and music balance.",
    instructions: "Choose your output device, run the left-right test, then use stereo or music tests to confirm both channels sound clear.",
  },
  webcam: {
    does: "Checks whether your camera is detected and can stream a live preview.",
    instructions: "Allow camera access, choose the camera you want to test, and confirm the preview is sharp and correctly framed.",
  },
  gamepad: {
    does: "Checks controller detection, button presses, and analog axis movement.",
    instructions: "Connect a controller, press any button so the browser detects it, then test every button and stick.",
  },
  keyboard: {
    does: "Checks key detection, modifier keys, repeat behavior, and text input.",
    instructions: "Click inside the keyboard tester, press keys across your keyboard, and confirm each key lights up and appears in history.",
  },
  mouse: {
    does: "Checks mouse buttons, pointer movement, wheel scrolling, double-click, and drag behavior.",
    instructions: "Move inside the test pad, click each mouse button, scroll the wheel, double-click, and drag across the area.",
  },
  speed: {
    does: "Measures connection latency plus download and upload throughput.",
    instructions: "Close heavy downloads or streams, then start the test and wait for all three network results to complete.",
  },
};

function currentTestFromPath() {
  const normalized = window.location.pathname.toLowerCase();
  return TESTS.find((test) => normalized.startsWith(test.path))?.id ?? "mic";
}

function setPathForTest(id) {
  const target = TESTS.find((test) => test.id === id);
  if (target && window.location.pathname !== target.path) {
    window.history.pushState({}, "", target.path);
  }
}

async function listDevices(kind) {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === kind);
}

function normalizeDeviceLabel(label) {
  return label
    .replace(/^(default|communications)\s*-\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isAliasDevice(device) {
  return /^(default|communications)\s*-/i.test(device.label || "");
}

function uniqueDevices(devices) {
  const byLabel = new Map();

  devices.forEach((device) => {
    const key = normalizeDeviceLabel(device.label || device.deviceId || "unknown-device");
    const current = byLabel.get(key);

    if (!current || (isAliasDevice(current) && !isAliasDevice(device))) {
      byLabel.set(key, device);
    }
  });

  return [...byLabel.values()];
}

function DeviceSelect({ label, value, devices, onChange, emptyLabel }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {devices.length === 0 ? (
          <option value="">{emptyLabel}</option>
        ) : (
          devices.map((device, index) => (
            <option key={device.deviceId || index} value={device.deviceId}>
              {device.label || `${label} ${index + 1}`}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function StatusPill({ status }) {
  return (
    <div className={`status-pill ${status.tone}`}>
      <span />
      {status.text}
    </div>
  );
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 128 128" aria-hidden="true">
      <rect className="brand-tile" x="14" y="14" width="100" height="100" rx="23" />
      <g className="brand-lines" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="38" y="42" width="52" height="34" rx="7" />
        <path d="M58 76h12v12h10M48 90h32" />
        <path d="M34 33c18-14 42-14 60 0" />
        <path d="M94 48c9 12 9 28 0 40" />
        <path d="M34 48c-9 12-9 28 0 40" />
        <path d="M46 100c12 6 24 6 36 0" />
      </g>
      <g className="brand-accent" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 67l6 6l13-15" />
      </g>
    </svg>
  );
}

function useMediaDevices() {
  const [inputs, setInputs] = useState({ audio: [], video: [], output: [] });

  const refresh = async () => {
    const [audio, video, output] = await Promise.all([
      listDevices("audioinput"),
      listDevices("videoinput"),
      listDevices("audiooutput"),
    ]);
    setInputs({
      audio: uniqueDevices(audio),
      video: uniqueDevices(video),
      output: uniqueDevices(output),
    });
  };

  useEffect(() => {
    refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refresh);
  }, []);

  return { ...inputs, refresh };
}

const CONTROL_TEXT = {
  en: {
    mic: {
      inputDevice: "Input device",
      emptyInput: "Allow access to see microphones",
      inputLevel: "Input level",
      hint: "Speak into your selected microphone. The meter should move with your voice.",
      retest: "Retest microphone",
      record: "Record",
      stopRecording: "Stop recording",
      recording: "Recording",
      playback: "Recording playback",
      ready: "Ready",
      notRecorded: "Not recorded",
      singlePress: "Single press",
      status: {
        waiting: "Waiting for microphone access",
        requesting: "Requesting microphone permission",
        live: "Microphone is live",
        denied: "Permission denied",
        unavailable: "Microphone unavailable",
      },
    },
    audio: {
      outputDevice: "Output device",
      emptyOutput: "Output selection may be hidden by this browser",
      leftRight: "Left-right",
      stereo: "Play stereo sound",
      music: "Play music",
      playingSound: "Playing sound",
      readySound: "Ready to play a test sound",
      stop: "Stop",
      playSound: "Play sound",
      leftSpeaker: "Left speaker",
      rightSpeaker: "Right speaker",
      pauseMusic: "Pause music",
      uploadFile: "Upload file to enable",
      hint: "Some browsers only expose speaker selection after camera or microphone permission is granted.",
    },
  },
  es: {
    mic: {
      inputDevice: "Dispositivo de entrada",
      emptyInput: "Permite el acceso para ver micrófonos",
      inputLevel: "Nivel de entrada",
      hint: "Habla en el micrófono seleccionado. El medidor debería moverse con tu voz.",
      retest: "Probar micrófono otra vez",
      record: "Grabar",
      stopRecording: "Detener grabación",
      recording: "Grabando",
      playback: "Reproducción de grabación",
      ready: "Listo",
      notRecorded: "Sin grabación",
      singlePress: "Pulsación única",
      status: {
        waiting: "Esperando acceso al micrófono",
        requesting: "Solicitando permiso del micrófono",
        live: "Micrófono activo",
        denied: "Permiso denegado",
        unavailable: "Micrófono no disponible",
      },
    },
    audio: {
      outputDevice: "Dispositivo de salida",
      emptyOutput: "Este navegador puede ocultar la salida",
      leftRight: "Izquierda-derecha",
      stereo: "Reproducir sonido estéreo",
      music: "Reproducir música",
      playingSound: "Reproduciendo sonido",
      readySound: "Listo para reproducir un sonido de prueba",
      stop: "Detener",
      playSound: "Reproducir sonido",
      leftSpeaker: "Altavoz izquierdo",
      rightSpeaker: "Altavoz derecho",
      pauseMusic: "Pausar música",
      uploadFile: "Sube un archivo para activar",
      hint: "Algunos navegadores solo muestran la selección de altavoces después de conceder permiso de cámara o micrófono.",
      tracks: {
        balance: {
          title: "Balance",
          description: "Sirve para juzgar el equilibrio general con una mezcla de sonidos amplia.",
          detail: "El bajo, las voces, las cuerdas y otros instrumentos ayudan a confirmar que nada domina demasiado.",
        },
        "bass-balance": {
          title: "Equilibrio de bajos",
          description: "Comprueba si el subgrave se mantiene profundo sin tapar el resto de la mezcla.",
          detail: "Úsalo para detectar bajos débiles, resonancias o una respuesta grave poco uniforme.",
        },
        "vocal-clarity": {
          title: "Claridad vocal",
          description: "Usa rangos vocales para revisar presencia, calidez e inteligibilidad.",
          detail: "Las voces deberían sonar claras, sin quedar apagadas, nasales o demasiado brillantes.",
        },
        "instrument-separation": {
          title: "Separación instrumental",
          description: "Prueba si las capas de instrumentos se mantienen separadas y fáciles de distinguir.",
          detail: "El objetivo es escuchar cada capa sin que la mezcla se vuelva confusa.",
        },
        soundstage: {
          title: "Escenario sonoro",
          description: "Prueba la anchura, profundidad y sensación de espacio alrededor de los sonidos.",
          detail: "El audio binaural debería sentirse abierto y ubicado alrededor de ti, no pegado al centro.",
        },
      },
    },
  },
};

function MicTest({ audioDevices, refreshDevices, labels = CONTROL_TEXT.en.mic, title = "Microphone Test" }) {
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState({ key: "waiting", tone: "neutral" });
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const audioContextRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordStopRef = useRef(null);

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(recordTimerRef.current);
    clearTimeout(recordStopRef.current);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const start = async (deviceId = selected) => {
    stop();
    try {
      setStatus({ key: "requesting", tone: "working" });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      await refreshDevices();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        const rms = Math.sqrt(
          data.reduce((sum, sample) => sum + Math.pow((sample - 128) / 128, 2), 0) / data.length
        );
        const nextLevel = Math.min(100, Math.round(rms * 180));
        setLevel(nextLevel);
        setPeak((current) => Math.max(current * 0.96, nextLevel));
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
      setStatus({ key: "live", tone: "ok" });
      return stream;
    } catch (error) {
      setStatus({ key: error.name === "NotAllowedError" ? "denied" : "unavailable", tone: "bad" });
      return null;
    }
  };

  const startRecording = async () => {
    const stream = streamRef.current || (await start());
    if (!stream || !window.MediaRecorder) return;

    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    setPlaybackUrl("");
    chunksRef.current = [];
    setRecordSeconds(0);
    setRecording(true);

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setPlaybackUrl(URL.createObjectURL(blob));
      setRecording(false);
      clearInterval(recordTimerRef.current);
      clearTimeout(recordStopRef.current);
    };

    recorder.start();
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((seconds) => seconds + 1);
    }, 1000);
    recordStopRef.current = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 7000);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  useEffect(() => {
    start();
    return () => {
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
      stop();
    };
  }, []);

  useEffect(() => {
    if (!selected && audioDevices[0]?.deviceId) setSelected(audioDevices[0].deviceId);
  }, [audioDevices, selected]);

  return (
    <Panel title={title} icon={Mic} status={{ text: labels.status[status.key], tone: status.tone }}>
      <DeviceSelect
        label={labels.inputDevice}
        devices={audioDevices}
        value={selected}
        onChange={(id) => {
          setSelected(id);
          start(id);
        }}
        emptyLabel={labels.emptyInput}
      />
      <div className="meter-card">
        <div className="meter-label">
          <span>{labels.inputLevel}</span>
          <strong>{level}%</strong>
        </div>
        <div className="meter">
          <div style={{ width: `${level}%` }} />
          <i style={{ left: `${peak}%` }} />
        </div>
      </div>
      <p className="hint">{labels.hint}</p>
      <div className="mic-actions">
        <button className="primary" onClick={() => start()}>
          <RefreshCw size={18} /> {labels.retest}
        </button>
        <button className="record-button" onClick={recording ? stopRecording : startRecording}>
          {recording ? <Square size={18} /> : <Mic size={18} />}
          {recording ? labels.stopRecording : labels.record}
        </button>
      </div>
      <div className="record-card">
        <div className="meter-label">
          <span className={recording ? "recording-label active" : "recording-label"}>
            {recording && <i />}
            {recording ? labels.recording : labels.playback}
          </span>
          <strong>{playbackUrl ? labels.ready : recording ? labels.recording : labels.notRecorded}</strong>
        </div>
        {recording && (
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, index) => (
              <span
                key={index}
                style={{
                  height: `${8 + Math.max(0, level) * (0.28 + ((index % 7) / 18))}px`,
                }}
              />
            ))}
          </div>
        )}
        {playbackUrl && <audio controls src={playbackUrl} />}
      </div>
    </Panel>
  );
}

function writeString(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function createStereoWavUrl({ channel = "both", mode = "leftRight" }) {
  const sampleRate = 44100;
  const duration = mode === "music" ? 120 : mode === "stereo" ? 1.8 : 1.1;
  const samples = Math.floor(sampleRate * duration);
  const channels = 2;
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples * channels * bytesPerSample);
  const view = new DataView(buffer);
  const dataSize = samples * channels * bytesPerSample;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const melody = [392, 494, 587, 659, 587, 494, 440, 392];
  let offset = 44;

  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.min(1, index / 1200, (samples - index) / 2400);
    let tone = Math.sin(2 * Math.PI * 440 * time);
    let leftGain = channel === "right" ? 0 : 0.85;
    let rightGain = channel === "left" ? 0 : 0.85;

    if (mode === "music") {
      const note = melody[Math.floor(time / 0.4) % melody.length];
      tone =
        Math.sin(2 * Math.PI * note * time) * 0.58 +
        Math.sin(2 * Math.PI * note * 1.5 * time) * 0.22 +
        Math.sin(2 * Math.PI * 196 * time) * 0.2;
      leftGain = 0.75 + Math.sin(time * Math.PI * 2) * 0.1;
      rightGain = 0.75 - Math.sin(time * Math.PI * 2) * 0.1;
    }

    if (mode === "stereo") {
      tone = Math.sin(2 * Math.PI * 520 * time);
      leftGain = Math.sin(time * Math.PI * 2) > 0 ? 0.9 : 0.05;
      rightGain = leftGain > 0.5 ? 0.05 : 0.9;
    }

    if (channel === "left") {
      const pulse = Math.sin(time * Math.PI * 5) > -0.25 ? 1 : 0.15;
      tone = Math.sin(2 * Math.PI * 330 * time) * pulse;
      leftGain = 0.95;
      rightGain = 0;
    }

    if (channel === "right") {
      const pulse = Math.sin(time * Math.PI * 8) > 0.2 ? 1 : 0.12;
      tone = Math.sin(2 * Math.PI * 660 * time) * pulse;
      leftGain = 0;
      rightGain = 0.95;
    }

    const left = Math.max(-1, Math.min(1, tone * leftGain * envelope * 0.46));
    const right = Math.max(-1, Math.min(1, tone * rightGain * envelope * 0.46));
    view.setInt16(offset, left * 32767, true);
    view.setInt16(offset + 2, right * 32767, true);
    offset += 4;
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function LeftRightArt({ playing }) {
  return (
    <div className="headphone-pair" aria-label="Headphones">
      <button className={playing === "left" ? "headphone-side active flipped" : "headphone-side flipped"} type="button" aria-label="Left headphone" />
      <button className={playing === "right" ? "headphone-side active" : "headphone-side"} type="button" aria-label="Right headphone" />
    </div>
  );
}

function StereoArt({ playing }) {
  return (
    <div className={playing === "stereo" ? "stereo-visual active" : "stereo-visual"}>
      <div className="speaker-tower">
        <span />
        <i />
      </div>
      <div className="wave-stack">
        <b />
        <b />
        <b />
        <b />
        <b />
      </div>
      <div className="speaker-tower right">
        <span />
        <i />
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function MusicArt({ duration, elapsed, labels, onPlay, onSeek, onSelectTrack, playing, selectedTrack }) {
  const effectiveDuration = duration || selectedTrack.fallbackDuration || 0;
  const progress = effectiveDuration ? Math.min(100, (elapsed / effectiveDuration) * 100) : 0;
  const canPlay = Boolean(selectedTrack.src);
  const localizedTrack = labels.tracks?.[selectedTrack.id] || {};
  const selectedTitle = localizedTrack.title || selectedTrack.title;
  const selectedDescription = localizedTrack.description || selectedTrack.description;
  const selectedDetail = localizedTrack.detail || selectedTrack.detail;

  return (
    <div className={playing === "music" ? "music-card active" : "music-card"}>
      <div className="music-options">
        {MUSIC_TRACKS.map((track) => {
          const trackTitle = labels.tracks?.[track.id]?.title || track.title;
          return (
            <button
              className={selectedTrack.id === track.id ? "active" : ""}
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              type="button"
            >
              {trackTitle}
            </button>
          );
        })}
      </div>
      <h3>{selectedTitle}</h3>
      <div className="music-meta">
        <div className="album-art">
          {selectedTrack.cover ? <img alt="" src={selectedTrack.cover} /> : <span />}
        </div>
        <div>
          <strong>{selectedTrack.artist}</strong>
          <span>{selectedTrack.album}</span>
        </div>
      </div>
      <div>
        <p>{selectedDescription}</p>
        <p>{selectedDetail}</p>
      </div>
      <div className="music-controls">
        <button
          aria-label={playing === "music" ? labels.pauseMusic : labels.music}
          className={playing === "music" ? "speaker-button music-play side-playing" : "speaker-button music-play"}
          disabled={!canPlay}
          onClick={onPlay}
        >
          {playing === "music" ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="music-progress" data-progress-bar disabled={!canPlay} onClick={onSeek} type="button">
          <i style={{ width: `${progress}%` }} />
          <span>{canPlay ? `${formatTime(elapsed)}${effectiveDuration ? ` / ${formatTime(effectiveDuration)}` : ""}` : labels.uploadFile}</span>
        </button>
      </div>
    </div>
  );
}

function HeadphoneGlyph({ side }) {
  return (
    <span className="speaker-glyph">
      <svg width="1em" height="1em" viewBox="0 0 32 32" aria-hidden="true" className={side === "right" ? "right" : ""}>
        <g fill="currentColor">
          <path d="M5.46 24.578c1.176 2.988 2.14 4.908 2.313 5.156.284.408.87.657 1.339.557.391-.09.771-.223 1.134-.395a5.754 5.754 0 001.033-.612c.38-.292.577-.884.466-1.348-.063-.285-.87-2.178-1.996-5.04-1.126-2.863-1.817-4.802-1.965-5.053-.235-.415-.781-.714-1.258-.671-.399.043-.793.129-1.174.254-.384.12-.753.282-1.102.482-.411.245-.672.826-.603 1.318.044.298.643 2.361 1.814 5.352zm22.894-5.352c.069-.492-.192-1.073-.603-1.318a5.61 5.61 0 00-1.1-.482 5.794 5.794 0 00-1.175-.254c-.476-.043-1.022.256-1.257.671-.149.25-.843 2.188-1.965 5.053-1.122 2.865-1.935 4.755-1.997 5.041-.11.464.087 1.056.466 1.348.322.24.669.445 1.033.613.363.171.744.303 1.135.394.468.1 1.054-.148 1.338-.556.17-.25 1.135-2.17 2.313-5.157 1.178-2.988 1.77-5.055 1.812-5.353z" />
          <path d="M31.375 18.956v-1.91A1.188 1.188 0 0032 16 16 16 0 004.687 4.687 15.898 15.898 0 000 16a1.188 1.188 0 00.625 1.046v1.91a1.5 1.5 0 00-.563 1.633 60.941 60.941 0 004.156 10.587 1.5 1.5 0 102.678-1.353 57.909 57.909 0 01-3.95-10.062 1.5 1.5 0 00-1.193-1.063v-1.651A1.188 1.188 0 002.375 16a13.625 13.625 0 0123.26-9.634A13.538 13.538 0 0129.626 16a1.188 1.188 0 00.625 1.046v1.648a1.5 1.5 0 00-1.192 1.062 57.92 57.92 0 01-3.95 10.063 1.499 1.499 0 002.317 1.814c.15-.129.272-.285.36-.461a60.989 60.989 0 004.156-10.588 1.5 1.5 0 00-.566-1.628z" />
        </g>
      </svg>
    </span>
  );
}

function AudioTest({ labels = CONTROL_TEXT.en.audio, outputDevices, title = "Audio Output Test" }) {
  const [selected, setSelected] = useState("");
  const [activeAudioView, setActiveAudioView] = useState("leftRight");
  const [playing, setPlaying] = useState("");
  const [musicElapsed, setMusicElapsed] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [selectedMusicId, setSelectedMusicId] = useState("balance");
  const currentAudioRef = useRef(null);
  const currentAudioUrlRef = useRef("");
  const currentAudioModeRef = useRef("");
  const progressTimerRef = useRef(null);
  const selectedMusic = MUSIC_TRACKS.find((track) => track.id === selectedMusicId) || MUSIC_TRACKS[0];

  const cleanupAudio = ({ keepPausedMusic = false } = {}) => {
    currentAudioRef.current?.pause();
    clearInterval(progressTimerRef.current);
    if (!keepPausedMusic) {
      if (currentAudioUrlRef.current) URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioRef.current = null;
      currentAudioUrlRef.current = "";
      currentAudioModeRef.current = "";
    }
    setPlaying("");
  };

  const playGenerated = async (channel, mode = "leftRight", playingKey = channel) => {
    cleanupAudio();
    const url = createStereoWavUrl({ channel, mode });
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    currentAudioUrlRef.current = url;
    currentAudioModeRef.current = mode;
    audio.volume = 1;
    setPlaying(playingKey);

    if (selected && audio.setSinkId) await audio.setSinkId(selected);

    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    }).finally(() => {
      if (currentAudioUrlRef.current === url) URL.revokeObjectURL(url);
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
        currentAudioUrlRef.current = "";
        currentAudioModeRef.current = "";
        setPlaying("");
      }
    });
  };

  const toggleMusic = async () => {
    setActiveAudioView("music");
    if (!selectedMusic.src) return;

    if (playing === "music" && currentAudioModeRef.current === "music") {
      cleanupAudio({ keepPausedMusic: true });
      return;
    }

    let audio = currentAudioRef.current;
    if (!audio || currentAudioModeRef.current !== "music") {
      cleanupAudio();
      setMusicElapsed(0);
      audio = new Audio(selectedMusic.src);
      audio.volume = 1;
      currentAudioRef.current = audio;
      currentAudioUrlRef.current = "";
      currentAudioModeRef.current = "music";
      if (selected && audio.setSinkId) await audio.setSinkId(selected);
      audio.onloadedmetadata = () => {
        setMusicDuration(audio.duration || selectedMusic.fallbackDuration || 0);
      };
      audio.onended = () => {
        clearInterval(progressTimerRef.current);
        setMusicElapsed(audio.duration || selectedMusic.fallbackDuration || musicDuration || 0);
        cleanupAudio();
      };
    }

    setPlaying("music");
    progressTimerRef.current = setInterval(() => {
      setMusicDuration(audio.duration || selectedMusic.fallbackDuration || 0);
      setMusicElapsed(audio.currentTime || 0);
    }, 250);
    await audio.play();
  };

  const seekMusic = (event) => {
    if (currentAudioModeRef.current !== "music" || !currentAudioRef.current) return;
    const target = event.currentTarget.closest("[data-progress-bar]") || event.currentTarget;
    const bounds = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const nextTime = ratio * (currentAudioRef.current.duration || musicDuration || selectedMusic.fallbackDuration || 0);
    currentAudioRef.current.currentTime = nextTime;
    setMusicElapsed(nextTime);
  };

  const selectMusicTrack = (trackId) => {
    cleanupAudio();
    const nextTrack = MUSIC_TRACKS.find((track) => track.id === trackId) || MUSIC_TRACKS[0];
    setSelectedMusicId(trackId);
    setMusicElapsed(0);
    setMusicDuration(nextTrack.fallbackDuration || 0);
    if (nextTrack.src) {
      const audio = new Audio(nextTrack.src);
      audio.onloadedmetadata = () => setMusicDuration(audio.duration || nextTrack.fallbackDuration || 0);
    }
  };

  const autoPlay = async () => {
    setActiveAudioView("leftRight");
    await playGenerated("left", "leftRight", "left");
    await playGenerated("right", "leftRight", "right");
  };

  const playStereo = async () => {
    setActiveAudioView("stereo");
    await playGenerated("both", "stereo", "stereo");
  };

  const playMusic = async () => {
    cleanupAudio({ keepPausedMusic: currentAudioModeRef.current === "music" });
    setActiveAudioView("music");
  };

  const playSide = async (side) => {
    if (playing === side) {
      cleanupAudio();
      return;
    }
    setActiveAudioView("leftRight");
    await playGenerated(side, "leftRight", side);
  };

  useEffect(() => {
    if (!selected && outputDevices[0]?.deviceId) setSelected(outputDevices[0].deviceId);
  }, [outputDevices, selected]);

  return (
    <Panel title={title} icon={Headphones} status={{ text: playing ? labels.playingSound : labels.readySound, tone: playing ? "working" : "neutral" }}>
      <DeviceSelect
        label={labels.outputDevice}
        devices={outputDevices}
        value={selected}
        onChange={setSelected}
        emptyLabel={labels.emptyOutput}
      />
      <div className="audio-mode-actions">
        <button className={activeAudioView === "leftRight" ? "audio-mode active" : "audio-mode"} onClick={autoPlay}>
          {labels.leftRight}
        </button>
        <button className={activeAudioView === "stereo" ? "audio-mode active" : "audio-mode"} onClick={playStereo}>
          {labels.stereo}
        </button>
        <button className={activeAudioView === "music" ? "audio-mode active" : "audio-mode"} onClick={playMusic}>
          {labels.music}
        </button>
      </div>
      <div className="audio-stage">
        {activeAudioView === "leftRight" && (
          <>
            <div className="headphone-scene">
              <LeftRightArt playing={playing} />
            </div>
            <div className="speaker-actions">
              <button className={playing === "left" ? "speaker-button side-playing" : "speaker-button"} onClick={() => playSide("left")}>
                <HeadphoneGlyph side="left" />
                <span>{playing === "left" ? labels.stop : labels.playSound}</span>
                <small>{labels.leftSpeaker}</small>
              </button>
              <button className={playing === "right" ? "speaker-button side-playing" : "speaker-button"} onClick={() => playSide("right")}>
                <span>{playing === "right" ? labels.stop : labels.playSound}</span>
                <small>{labels.rightSpeaker}</small>
                <HeadphoneGlyph side="right" />
              </button>
            </div>
          </>
        )}
        {activeAudioView === "stereo" && <StereoArt playing={playing} />}
        {activeAudioView === "music" && (
          <MusicArt
            duration={musicDuration}
            elapsed={musicElapsed}
            onSelectTrack={selectMusicTrack}
            onPlay={toggleMusic}
            onSeek={seekMusic}
            labels={labels}
            playing={playing}
            selectedTrack={selectedMusic}
          />
        )}
      </div>
      <p className="hint">{labels.hint}</p>
    </Panel>
  );
}

function WebcamTest({ videoDevices, refreshDevices, title = "Webcam Test" }) {
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState({ text: "Waiting for camera access", tone: "neutral" });
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const start = async (deviceId = selected) => {
    stop();
    try {
      setStatus({ text: "Requesting camera permission", tone: "working" });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      await refreshDevices();
      setStatus({ text: "Camera preview is live", tone: "ok" });
    } catch (error) {
      setStatus({ text: error.name === "NotAllowedError" ? "Permission denied" : "Camera unavailable", tone: "bad" });
    }
  };

  useEffect(() => {
    start();
    return stop;
  }, []);

  useEffect(() => {
    if (!selected && videoDevices[0]?.deviceId) setSelected(videoDevices[0].deviceId);
  }, [videoDevices, selected]);

  return (
    <Panel title={title} icon={Camera} status={status}>
      <DeviceSelect
        label="Camera"
        devices={videoDevices}
        value={selected}
        onChange={(id) => {
          setSelected(id);
          start(id);
        }}
        emptyLabel="Allow access to see cameras"
      />
      <div className="video-frame">
        <video ref={videoRef} autoPlay muted playsInline />
      </div>
      <button className="primary" onClick={() => start()}>
        <RefreshCw size={18} /> Restart preview
      </button>
    </Panel>
  );
}

function isButtonPressed(pad, index) {
  return Boolean(pad.buttons[index]?.pressed || pad.buttons[index]?.value > 0.55);
}

function axisValue(pad, index) {
  return Number(pad.axes[index] || 0);
}

function stickOffset(value) {
  return Math.max(-1, Math.min(1, value)) * 28;
}

function gamepadIdentity(pad) {
  const vendorProduct = pad.id.match(/Vendor:\s*([0-9a-f]+)\s*Product:\s*([0-9a-f]+)/i);
  if (vendorProduct) return `${vendorProduct[1].toLowerCase()}:${vendorProduct[2].toLowerCase()}`;
  return pad.id.replace(/\s+/g, " ").trim().toLowerCase();
}

function uniqueGamepads(pads) {
  const byIdentity = new Map();

  pads.forEach((pad) => {
    const key = gamepadIdentity(pad);
    const current = byIdentity.get(key);
    if (!current || pad.buttons.length > current.buttons.length || /rev\./i.test(pad.id)) {
      byIdentity.set(key, pad);
    }
  });

  return [...byIdentity.values()];
}

function GamepadDiagram({ pad }) {
  const leftX = axisValue(pad, 0);
  const leftY = axisValue(pad, 1);
  const rightX = axisValue(pad, 2);
  const rightY = axisValue(pad, 3);

  return (
    <svg className="gamepad-art" viewBox="70 40 540 360" aria-label={`${pad.id} controller diagram`}>
      <path
        className="gamepad-body"
        d="M164 120 C220 76 460 76 516 120 C559 154 610 292 574 360 C552 402 497 402 462 360 L420 311 C404 292 386 287 340 287 C294 287 276 292 260 311 L218 360 C183 402 128 402 106 360 C70 292 121 154 164 120 Z"
      />
      <path className={isButtonPressed(pad, 6) ? "gamepad-trigger active" : "gamepad-trigger"} d="M224 66 h48 a13 13 0 0 1 13 13 v31 h-74 V79 a13 13 0 0 1 13-13 Z" />
      <path className={isButtonPressed(pad, 7) ? "gamepad-trigger active" : "gamepad-trigger"} d="M408 66 h48 a13 13 0 0 1 13 13 v31 h-74 V79 a13 13 0 0 1 13-13 Z" />
      <rect className={isButtonPressed(pad, 4) ? "gamepad-shoulder active" : "gamepad-shoulder"} x="204" y="113" width="92" height="22" rx="11" />
      <rect className={isButtonPressed(pad, 5) ? "gamepad-shoulder active" : "gamepad-shoulder"} x="384" y="113" width="92" height="22" rx="11" />

      <g className={isButtonPressed(pad, 10) ? "stick active" : "stick"}>
        <circle cx="218" cy="202" r="43" />
        <circle cx={218 + stickOffset(leftX)} cy={202 + stickOffset(leftY)} r="24" />
      </g>
      <g className={isButtonPressed(pad, 11) ? "stick active" : "stick"}>
        <circle cx="400" cy="280" r="43" />
        <circle cx={400 + stickOffset(rightX)} cy={280 + stickOffset(rightY)} r="24" />
      </g>

      <circle className={isButtonPressed(pad, 8) ? "gamepad-small active" : "gamepad-small"} cx="300" cy="205" r="13" />
      <circle className={isButtonPressed(pad, 9) ? "gamepad-small active" : "gamepad-small"} cx="380" cy="205" r="13" />
      <circle className={isButtonPressed(pad, 16) ? "gamepad-home active" : "gamepad-home"} cx="340" cy="240" r="14" />

      <g className="dpad">
        <path className={isButtonPressed(pad, 12) ? "active" : ""} d="M292 225 l16 16 l-14 14 l-16-16 Z" />
        <path className={isButtonPressed(pad, 13) ? "active" : ""} d="M292 281 l16-16 l-14-14 l-16 16 Z" />
        <path className={isButtonPressed(pad, 14) ? "active" : ""} d="M264 253 l16-16 l14 14 l-16 16 Z" />
        <path className={isButtonPressed(pad, 15) ? "active" : ""} d="M320 253 l-16-16 l-14 14 l16 16 Z" />
      </g>

      <g className="face-buttons">
        <circle className={isButtonPressed(pad, 3) ? "active" : ""} cx="480" cy="166" r="18" />
        <circle className={isButtonPressed(pad, 1) ? "active" : ""} cx="522" cy="208" r="18" />
        <circle className={isButtonPressed(pad, 0) ? "active" : ""} cx="480" cy="250" r="18" />
        <circle className={isButtonPressed(pad, 2) ? "active" : ""} cx="438" cy="208" r="18" />
        <text x="480" y="171">Y</text>
        <text x="522" y="213">B</text>
        <text x="480" y="255">A</text>
        <text x="438" y="213">X</text>
      </g>
    </svg>
  );
}

function AxisReadout({ pad }) {
  const axisPairs = [
    ["L stick", 0, 1],
    ["R stick", 2, 3],
  ];

  return (
    <div className="stick-readouts">
      {axisPairs.map(([label, xIndex, yIndex]) => (
        <div className="stick-readout" key={label}>
          <span>{label}</span>
          <strong>
            X {axisValue(pad, xIndex).toFixed(3)} - Y {axisValue(pad, yIndex).toFixed(3)}
          </strong>
          <i>
            <b style={{ transform: `translate(${stickOffset(axisValue(pad, xIndex))}px, ${stickOffset(axisValue(pad, yIndex))}px)` }} />
          </i>
        </div>
      ))}
    </div>
  );
}

function RawButtonReadout({ pad }) {
  return (
    <div className="button-grid compact">
      {pad.buttons.map((button, index) => (
        <span key={index} className={button.pressed ? "pressed" : ""}>
          B{index}
          <small>{button.value.toFixed(2)}</small>
        </span>
      ))}
    </div>
  );
}

function getGamepadByIndex(index) {
  return navigator.getGamepads?.()[index] || null;
}

async function pulseGamepad(index, duration = 1000) {
  const pad = getGamepadByIndex(index);
  const actuator = pad?.vibrationActuator || pad?.hapticActuators?.[0];

  if (actuator?.playEffect) {
    await actuator.playEffect("dual-rumble", {
      duration,
      strongMagnitude: 1,
      weakMagnitude: 0.65,
    });
    return true;
  }

  if (actuator?.pulse) {
    await actuator.pulse(1, duration);
    return true;
  }

  return false;
}

function GamepadTest({ title = "Gamepad Test" }) {
  const [pads, setPads] = useState([]);
  const [rumbling, setRumbling] = useState(null);
  const rumbleTimerRef = useRef(null);

  useEffect(() => {
    const poll = () => {
      const next = navigator.getGamepads ? uniqueGamepads([...navigator.getGamepads()].filter(Boolean)) : [];
      setPads(next);
      requestAnimationFrame(poll);
    };
    poll();
  }, []);

  useEffect(() => () => clearInterval(rumbleTimerRef.current), []);

  const vibrateOnce = async (index) => {
    await pulseGamepad(index, 1000);
  };

  const toggleInfiniteVibration = async (index) => {
    clearInterval(rumbleTimerRef.current);
    if (rumbling === index) {
      setRumbling(null);
      return;
    }

    setRumbling(index);
    await pulseGamepad(index, 900);
    rumbleTimerRef.current = setInterval(() => {
      pulseGamepad(index, 900);
    }, 1000);
  };

  return (
    <Panel title={title} icon={Gamepad2} status={{ text: pads.length ? `${pads.length} controller detected` : "Press a controller button", tone: pads.length ? "ok" : "neutral" }}>
      {pads.length === 0 ? (
        <div className="empty-state">
          <Gamepad2 size={44} />
          <p>Connect a controller, then press any button so the browser can detect it.</p>
        </div>
      ) : (
        pads.map((pad) => (
          <div className="gamepad-card" key={pad.index}>
            <div>
              <strong>{pad.id}</strong>
              <span>{pad.buttons.length} buttons · {pad.axes.length} axes</span>
            </div>
            <div className="gamepad-live">
              <div>
                <div className="gamepad-stats">
                  <span>Connected</span>
                  <strong>Yes</strong>
                  <span>Timestamp</span>
                  <strong>{Math.round(pad.timestamp || 0)}</strong>
                  <span>Vibration</span>
                  <strong>{pad.vibrationActuator || pad.hapticActuators?.length ? "Yes" : "No"}</strong>
                </div>
                <AxisReadout pad={pad} />
                <div className="gamepad-actions">
                  <button type="button" onClick={() => vibrateOnce(pad.index)}>
                    Vibration, 1 sec
                  </button>
                  <button className={rumbling === pad.index ? "active" : ""} type="button" onClick={() => toggleInfiniteVibration(pad.index)}>
                    {rumbling === pad.index ? "Stop vibration" : "Vibration, infinite"}
                  </button>
                </div>
              </div>
              <GamepadDiagram pad={pad} />
            </div>
          </div>
        ))
      )}
    </Panel>
  );
}

const KEY_SECTIONS = {
  main: [
    ["Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
    ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace"],
    ["Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"],
    ["CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter"],
    ["ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight"],
    ["ControlLeft", "MetaLeft", "AltLeft", "Space", "AltRight", "MetaRight", "ContextMenu", "ControlRight"],
  ],
  nav: [
    ["PrintScreen", "ScrollLock", "Pause"],
    ["Insert", "Home", "PageUp"],
    ["Delete", "End", "PageDown"],
    ["", "ArrowUp", ""],
    ["ArrowLeft", "ArrowDown", "ArrowRight"],
  ],
  numpad: [
    ["NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract"],
    ["Numpad7", "Numpad8", "Numpad9", "NumpadAdd"],
    ["Numpad4", "Numpad5", "Numpad6", "NumpadAdd"],
    ["Numpad1", "Numpad2", "Numpad3", "NumpadEnter"],
    ["Numpad0", "Numpad0", "NumpadDecimal", "NumpadEnter"],
  ],
};

function keyLabel(code) {
  const labels = {
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    Backquote: "`",
    Backslash: "\\",
    BracketLeft: "[",
    BracketRight: "]",
    Comma: ",",
    ContextMenu: "Menu",
    Delete: "Del",
    Equal: "=",
    Insert: "Ins",
    MetaLeft: "Win",
    MetaRight: "Win",
    Minus: "-",
    NumpadAdd: "+",
    NumpadDecimal: ".",
    NumpadDivide: "/",
    NumpadMultiply: "*",
    NumpadSubtract: "-",
    PageDown: "PgDn",
    PageUp: "PgUp",
    Pause: "Paus",
    Period: ".",
    PrintScreen: "Prt",
    Quote: "'",
    ScrollLock: "ScrLk",
    Semicolon: ";",
    Slash: "/",
  };
  if (labels[code]) return labels[code];
  return code
    .replace("Numpad", "")
    .replace("Key", "")
    .replace("Digit", "")
    .replace("Left", "")
    .replace("Right", "")
    .replace("Control", "Ctrl")
    .replace("Escape", "Esc")
    .replace("Backspace", "Back")
    .replace("CapsLock", "Caps")
    .replace("Space", "Space");
}

function keyWidth(code) {
  const widths = {
    Backspace: 78,
    Backslash: 54,
    CapsLock: 62,
    ContextMenu: 54,
    ControlLeft: 50,
    ControlRight: 50,
    Delete: 52,
    End: 52,
    Enter: 76,
    Home: 58,
    Insert: 52,
    Numpad0: 94,
    NumpadEnter: 58,
    NumLock: 78,
    PageDown: 58,
    PageUp: 58,
    Pause: 52,
    PrintScreen: 52,
    ScrollLock: 58,
    ShiftLeft: 78,
    ShiftRight: 78,
    Space: 220,
    Tab: 58,
    ArrowDown: 58,
    ArrowLeft: 58,
    ArrowRight: 58,
  };
  return widths[code] || 42;
}

function renderKey(code, pressed, key, extraClass = "") {
  if (!code) return <span className="key empty" key={key} style={{ "--key-width": `${keyWidth(code)}px` }} />;

  return (
    <span
      className={`${pressed.has(code) ? "key active" : "key"} ${extraClass}`.trim()}
      key={key}
      style={{ "--key-width": `${keyWidth(code)}px` }}
    >
      {keyLabel(code)}
    </span>
  );
}

function KeyboardTest({ title = "Keyboard Test" }) {
  const [pressed, setPressed] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKeyDown = (event) => {
    event.preventDefault();
    setPressed((current) => new Set(current).add(event.code));
    setLastEvent({
      code: event.code,
      key: event.key,
      repeat: event.repeat,
      modifiers: ["shiftKey", "ctrlKey", "altKey", "metaKey"].filter((name) => event[name]),
    });
    if (!event.repeat) {
      setHistory((current) => [{ code: event.code, key: event.key }, ...current].slice(0, 10));
    }
  };

  const onKeyUp = (event) => {
    event.preventDefault();
    setPressed((current) => {
      const next = new Set(current);
      next.delete(event.code);
      return next;
    });
  };

  return (
    <Panel title={title} icon={Keyboard} status={{ text: "Ready for keys", tone: pressed.size ? "working" : "neutral" }}>
      <div
        className="keyboard-tester"
        onBlur={() => setPressed(new Set())}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        ref={inputRef}
        tabIndex={0}
      >
        <div className="keyboard-section main-keys">
          {KEY_SECTIONS.main.map((row, rowIndex) => (
            <div className="key-row" key={rowIndex}>
              {row.map((code, index) => renderKey(code, pressed, `${code}-${index}`))}
            </div>
          ))}
        </div>
        <div className="keyboard-section nav-keys">
          {KEY_SECTIONS.nav.map((row, rowIndex) => (
            <div className="key-row small" key={rowIndex}>
              {row.map((code, index) => renderKey(code, pressed, code ? `${code}-${index}` : `empty-${rowIndex}-${index}`))}
            </div>
          ))}
        </div>
        <div className="keyboard-section numpad-keys">
          {KEY_SECTIONS.numpad.map((row, rowIndex) => (
            <div className="key-row small" key={rowIndex}>
            {row.map((code, index) => {
              if (code === "Numpad0" && rowIndex === 4 && index === 1) return null;
              return renderKey(code, pressed, `${code}-${rowIndex}-${index}`, code === "Numpad0" ? "wide-key" : "");
            })}
            </div>
          ))}
        </div>
      </div>
      <div className="input-grid">
        <div className="info-card">
          <span>Last key</span>
          <strong>{lastEvent ? lastEvent.key : "--"}</strong>
          <small>{lastEvent?.repeat ? "Repeating" : lastEvent ? "Single press" : "Click the keyboard area and press a key"}</small>
        </div>
        <div className="info-card">
          <span>Modifiers</span>
          <strong>{lastEvent?.modifiers.length ? lastEvent.modifiers.map((item) => item.replace("Key", "")).join(", ") : "--"}</strong>
          <small>Shift, Ctrl, Alt, Meta</small>
        </div>
      </div>
      <p className="history-caption">Recent key history shows the latest keys detected by the browser.</p>
      <div className="history-list">
        {history.length ? history.map((item, index) => <span key={`${item.code}-${index}`}>{item.key}</span>) : <span>No key history yet</span>}
      </div>
    </Panel>
  );
}

function MouseReferenceArt({ buttons, wheelFlash }) {
  return (
    <svg className="mouse-line-art" viewBox="0 0 760 560" aria-label="Mouse test diagram">
      <g>
        <path
          className="mouse-shell"
          d="M108 348 C193 223 316 126 434 120 C539 114 629 178 658 279 C679 351 646 405 577 440 C505 476 437 518 367 535 C312 526 252 510 188 489 C158 462 134 435 118 410 C110 387 107 366 108 348 Z"
        />
        <path
          className={buttons.has(0) ? "mouse-region active" : "mouse-region"}
          d="M111 348 C176 245 269 164 354 136 C396 123 440 122 460 137 C470 145 468 156 453 165 C407 192 370 232 337 288 L246 426 C222 439 195 448 165 452 C142 436 126 421 118 410 C110 387 107 366 111 348 Z"
        />
        <path
          className={buttons.has(2) ? "mouse-region active" : "mouse-region"}
          d="M460 137 C542 141 614 197 642 279 C624 318 586 374 527 431 C490 454 452 477 413 497 C384 493 354 487 323 478 C333 392 337 321 337 288 C376 220 414 176 460 137 Z"
        />
        <path
          className={buttons.has(1) || wheelFlash ? `mouse-region wheel active ${wheelFlash}` : "mouse-region wheel"}
          d="M230 375 C230 331 264 295 302 292 C323 309 322 349 297 384 C270 421 239 415 230 375 Z"
        />
        <path className="mouse-button-line" d="M461 137 C414 174 376 220 337 288" />
        <path className="mouse-button-line" d="M314 292 C304 324 290 354 272 381" />
        <path className="mouse-line" d="M165 452 C194 467 258 488 365 533" />
        <path className="mouse-line" d="M323 478 C391 466 459 450 526 433" />
        <path className="mouse-line" d="M245 428 C263 454 292 471 323 478" />
        <path className="mouse-detail" d="M243 368 C253 332 276 309 303 304" />
        <path className="mouse-detail" d="M251 392 C274 389 291 371 303 336" />
        <path className={buttons.has(3) ? "mouse-side-region active" : "mouse-side-region"} d="M472 453 C486 415 501 382 518 354 L534 364 C520 402 504 436 486 467 C481 464 476 459 472 453 Z" />
        <path className={buttons.has(4) ? "mouse-side-region active" : "mouse-side-region"} d="M522 344 C539 303 558 270 578 240 L594 251 C578 286 559 322 537 360 Z" />
        <path className="mouse-side-button-line" d="M472 453 C486 415 501 382 518 354 L534 364 C520 402 504 436 486 467 C481 464 476 459 472 453 Z" />
        <path className="mouse-side-button-line" d="M522 344 C539 303 558 270 578 240 L594 251 C578 286 559 322 537 360 Z" />
        <path className="mouse-grip" d="M520 438 C560 421 599 397 628 367" />
        {Array.from({ length: 12 }).map((_, index) => (
          <path
            className="mouse-grip-line"
            d={`M${530 + index * 7} ${426 - index * 5} C${560 + index * 5} ${404 - index * 7} ${586 + index * 5} ${362 - index * 8}`}
            key={index}
          />
        ))}
        <path className={wheelFlash === "up" ? "mouse-scroll-arrow active" : "mouse-scroll-arrow"} d="M178 430 L226 368 L240 379 L192 441 L217 447 L154 486 L170 414 Z" />
        <path className={wheelFlash === "down" ? "mouse-scroll-arrow active" : "mouse-scroll-arrow"} d="M322 291 L284 349 L270 339 L308 280 L285 276 L346 240 L334 308 Z" />
      </g>
    </svg>
  );
}

function MouseTest({ title = "Mouse Test" }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [buttons, setButtons] = useState(new Set());
  const [wheel, setWheel] = useState("No scroll yet");
  const [wheelFlash, setWheelFlash] = useState("");
  const [dragging, setDragging] = useState(false);
  const wheelTimerRef = useRef(null);

  const updatePosition = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: Math.round(event.clientX - bounds.left),
      y: Math.round(event.clientY - bounds.top),
    });
  };

  const buttonsFromBitmask = (bitmask) => {
    const next = new Set();
    [
      [1, 0],
      [4, 1],
      [2, 2],
      [8, 3],
      [16, 4],
    ].forEach(([bit, button]) => {
      if ((bitmask & bit) === bit) next.add(button);
    });
    return next;
  };

  useEffect(() => {
    const onMouseUp = () => {
      setDragging(false);
      setButtons(new Set());
    };

    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      clearTimeout(wheelTimerRef.current);
    };
  }, []);

  const buttonName = (button) => ["Left", "Middle", "Right", "Back", "Forward"][button] || `Button ${button}`;
  const buttonSummary = [
    ...(buttons.size ? [...buttons].map(buttonName) : []),
    ...(!buttons.size && wheel !== "No scroll yet" ? [wheel] : []),
  ];
  const statusText =
    buttons.size === 1
      ? `${buttonName([...buttons][0])} pressed`
      : buttons.size > 1
        ? `${buttons.size} buttons pressed`
        : wheelFlash
          ? wheel
          : "Mouse ready";

  return (
    <Panel title={title} icon={MousePointer2} status={{ text: statusText, tone: buttons.size || wheelFlash ? "working" : "neutral" }}>
      <div
        className={dragging ? "mouse-pad dragging" : "mouse-pad"}
        onContextMenu={(event) => event.preventDefault()}
        onMouseDown={(event) => {
          event.preventDefault();
          updatePosition(event);
          setDragging(true);
          setButtons(buttonsFromBitmask(event.buttons));
        }}
        onMouseLeave={() => {
          setDragging(false);
        }}
        onMouseMove={updatePosition}
        onMouseUp={(event) => {
          event.preventDefault();
          updatePosition(event);
          setDragging(false);
          setButtons(buttonsFromBitmask(event.buttons));
        }}
        onWheel={(event) => {
          event.preventDefault();
          const direction = event.deltaY < 0 ? "Wheel up" : "Wheel down";
          setWheel(direction);
          setWheelFlash(event.deltaY < 0 ? "up" : "down");
          clearTimeout(wheelTimerRef.current);
          wheelTimerRef.current = setTimeout(() => setWheelFlash(""), 260);
        }}
      >
        <MouseReferenceArt buttons={buttons} wheelFlash={wheelFlash} />
        <span>{position.x}, {position.y}</span>
      </div>
      <div className="input-grid">
        <div className="info-card">
          <span>Buttons</span>
          <strong>{buttonSummary.length ? buttonSummary.join(", ") : "--"}</strong>
          <small>Left, middle, right, back, forward, wheel up/down</small>
        </div>
        <div className="info-card">
          <span>Wheel</span>
          <strong>{wheel}</strong>
          <small>Scroll inside the pad</small>
        </div>
      </div>
    </Panel>
  );
}

function SpeedTest({ title = "Internet Speed Test" }) {
  const [state, setState] = useState({
    download: null,
    latency: null,
    phase: "Ready",
    progress: 0,
    running: false,
    samples: 0,
    upload: null,
  });
  const speedSources = [
    {
      name: "Cloudflare",
      size: 5_000_000,
      url: () => `https://speed.cloudflare.com/__down?bytes=5000000&cachebust=${Date.now()}`,
    },
    {
      name: "Wikimedia",
      size: null,
      url: () => `https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg?cachebust=${Date.now()}`,
    },
  ];

  const timedFetch = async (url, timeout = 10000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const run = async () => {
    const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const testStarted = performance.now();
    const duration = 15_000;
    const downloadUntil = testStarted + 9_000;
    const downloadSamples = [];
    const uploadSamples = [];

    setState({ download: null, latency: null, phase: "Preparing speed test", progress: 2, running: true, samples: 0, upload: null });

    let latency = null;
    try {
      const pingStart = performance.now();
      await timedFetch(`https://speed.cloudflare.com/__down?bytes=128&cachebust=${Date.now()}`, 3500);
      latency = Math.round(performance.now() - pingStart);
    } catch {
      latency = null;
    }
    setState((current) => ({ ...current, latency, phase: "Collecting download samples", progress: 6 }));
    await pause(350);

    try {
      while (performance.now() < downloadUntil) {
        let response = null;
        let source = null;
        for (const candidate of speedSources) {
          try {
            source = candidate;
            response = await timedFetch(candidate.url(), 6500);
            if (response.ok) break;
          } catch {
            response = null;
          }
        }
        if (!response?.ok) throw new Error("Speed endpoint unavailable");

        const size = Number(response.headers.get("content-length")) || source.size || 5_000_000;
        const started = performance.now();
        let loaded = 0;
        if (response.body?.getReader) {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            loaded += value.length;
            const elapsed = performance.now() - testStarted;
            setState((current) => ({
              ...current,
              phase: `Collecting download samples (${source.name})`,
              progress: Math.min(72, (elapsed / duration) * 100),
            }));
          }
        } else {
          const buffer = await response.arrayBuffer();
          loaded = buffer.byteLength;
        }

        const seconds = Math.max(0.1, (performance.now() - started) / 1000);
        const sample = (loaded * 8) / seconds / 1_000_000;
        downloadSamples.push(sample);
        setState((current) => ({
          ...current,
          download: average(downloadSamples).toFixed(1),
          samples: downloadSamples.length + uploadSamples.length,
        }));
      }

      setState((current) => ({ ...current, phase: "Collecting upload samples", progress: 74 }));

      while (performance.now() - testStarted < duration) {
        const uploadBytes = 2_000_000;
        const uploadPayload = new Uint8Array(uploadBytes);
        crypto.getRandomValues(uploadPayload.subarray(0, 65_536));
        const uploadStarted = performance.now();
        await fetch("/speed-upload", { body: uploadPayload, method: "POST" });
        const uploadSeconds = Math.max(0.1, (performance.now() - uploadStarted) / 1000);
        uploadSamples.push((uploadBytes * 8) / uploadSeconds / 1_000_000);
        const elapsed = performance.now() - testStarted;
        setState((current) => ({
          ...current,
          phase: `Collecting upload samples (${uploadSamples.length})`,
          progress: Math.min(99, (elapsed / duration) * 100),
          samples: downloadSamples.length + uploadSamples.length,
        }));
        await pause(350);
      }

      setState({
        download: downloadSamples.length ? average(downloadSamples).toFixed(1) : null,
        latency,
        phase: "Average complete",
        progress: 100,
        running: false,
        samples: downloadSamples.length + uploadSamples.length,
        upload: uploadSamples.length ? average(uploadSamples).toFixed(1) : null,
      });
    } catch {
      setState((current) => ({ ...current, phase: "Speed test failed", progress: 0, running: false }));
    }
  };

  return (
    <Panel title={title} icon={Wifi} status={{ text: state.phase, tone: state.download ? "ok" : "neutral" }}>
      <div className="speed-grid">
        <div>
          <span>Download</span>
          <strong>{state.download ? `${state.download} Mbps` : "--"}</strong>
        </div>
        <div>
          <span>Upload</span>
          <strong>{state.upload ? `${state.upload} Mbps` : "--"}</strong>
        </div>
        <div>
          <span>Latency</span>
        <strong>{state.latency ? `${state.latency} ms` : "--"}</strong>
        </div>
      </div>
      <div className="meter speed">
        <div style={{ width: `${state.progress}%` }} />
      </div>
      <button className="primary" disabled={state.running} onClick={run}>
        <Activity size={18} /> {state.running ? "Testing speed" : "Start speed test"}
      </button>
      <p className="hint">
        {state.samples ? `${state.samples} samples collected. ` : ""}
        Reports average speed from multiple samples, so results can vary by browser, Wi-Fi, and local traffic.
      </p>
    </Panel>
  );
}

function Panel({ title, icon: Icon, status, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <Icon size={30} />
          <h1>{title}</h1>
        </div>
        <StatusPill status={status} />
      </div>
      {children}
    </section>
  );
}

const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const LANGUAGES = [
  { id: "en", label: "English", flag: "us" },
  { id: "es", label: "Español", flag: "es" },
  { id: "zh", label: "中文", flag: "zh" },
  { id: "fr", label: "Français", flag: "fr" },
  { id: "de", label: "Deutsch", flag: "de" },
  { id: "ja", label: "日本語", flag: "jp" },
  { id: "ru", label: "Русский", flag: "ru" },
  { id: "it", label: "Italiano", flag: "it" },
];

function Flag({ code }) {
  return <span className={`flag flag-${code}`} aria-hidden="true" />;
}

const COPY_TEXT = {
  en: TEST_COPY,
  es: {
    mic: {
      does: "Comprueba si el micrófono se detecta, captura sonido y graba una muestra de reproducción.",
      instructions: "Permite el acceso al micrófono, elige la entrada, habla y usa Grabar para confirmar la calidad.",
    },
    audio: {
      does: "Comprueba la salida de audio, canales izquierdo/derecho, estéreo y balance musical.",
      instructions: "Elige la salida, ejecuta la prueba izquierda-derecha y confirma que ambos canales suenan claros.",
    },
    webcam: {
      does: "Comprueba si la cámara se detecta y puede mostrar una vista previa en vivo.",
      instructions: "Permite el acceso a la cámara, elige el dispositivo y confirma que la imagen se ve bien.",
    },
    gamepad: {
      does: "Comprueba detección del mando, botones y movimiento de ejes analógicos.",
      instructions: "Conecta un mando, pulsa cualquier botón para detectarlo y prueba cada botón y palanca.",
    },
    keyboard: {
      does: "Comprueba teclas, modificadores, repetición y entrada de texto.",
      instructions: "Haz clic en el probador, pulsa teclas y confirma que cada tecla se ilumina.",
    },
    mouse: {
      does: "Comprueba botones, movimiento del puntero, rueda, doble clic y arrastre.",
      instructions: "Mueve el mouse dentro del área, haz clic en cada botón, desplaza la rueda y arrastra.",
    },
    speed: {
      does: "Mide latencia y velocidad media de descarga y subida.",
      instructions: "Cierra descargas o transmisiones pesadas, inicia la prueba y espera el promedio final.",
    },
  },
  fr: {
    mic: {
      does: "Vérifie si votre micro est détecté, capte le son et enregistre un court échantillon.",
      instructions: "Autorisez le micro, choisissez l'entrée, parlez, puis utilisez Enregistrer pour confirmer la qualité.",
    },
    audio: {
      does: "Vérifie la sortie audio, les canaux gauche/droite, la stéréo et l'équilibre musical.",
      instructions: "Choisissez la sortie, lancez le test gauche-droite, puis confirmez que les deux canaux sont clairs.",
    },
    webcam: {
      does: "Vérifie si votre caméra est détectée et peut afficher un aperçu en direct.",
      instructions: "Autorisez la caméra, choisissez l'appareil et confirmez que l'image est nette.",
    },
    gamepad: {
      does: "Vérifie la détection de la manette, les boutons et les axes analogiques.",
      instructions: "Branchez une manette, appuyez sur un bouton pour la détecter, puis testez chaque commande.",
    },
    keyboard: {
      does: "Vérifie les touches, les modificateurs, la répétition et la saisie de texte.",
      instructions: "Cliquez dans le testeur, appuyez sur les touches et vérifiez qu'elles s'allument.",
    },
    mouse: {
      does: "Vérifie les boutons, le mouvement du pointeur, la molette, le double-clic et le glisser.",
      instructions: "Déplacez la souris dans la zone, cliquez chaque bouton, faites défiler la molette et glissez.",
    },
    speed: {
      does: "Mesure la latence et les vitesses moyennes de téléchargement et d'envoi.",
      instructions: "Fermez les téléchargements ou flux lourds, lancez le test et attendez la moyenne finale.",
    },
  },
  de: {
    mic: {
      does: "Prüft, ob dein Mikrofon erkannt wird, Ton aufnimmt und eine kurze Probe erstellt.",
      instructions: "Erlaube den Mikrofonzugriff, wähle den Eingang, sprich hinein und prüfe die Aufnahme.",
    },
    audio: {
      does: "Prüft Audioausgabe, Links-Rechts-Kanäle, Stereo und Musikbalance.",
      instructions: "Wähle die Ausgabe, starte den Links-Rechts-Test und prüfe beide Kanäle.",
    },
    webcam: {
      does: "Prüft, ob deine Kamera erkannt wird und eine Live-Vorschau anzeigen kann.",
      instructions: "Erlaube den Kamerazugriff, wähle die Kamera und prüfe das Bild.",
    },
    gamepad: {
      does: "Prüft Controller-Erkennung, Tasten und analoge Achsen.",
      instructions: "Schließe einen Controller an, drücke eine Taste und teste jede Steuerung.",
    },
    keyboard: {
      does: "Prüft Tasten, Modifikatoren, Wiederholung und Texteingabe.",
      instructions: "Klicke in den Tester, drücke Tasten und prüfe, ob sie aufleuchten.",
    },
    mouse: {
      does: "Prüft Maustasten, Zeigerbewegung, Rad, Doppelklick und Ziehen.",
      instructions: "Bewege die Maus im Feld, klicke jede Taste, scrolle und ziehe.",
    },
    speed: {
      does: "Misst Latenz sowie durchschnittliche Download- und Upload-Geschwindigkeit.",
      instructions: "Schließe starke Downloads oder Streams, starte den Test und warte auf den Durchschnitt.",
    },
  },
};

const UI_TEXT = {
  en: {
    feedback: "Feedback",
    feedbackTitle: "Send Feedback",
    feedbackPlaceholder: "Tell us what is not working or what should feel better.",
    cancel: "Cancel",
    send: "Send feedback",
    sending: "Sending...",
    sent: "Saved. Thank you.",
    light: "Light",
    dark: "Dark",
    system: "System",
    counts: {
      microphones: "microphones",
      audioOutputs: "audio outputs",
      cameras: "cameras",
      gamepads: "gamepads",
      keyboardTests: "keyboard tests",
      mouseTests: "mouse tests",
      networkTests: "network tests",
    },
    tests: {
      mic: "Microphone",
      audio: "Audio",
      webcam: "Webcam",
      gamepad: "Gamepad",
      keyboard: "Keyboard",
      mouse: "Mouse",
      speed: "Speed",
    },
  },
  es: {
    feedback: "Comentarios",
    feedbackTitle: "Enviar comentarios",
    feedbackPlaceholder: "Cuéntanos qué no funciona o qué debería mejorar.",
    cancel: "Cancelar",
    send: "Enviar",
    sending: "Enviando...",
    sent: "Guardado. Gracias.",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    counts: {
      microphones: "micrófonos",
      audioOutputs: "salidas de audio",
      cameras: "cámaras",
      gamepads: "mandos",
      keyboardTests: "pruebas de teclado",
      mouseTests: "pruebas de ratón",
      networkTests: "pruebas de red",
    },
    tests: {
      mic: "Micrófono",
      audio: "Audio",
      webcam: "Cámara",
      gamepad: "Mando",
      keyboard: "Teclado",
      mouse: "Ratón",
      speed: "Velocidad",
    },
  },
  zh: {
    feedback: "反馈",
    feedbackTitle: "发送反馈",
    feedbackPlaceholder: "告诉我们哪里不好用，或哪里需要改进。",
    cancel: "取消",
    send: "发送反馈",
    sending: "发送中...",
    sent: "已保存，谢谢。",
    light: "浅色",
    dark: "深色",
    system: "系统",
    tests: {
      mic: "麦克风",
      audio: "音频",
      webcam: "摄像头",
      gamepad: "手柄",
      keyboard: "键盘",
      mouse: "鼠标",
      speed: "网速",
    },
  },
  fr: {
    feedback: "Avis",
    feedbackTitle: "Envoyer un avis",
    feedbackPlaceholder: "Dites-nous ce qui ne marche pas ou ce qui doit être amélioré.",
    cancel: "Annuler",
    send: "Envoyer",
    sending: "Envoi...",
    sent: "Enregistré. Merci.",
    light: "Clair",
    dark: "Sombre",
    system: "Système",
    tests: {
      mic: "Micro",
      audio: "Audio",
      webcam: "Webcam",
      gamepad: "Manette",
      keyboard: "Clavier",
      mouse: "Souris",
      speed: "Débit",
    },
  },
  de: {
    feedback: "Feedback",
    feedbackTitle: "Feedback senden",
    feedbackPlaceholder: "Sag uns, was nicht funktioniert oder besser sein sollte.",
    cancel: "Abbrechen",
    send: "Senden",
    sending: "Senden...",
    sent: "Gespeichert. Danke.",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
    tests: {
      mic: "Mikrofon",
      audio: "Audio",
      webcam: "Webcam",
      gamepad: "Gamepad",
      keyboard: "Tastatur",
      mouse: "Maus",
      speed: "Tempo",
    },
  },
  ja: {
    feedback: "フィードバック",
    feedbackTitle: "フィードバック送信",
    feedbackPlaceholder: "不具合や改善点を入力してください。",
    cancel: "キャンセル",
    send: "送信",
    sending: "送信中...",
    sent: "保存しました。ありがとうございます。",
    light: "ライト",
    dark: "ダーク",
    system: "システム",
    tests: {
      mic: "マイク",
      audio: "音声",
      webcam: "ウェブカメラ",
      gamepad: "ゲームパッド",
      keyboard: "キーボード",
      mouse: "マウス",
      speed: "速度",
    },
  },
  ru: {
    feedback: "Отзыв",
    feedbackTitle: "Отправить отзыв",
    feedbackPlaceholder: "Расскажите, что не работает или что улучшить.",
    cancel: "Отмена",
    send: "Отправить",
    sending: "Отправка...",
    sent: "Сохранено. Спасибо.",
    light: "Светлая",
    dark: "Тёмная",
    system: "Система",
    tests: {
      mic: "Микрофон",
      audio: "Аудио",
      webcam: "Камера",
      gamepad: "Геймпад",
      keyboard: "Клавиатура",
      mouse: "Мышь",
      speed: "Скорость",
    },
  },
  it: {
    feedback: "Feedback",
    feedbackTitle: "Invia feedback",
    feedbackPlaceholder: "Dicci cosa non funziona o cosa migliorare.",
    cancel: "Annulla",
    send: "Invia",
    sending: "Invio...",
    sent: "Salvato. Grazie.",
    light: "Chiaro",
    dark: "Scuro",
    system: "Sistema",
    tests: {
      mic: "Microfono",
      audio: "Audio",
      webcam: "Webcam",
      gamepad: "Gamepad",
      keyboard: "Tastiera",
      mouse: "Mouse",
      speed: "Velocità",
    },
  },
};

function App() {
  const [active, setActive] = useState(currentTestFromPath);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const devices = useMediaDevices();
  const activeConfig = useMemo(() => TESTS.find((test) => test.id === active), [active]);
  const activeCopy = TEST_COPY[active];
  const text = UI_TEXT[language] || UI_TEXT.en;
  const countText = text.counts || UI_TEXT.en.counts;
  const activeDeviceCount = {
    mic: { label: countText.microphones, value: devices.audio.length },
    audio: { label: countText.audioOutputs, value: devices.output.length },
    webcam: { label: countText.cameras, value: devices.video.length },
    gamepad: { label: countText.gamepads, value: navigator.getGamepads ? uniqueGamepads([...navigator.getGamepads()].filter(Boolean)).length : 0 },
    keyboard: { label: countText.keyboardTests, value: 1 },
    mouse: { label: countText.mouseTests, value: 1 },
    speed: { label: countText.networkTests, value: 1 },
  }[active];

  useEffect(() => {
    const onPop = () => setActive(currentTestFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const select = (id) => {
    setActive(id);
    setPathForTest(id);
  };
  const currentLanguage = LANGUAGES.find((item) => item.id === language) || LANGUAGES[0];
  const localizedCopy = COPY_TEXT[language] || COPY_TEXT.en;
  const controls = CONTROL_TEXT[language] || CONTROL_TEXT.en;
  const CurrentThemeIcon = (THEME_OPTIONS.find((item) => item.id === theme) || THEME_OPTIONS[2]).icon;
  const submitFeedback = async () => {
    const message = feedbackText.trim();
    if (!message) {
      setFeedbackStatus("Please enter feedback first.");
      return;
    }

    setFeedbackStatus(text.sending);
    try {
      const response = await fetch("/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, page: window.location.pathname }),
      });
      if (!response.ok) throw new Error("feedback failed");
      setFeedbackStatus(text.sent);
      setFeedbackText("");
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackStatus("");
      }, 700);
    } catch {
      setFeedbackStatus("Could not save feedback. Restart the local server and try again.");
    }
  };

  return (
    <main>
      <nav className="topbar">
        <div className="topbar-left">
          <div className="brand">
            <BrandMark />
            <span>Peripheral Lab</span>
          </div>
          <div className="tabs" aria-label="Peripheral tests">
            {TESTS.map((test) => {
              const Icon = test.icon;
              return (
                <button key={test.id} className={active === test.id ? "active" : ""} onClick={() => select(test.id)} title={text.tests[test.id]}>
                  <Icon size={16} />
                  <span>{text.tests[test.id]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="topbar-actions">
          <button className="utility-link" onClick={() => setFeedbackOpen(true)} type="button">
            <MessageCircle size={15} />
            {text.feedback}
          </button>
          <div className="menu-wrap">
            <button
              className="utility-icon"
              onClick={() => {
                setThemeMenuOpen((open) => !open);
                setLanguageMenuOpen(false);
              }}
              type="button"
              aria-label="Theme"
            >
              <CurrentThemeIcon size={16} />
            </button>
            {themeMenuOpen && (
              <div className="utility-menu theme-menu">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      className={theme === option.id ? "selected" : ""}
                      key={option.id}
                      onClick={() => {
                        setTheme(option.id);
                        setThemeMenuOpen(false);
                      }}
                      type="button"
                    >
                      <Icon size={15} />
                      {text[option.id]}
                      {theme === option.id && <span className="check-mark">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="menu-wrap">
            <button
              className="utility-icon flag-button"
              onClick={() => {
                setLanguageMenuOpen((open) => !open);
                setThemeMenuOpen(false);
              }}
              type="button"
              aria-label="Language"
            >
              <Flag code={currentLanguage.flag} />
            </button>
            {languageMenuOpen && (
              <div className="utility-menu language-menu">
                {LANGUAGES.map((option) => (
                  <button
                    className={language === option.id ? "selected" : ""}
                    key={option.id}
                    onClick={() => {
                      setLanguage(option.id);
                      setLanguageMenuOpen(false);
                    }}
                    type="button"
                  >
                    <Flag code={option.flag} />
                    {option.label}
                    {language === option.id && <span className="check-mark">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className={active === "keyboard" ? "workspace wide" : "workspace"}>
        {active === "mic" && <MicTest audioDevices={devices.audio} labels={controls.mic} refreshDevices={devices.refresh} title={text.tests.mic} />}
        {active === "audio" && <AudioTest labels={controls.audio} outputDevices={devices.output} title={text.tests.audio} />}
        {active === "webcam" && <WebcamTest videoDevices={devices.video} refreshDevices={devices.refresh} title={text.tests.webcam} />}
        {active === "gamepad" && <GamepadTest title={text.tests.gamepad} />}
        {active === "keyboard" && <KeyboardTest title={text.tests.keyboard} />}
        {active === "mouse" && <MouseTest title={text.tests.mouse} />}
        {active === "speed" && <SpeedTest title={text.tests.speed} />}

        <aside>
          <div>
            <h2>{text.tests[activeConfig.id]}</h2>
            <p>{(localizedCopy[active] || activeCopy).does}</p>
            <p>{(localizedCopy[active] || activeCopy).instructions}</p>
          </div>
          <div className="device-counts">
            <span>
              {activeDeviceCount.value} {activeDeviceCount.label}
            </span>
          </div>
        </aside>
      </div>
      {feedbackOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
            <h2 id="feedback-title">{text.feedbackTitle}</h2>
            <textarea
              autoFocus
              onChange={(event) => setFeedbackText(event.target.value)}
              placeholder={text.feedbackPlaceholder}
              value={feedbackText}
            />
            {feedbackStatus && <p>{feedbackStatus}</p>}
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => {
                  setFeedbackOpen(false);
                  setFeedbackStatus("");
                }}
                type="button"
              >
                {text.cancel}
              </button>
              <button className="primary" onClick={submitFeedback} type="button">
                {text.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
