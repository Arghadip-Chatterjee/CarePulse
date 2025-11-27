"use server";

import cloudinary from "@/lib/cloudinary.config";

/**
 * Upload a file to Cloudinary
 * @param file - File object or base64 string
 * @param folder - Folder name in Cloudinary (e.g., "patient-documents", "prescriptions")
 * @returns Object with publicId and url
 */
export const uploadFile = async (
  fileData: string | Buffer,
  folder: string = "carepulse",
  fileName?: string
): Promise<{ publicId: string; url: string }> => {
  try {
    // Determine file type based on the data URI
    const isTextFile = typeof fileData === 'string' && fileData.startsWith('data:text/plain');
    const isPdfFile = typeof fileData === 'string' && fileData.startsWith('data:application/pdf');
    
    const uploadOptions: any = {
      folder,
      resource_type: (isTextFile || isPdfFile) ? "raw" : "auto",
    };

    // If it's a text or PDF file and we have a fileName, include the extension in the public_id
    if ((isTextFile || isPdfFile) && fileName) {
      uploadOptions.public_id = `${folder}/${fileName}`;
      uploadOptions.folder = undefined; // Don't use folder when specifying full public_id
    }

    const result = await cloudinary.uploader.upload(fileData as string, uploadOptions);

    return {
      publicId: result.public_id,
      url: result.secure_url,
    };
  } catch (error: any) {
    console.error("An error occurred while uploading file:", error);
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param publicId - Public ID of the file to delete
 */
export const deleteFile = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    console.error("An error occurred while deleting file:", error);
    throw error;
  }
};

/**
 * Get file URL from Cloudinary
 * @param publicId - Public ID of the file
 * @returns File URL
 */
export const getFileUrl = (publicId: string): string => {
  return cloudinary.url(publicId, {
    secure: true,
  });
};

/**
 * Convert File/Blob to base64 string for upload
 * @param file - File or Blob object
 * @returns Base64 string
 */
export const fileToBase64 = async (file: File | Blob): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:${file.type};base64,${buffer.toString("base64")}`;
};
