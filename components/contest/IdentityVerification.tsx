"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, ShieldCheck, SkipForward, AlertTriangle, LoaderCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "idle" | "requesting" | "streaming" | "uploading" | "error";

export function IdentityVerification({
  participantId,
  participantToken,
}: {
  participantId: Id<"participants">;
  participantToken: string;
}) {
  const generateUploadUrl = useMutation(api.participants.generateIdentityPhotoUploadUrl);
  const saveIdentityPhoto = useMutation(api.participants.saveIdentityPhoto);
  const skipVerification = useMutation(api.participants.skipIdentityVerification);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();

  const cameraSupported =
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function enableCamera() {
    setError(undefined);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("streaming");
    } catch (err) {
      setError(
        err instanceof Error
          ? "Could not access your camera: " + err.message
          : "Could not access your camera.",
      );
      setStatus("error");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setStatus("uploading");
    setError(undefined);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) throw new Error("Could not prepare the photo.");
      ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not capture the photo.");

      const uploadUrl = await generateUploadUrl({ participantId, participantToken });
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) throw new Error("Upload failed. Please try again.");
      const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };

      await saveIdentityPhoto({ participantId, participantToken, storageId });
      stopCamera();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your photo.");
      setStatus("streaming");
    }
  }

  async function handleSkip() {
    stopCamera();
    try {
      await skipVerification({ participantId, participantToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not skip verification.");
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="font-heading text-2xl">Quick identity check</CardTitle>
          <CardDescription>
            Before you start, we take a single photo to help confirm the person who registered is
            the person taking the contest. This is a one-time capture — no ongoing recording.
            It&apos;s only ever visible to contest administrators, and is used solely as evidence
            if a dispute comes up. There is no automated face matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "streaming" ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border bg-black">
                <video ref={videoRef} className="w-full" muted playsInline />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={capturePhoto} disabled={status !== "streaming"}>
                  <Camera className="size-4" /> Capture photo
                </Button>
                <Button variant="ghost" onClick={handleSkip}>
                  <SkipForward className="size-4" /> Skip verification
                </Button>
              </div>
            </div>
          ) : status === "uploading" ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" /> Saving your photo…
            </div>
          ) : (
            <div className="space-y-3">
              {/* Hidden video element keeps the ref stable across status transitions */}
              <video ref={videoRef} className="hidden" muted playsInline />
              {!cameraSupported && (
                <p className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                  Camera access isn&apos;t available in this browser.
                </p>
              )}
              {error && (
                <p className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={enableCamera}
                  disabled={!cameraSupported || status === "requesting"}
                >
                  {status === "requesting" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  Enable camera
                </Button>
                <Button variant="ghost" onClick={handleSkip}>
                  <SkipForward className="size-4" /> Skip (camera unavailable)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
