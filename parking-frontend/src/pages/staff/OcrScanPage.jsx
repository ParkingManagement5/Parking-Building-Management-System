import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageUp, RefreshCw, ScanLine, Video, VideoOff, XCircle } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { formatStaffDateTime } from "./staffPortalState";
import { unwrapApiData } from "../../utils/api";
import {
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffStatusBadge,
} from "./StaffUi";

export default function OcrScanPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [gateId, setGateId] = useState("1");
  const [triggerType, setTriggerType] = useState("ENTRY");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
    };
  }, []);

  const startCamera = async () => {
    setError("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Trinh duyet khong ho tro camera. Can chay tren HTTPS hoac localhost. Hay upload anh thay the.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch (err) {
      const msg =
        err.name === "NotAllowedError"
          ? "Quyen camera bi tu choi. Vao Settings trinh duyet > cho phep camera cho trang nay."
          : err.name === "NotFoundError"
            ? "Khong tim thay camera tren thiet bi nay. Hay upload anh bien so thay the."
            : err.name === "NotReadableError"
              ? "Camera dang duoc ung dung khac su dung. Dong ung dung do roi thu lai."
              : `Khong mo duoc camera (${err.name || err.message}). Hay upload anh bien so thay the.`;
      setError(msg);
    }
  };

  const captureBlob = () =>
    new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        reject(new Error("Camera chua san sang"));
        return;
      }

      const sourceWidth = video.videoWidth || 1280;
      const sourceHeight = video.videoHeight || 720;
      const cropWidth = Math.round(sourceWidth * 0.68);
      const cropHeight = Math.round(sourceHeight * 0.36);
      const cropX = Math.round((sourceWidth - cropWidth) / 2);
      const cropY = Math.round((sourceHeight - cropHeight) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Khong chup duoc anh tu camera"));
      }, "image/jpeg", 0.92);
    });

  const uploadForOcr = async (blob, filename = "camera-capture.jpg") => {
    if (!gateId.trim()) {
      setError("Nhap gateId truoc khi scan.");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(blob);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextPreviewUrl;
    });

    setScanning(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", blob, filename);
      formData.append("gateId", gateId.trim());
      formData.append("triggerType", triggerType);

      const response = await axiosClient.post("/ocr/scan-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = unwrapApiData(response.data, {});
      const confidence = Math.round((data.plateConfidenceScore || 0) * 100);
      const record = {
        scanId: data.scanId,
        detectedPlate: data.effectivePlate || data.detectedPlate || "UNKNOWN",
        correctedPlate: data.correctedPlate || "",
        confidence,
        status: data.processStatus || "PENDING",
        scanTime: data.scannedAt || new Date().toISOString(),
        imagePath: data.imagePath || filename,
      };

      setResult(record);
      if (record.status === "FAILED") {
        setError("OCR engine khong doc duoc bien so. Hay chup ro hon hoac qua OCR Correction de nhap tay.");
      }
    } catch (err) {
      setResult(null);
      setError(err.response?.data?.message || err.message || "OCR scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const handleCameraScan = async () => {
    try {
      const blob = await captureBlob();
      await uploadForOcr(blob);
    } catch (err) {
      setError(err.message || "Khong chup duoc anh tu camera.");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadForOcr(file, file.name);
    event.target.value = "";
  };

  const resetScan = () => {
    setResult(null);
    setError("");
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return "";
    });
  };

  const statusTone = (status) => {
    if (status === "AUTO_APPROVED" || status === "CONFIRMED" || status === "STAFF_APPROVED") return "emerald";
    if (status === "FAILED") return "rose";
    return "amber";
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <StaffPageSection title="OCR Camera Interface" subtitle="Upload or capture a plate image. Spring Boot sends it to OpenCV + EasyOCR.">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-foreground">Gate ID</span>
              <input
                type="number"
                min="1"
                value={gateId}
                onChange={(event) => setGateId(event.target.value)}
                className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-foreground">Trigger</span>
              <select
                value={triggerType}
                onChange={(event) => setTriggerType(event.target.value)}
                className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="ENTRY">Entry</option>
                <option value="EXIT">Exit</option>
              </select>
            </label>
            <div className="flex items-end">
              <StaffSecondaryButton type="button" onClick={cameraOn ? stopCamera : startCamera} className="flex w-full items-center justify-center gap-2">
                {cameraOn ? <VideoOff size={15} /> : <Video size={15} />}
                {cameraOn ? "Stop" : "Camera"}
              </StaffSecondaryButton>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-5 text-center text-white dark:bg-[#020617]">
            <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-slate-900 dark:bg-[#0f172a]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 size-full object-cover ${cameraOn ? "opacity-100" : "opacity-0"}`}
              />
              {cameraOn ? (
                <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
              ) : null}
              {previewUrl && !cameraOn ? (
                <img src={previewUrl} alt="Plate preview" className="absolute inset-0 size-full object-contain opacity-50" />
              ) : null}
              {scanning ? (
                <div className="relative z-10 space-y-3">
                  <div className="mx-auto size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  <p className="text-sm text-emerald-300">Sending image to OCR engine...</p>
                </div>
              ) : result && !cameraOn ? (
                <div className="relative z-10 space-y-4">
                  <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${result.status === "FAILED" ? "bg-rose-500/20" : "bg-emerald-500/20"}`}>
                    {result.status === "FAILED" ? (
                      <XCircle size={30} className="text-rose-300" />
                    ) : (
                      <CheckCircle2 size={30} className="text-emerald-300" />
                    )}
                  </div>
                  <p className="text-3xl font-bold tracking-wide">{result.detectedPlate}</p>
                  <p className="text-sm text-slate-300">{result.confidence}% confidence</p>
                </div>
              ) : (
                <div className="relative z-10 space-y-3">
                  <Camera size={38} className="mx-auto text-white/30" />
                  <p className="text-sm text-white/60">{cameraOn ? "Align plate inside the frame" : "Camera feed ready"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <StaffPrimaryButton type="button" onClick={handleCameraScan} disabled={scanning || !cameraOn} className="flex flex-1 items-center justify-center gap-2">
              <ScanLine size={15} />
              {scanning ? "Scanning..." : "Capture & Scan"}
            </StaffPrimaryButton>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <StaffSecondaryButton type="button" onClick={() => fileInputRef.current?.click()} disabled={scanning} className="flex items-center gap-2">
              <ImageUp size={15} />
              Upload
            </StaffSecondaryButton>
            <StaffSecondaryButton type="button" onClick={resetScan} className="flex items-center gap-2">
              <RefreshCw size={15} />
              Reset
            </StaffSecondaryButton>
          </div>
          {error ? <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
        </StaffPageSection>

        <StaffPageSection title="Latest OCR Result" subtitle="Low confidence records can be corrected in the OCR correction page">
          {result ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Detected Plate</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{result.detectedPlate}</p>
              </div>
              {previewUrl ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-slate-950">
                  <img src={previewUrl} alt="Uploaded plate preview" className="max-h-56 w-full object-contain" />
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="mt-1 font-semibold text-foreground">{result.confidence}%</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <StaffStatusBadge tone={statusTone(result.status)}>
                      {result.status.toLowerCase().replaceAll("_", " ")}
                    </StaffStatusBadge>
                  </div>
                </div>
              </div>
              {result.imagePath ? (
                <p className="break-all text-xs text-muted-foreground">Image: {result.imagePath}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">{formatStaffDateTime(result.scanTime)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Capture or upload a plate to see OCR details here.</p>
          )}
        </StaffPageSection>
      </div>
    </div>
  );
}
