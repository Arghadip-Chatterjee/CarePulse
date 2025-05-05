"use client";
import React, { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
// import { revalidatePath } from "next/cache";

interface FileUploadDemoProps {
  userId: string;
}

export function FileUploadDemo({ userId }: FileUploadDemoProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (uploadedFiles: File[]) => {
    setFiles(uploadedFiles);

    if (userId && uploadedFiles.length > 0) {
      setIsUploading(true);

      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", userId);

        await fetch("/api/upload-prescription", {
          method: "POST",
          body: formData,
        });
      }

      alert("Files uploaded successfully!");
      // revalidatePath(`/patients/${userId}/prescription`, "page"); // Ensure UI updates

      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-96 border border-dashed bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
      <FileUpload onChange={handleFileUpload} />
      {isUploading && (
        <p className="text-sm mt-2 text-blue-500">Uploading...</p>
      )}
    </div>
  );
}
