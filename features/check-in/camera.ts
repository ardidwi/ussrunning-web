import type QrScanner from "qr-scanner";
/** Own the stream so permission errors retain their DOMException names. Decoder is lazy. */
export async function openCamera(
  video: HTMLVideoElement,
  signal: AbortSignal,
  onDecode: (value: string) => void,
  onFailure: () => void,
) {
  let stream: MediaStream | null = null,
    engine: Awaited<ReturnType<typeof QrScanner.createQrEngine>> | null = null,
    timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
    if (engine instanceof Worker) engine.terminate();
  };
  signal.addEventListener("abort", stop, { once: true });
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    if (signal.aborted) {
      stop();
      return;
    }
    video.srcObject = stream;
    await video.play();
    const { default: Decoder } = await import("qr-scanner");
    if (signal.aborted) {
      stop();
      return;
    }
    engine = await Decoder.createQrEngine();
    if (signal.aborted) {
      stop();
      return;
    }
    let failures = 0;
    const frame = async () => {
      if (signal.aborted) return;
      try {
        const result = await Decoder.scanImage(video, {
          qrEngine: engine!,
          returnDetailedScanResult: true,
        });
        failures = 0;
        if (!signal.aborted) onDecode(result.data);
      } catch (error) {
        if (signal.aborted) return;
        if (String(error).includes(Decoder.NO_QR_CODE_FOUND)) {
          failures = 0;
        } else if (++failures >= 3) {
          stop();
          onFailure();
          return;
        }
      }
      if (!signal.aborted) timer = setTimeout(() => void frame(), 200);
    };
    timer = setTimeout(() => void frame(), 0);
  } catch (error) {
    stop();
    signal.removeEventListener("abort", stop);
    throw error;
  }
}
