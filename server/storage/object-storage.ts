import {
  ObjectStorage,
  SignedUploadResult,
  StorageUploadInput,
  StorageUploadResult
} from "@/lib/storage/types";

class PlaceholderObjectStorage implements ObjectStorage {
  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    return {
      key: input.key,
      url: `/uploads/${input.key}`
    };
  }

  async createSignedUpload(
    key: string,
    _contentType: string
  ): Promise<SignedUploadResult> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      key,
      uploadUrl: `/api/uploads/${key}`,
      publicUrl: `/uploads/${key}`,
      expiresAt
    };
  }
}

export const objectStorage = new PlaceholderObjectStorage();
