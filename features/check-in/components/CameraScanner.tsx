"use client";
import { useEffect, useRef, useState } from "react";
import { openCamera } from "../camera";
import { Button } from "@/components/ui/Button";
import { cameraFailure } from "../model";
export default function CameraScanner({
  enabled,
  onDecode,
}: {
  enabled: boolean;
  onDecode: (value: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    callback = useRef(onDecode);
  callback.current = onDecode;
  const [phase, setPhase] = useState<
    "idle" | "loading" | "active" | "denied" | "unavailable" | "paused"
  >("idle");
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !requested) {
      setPhase(requested ? "paused" : "idle");
      return;
    }
    let disposed = false;
    const controller = new AbortController();
    setPhase("loading");
    const visibility = () => {
      if (document.hidden) {
        controller.abort();
        setRequested(false);
        setPhase("paused");
      }
    };
    document.addEventListener("visibilitychange", visibility);
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          setPhase("unavailable");
          return;
        }
        if (disposed || !video.current) return;
        await openCamera(
          video.current,
          controller.signal,
          (value) => {
            if (!disposed) callback.current(value);
          },
          () => {
            if (!disposed) setPhase("unavailable");
          },
        );
        if (!disposed) setPhase("active");
      } catch (error) {
        if (!disposed) setPhase(cameraFailure(error));
      }
    }
    void start();
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", visibility);
      controller.abort();
    };
  }, [enabled, requested, attempt]);
  const copy = {
    idle: "Camera is off. Start it when you are ready.",
    loading: "Opening camera…",
    active: "Scanning. Hold an Event Pass inside the frame.",
    denied:
      "Camera access was denied. Allow it in browser settings, or enter the pass below.",
    unavailable:
      "Camera is unavailable or in use. Try again, or enter the pass below.",
    paused: "Camera paused. Start it again when ready.",
  };
  return (
    <section className="uss-scanner-camera" aria-label="QR camera scanner">
      <div className="uss-scanner-view">
        <video ref={video} muted playsInline aria-label="Rear camera preview" />
        <div className="uss-scanner-frame" aria-hidden="true" />
      </div>
      <p role="status">{copy[phase]}</p>
      <Button
        variant="secondary"
        disabled={!enabled || phase === "loading"}
        onClick={() => {
          if (phase === "active") {
            setRequested(false);
          } else {
            setRequested(true);
            setAttempt((n) => n + 1);
          }
        }}
      >
        {phase === "active" ? "Stop camera" : "Start camera"}
      </Button>
    </section>
  );
}
