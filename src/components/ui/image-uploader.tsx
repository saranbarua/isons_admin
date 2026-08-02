import { useCallback, useState, useRef } from "react";
import { Button } from "./button";

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;

interface ImageUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

interface FileError {
  name: string;
  error: string;
}

export function ImageUploader({ onUpload, disabled }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<FileError[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): { valid: File[]; errors: FileError[] } => {
      const valid: File[] = [];
      const fileErrors: FileError[] = [];
      const fileArray = Array.from(files);

      if (fileArray.length > MAX_FILES) {
        fileErrors.push({
          name: "Selection",
          error: `Maximum ${MAX_FILES} files allowed per upload`,
        });
        return { valid: [], errors: fileErrors };
      }

      for (const file of fileArray) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          fileErrors.push({
            name: file.name,
            error: "Invalid file type. Only JPEG and PNG allowed",
          });
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          fileErrors.push({
            name: file.name,
            error: "File size exceeds 5MB limit",
          });
          continue;
        }
        valid.push(file);
      }

      return { valid, errors: fileErrors };
    },
    [],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const { valid, errors: fileErrors } = validateFiles(files);
      setErrors(fileErrors);

      if (valid.length > 0) {
        // Revoke previous preview URLs
        previewUrls.forEach((url) => URL.revokeObjectURL(url));

        setSelectedFiles(valid);
        setPreviewUrls(valid.map((file) => URL.createObjectURL(file)));
      } else {
        setSelectedFiles([]);
        setPreviewUrls([]);
      }
    },
    [validateFiles, previewUrls],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setErrors([]);

    try {
      await onUpload(selectedFiles);
      // Clear after successful upload
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      setErrors([
        {
          name: "Upload",
          error: err instanceof Error ? err.message : "Upload failed",
        },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setErrors([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        } ${disabled || uploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png"
          onChange={handleChange}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">Click to upload</span>{" "}
            or drag and drop
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            PNG or JPEG up to 5MB (max {MAX_FILES} files)
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3">
          <ul className="text-sm text-destructive space-y-1">
            {errors.map((err, i) => (
              <li key={i}>
                <span className="font-medium">{err.name}:</span> {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview */}
      {previewUrls.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Selected files ({selectedFiles.length})
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="h-24 w-full rounded object-cover border"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove file"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {selectedFiles[index]?.name}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={uploading || disabled}>
              {uploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </>
              ) : (
                `Upload ${selectedFiles.length} image${selectedFiles.length > 1 ? "s" : ""}`
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={uploading}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
