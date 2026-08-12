"use client";

import { useState } from "react";
import { readJsonResponse } from "@/lib/client-api";

export function AddDataPortal() {
  const [uploadStatus, setUploadStatus] = useState("Upload Access, Excel, CSV, DBF, or PDF result files to import them.");
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    setIsUploading(true);
    setUploadStatus(`Uploading 1 of ${selectedFiles.length}: ${selectedFiles[0].name}`);

    try {
      let imported = 0;

      for (const [index, file] of selectedFiles.entries()) {
        const formData = new FormData();
        formData.append("files", file);
        setUploadStatus(`Uploading ${index + 1} of ${selectedFiles.length}: ${file.name}`);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        const data = await readJsonResponse(response);

        if (!response.ok) {
          setUploadStatus(data.error ?? `Upload failed for ${file.name}`);
          return;
        }

        imported += Number(data.imported ?? 0);
      }

      setUploadStatus(`Imported ${imported} result rows from ${selectedFiles.length} files.`);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-page-panel">
      <div>
        <h2>Import result files</h2>
        <p>{uploadStatus}</p>
      </div>
      <label className="file-btn">
        {isUploading ? "Importing" : "Choose files"}
        <input
          type="file"
          multiple
          accept=".mdb,.accdb,.xlsx,.xls,.xlsm,.csv,.dbf,.pdf"
          disabled={isUploading}
          onChange={(event) => void uploadFiles(event.target.files)}
        />
      </label>
    </section>
  );
}
