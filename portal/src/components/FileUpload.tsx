import React, { useCallback, useRef, useState } from "react";
import { CheckCircle, FileUp, Loader2, XCircle } from "lucide-react";
import { getSupabaseClient } from "../lib/supabase";

export interface FileUploadProps {
  bucket: string;
  path: string;
  accept?: string;
  maxSizeMb?: number;
  onUpload: (url: string, filename: string) => void;
  onError?: (error: string) => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  path,
  accept,
  maxSizeMb = 10,
  onUpload,
  onError,
}) => {
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback(
    (msg: string) => {
      setState("error");
      setErrorMsg(msg);
      onError?.(msg);
    },
    [onError],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMb * 1024 * 1024) {
        handleError(`Bestand is te groot (max ${maxSizeMb} MB).`);
        return;
      }

      setState("uploading");
      setFileName(file.name);
      setErrorMsg(null);

      try {
        const supabase = getSupabaseClient();
        const filePath = `${path.replace(/\/$/, "")}/${Date.now()}_${file.name}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { upsert: false });

        if (error) {
          handleError(error.message);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);

        setState("done");
        onUpload(publicUrl, file.name);
      } catch (err) {
        handleError(err instanceof Error ? err.message : "Upload mislukt.");
      }
    },
    [bucket, path, maxSizeMb, onUpload, handleError],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const reset = () => {
    setState("idle");
    setFileName(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => state !== "uploading" && inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
        isDragging
          ? "border-digidromen-primary bg-digidromen-primary/5"
          : state === "error"
            ? "border-red-300 bg-red-50/50"
            : state === "done"
              ? "border-emerald-300 bg-emerald-50/50"
              : "border-digidromen-cream bg-white hover:border-digidromen-primary/40 hover:bg-digidromen-warm"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {state === "idle" && (
        <>
          <FileUp size={28} className="text-digidromen-dark/25" />
          <p className="mt-3 text-sm font-medium text-digidromen-dark/60">
            Sleep een bestand hierheen of klik om te kiezen
          </p>
          <p className="mt-1 text-xs text-digidromen-dark/30">
            Max {maxSizeMb} MB{accept ? ` — ${accept}` : ""}
          </p>
        </>
      )}

      {state === "uploading" && (
        <>
          <Loader2 size={28} className="animate-spin text-digidromen-primary" />
          <p className="mt-3 text-sm font-medium text-digidromen-dark/60">
            Uploaden: {fileName}
          </p>
        </>
      )}

      {state === "done" && (
        <>
          <CheckCircle size={28} className="text-emerald-600" />
          <p className="mt-3 text-sm font-medium text-digidromen-dark/60">
            {fileName}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="mt-2 text-xs font-semibold text-digidromen-primary hover:underline"
          >
            Ander bestand kiezen
          </button>
        </>
      )}

      {state === "error" && (
        <>
          <XCircle size={28} className="text-red-500" />
          <p className="mt-3 text-sm font-medium text-red-600">{errorMsg}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="mt-2 text-xs font-semibold text-digidromen-primary hover:underline"
          >
            Opnieuw proberen
          </button>
        </>
      )}
    </div>
  );
};

export default FileUpload;
