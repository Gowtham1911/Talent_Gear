"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface Violation {
  type: "tab_switch" | "copy_paste" | "screenshot_attempt" | "no_face" | "multiple_faces";
  message: string;
  timestamp: number;
}

interface UseProctoringOptions {
  onDisqualify: (reason: string) => void;
  maxViolations?: number;
  enabled?: boolean;
}

export function useProctoring({ onDisqualify, maxViolations = 3, enabled = false }: UseProctoringOptions) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceStatus, setFaceStatus] = useState<"ok" | "no_face" | "multiple" | "loading">("loading");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const violationCountRef = useRef(0);
  const disqualifiedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addViolation = useCallback((v: Omit<Violation, "timestamp">) => {
    if (disqualifiedRef.current) return;
    violationCountRef.current += 1;
    const violation = { ...v, timestamp: Date.now() };
    setViolations(prev => [...prev, violation]);
    if (violationCountRef.current >= maxViolations) {
      disqualifiedRef.current = true;
      onDisqualify(v.message);
    }
  }, [maxViolations, onDisqualify]);

  // Start camera + face detection
  useEffect(() => {
    if (!enabled) return;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 }, audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraAllowed(true);
        startFaceDetection();
      } catch {
        setCameraError("Camera access denied. Camera is required to take this test.");
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  async function startFaceDetection() {
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const faceDetection = await import("@tensorflow-models/face-detection");
      const detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        { runtime: "tfjs" as any, maxFaces: 5 }
      );
      setFaceStatus("ok");
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || disqualifiedRef.current) return;
        try {
          const faces = await detector.estimateFaces(videoRef.current);
          if (faces.length === 0) {
            setFaceStatus("no_face");
            addViolation({ type: "no_face", message: "No face detected — candidate left the screen" });
          } else if (faces.length > 1) {
            setFaceStatus("multiple");
            addViolation({ type: "multiple_faces", message: "Multiple faces detected — possible impersonation" });
          } else {
            setFaceStatus("ok");
          }
        } catch { /* ignore frame errors */ }
      }, 5000);
    } catch {
      setFaceStatus("ok");
      console.warn("[Proctor] Face detection unavailable, camera-only mode");
    }
  }

  // Tab switch detection
  useEffect(() => {
    const handleBlur = () => addViolation({ type: "tab_switch", message: "Switched tab or minimized window" });
    const handleVisibility = () => {
      if (document.hidden) addViolation({ type: "tab_switch", message: "Switched to another tab" });
    };
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [addViolation]);

  // Block copy/paste/screenshot keys
  useEffect(() => {
    const blockEvent = (e: Event) => e.preventDefault();
    const blockKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        addViolation({ type: "screenshot_attempt", message: "Screenshot attempt detected (PrintScreen)" });
      }
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "p", "s", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "v") {
          addViolation({ type: "copy_paste", message: "Copy/paste shortcut detected" });
        }
      }
      if (e.key === "F12") e.preventDefault();
    };
    document.addEventListener("copy", blockEvent);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("contextmenu", blockEvent);
    document.addEventListener("keydown", blockKey);
    return () => {
      document.removeEventListener("copy", blockEvent);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
      document.removeEventListener("keydown", blockKey);
    };
  }, [addViolation]);

  // Disable text selection + print
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "proctor-style";
    style.innerHTML = `
      * { -webkit-user-select: none !important; user-select: none !important; }
      input, textarea { -webkit-user-select: text !important; user-select: text !important; }
      @media print { body { display: none !important; } }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("proctor-style")?.remove();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraAllowed(false);
    setFaceStatus("ok");
  }

  return { violations, violationCountRef, cameraAllowed, cameraError, faceStatus, videoRef, maxViolations, stopCamera };
}
