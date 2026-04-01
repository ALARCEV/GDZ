export type StorageUploadInput = {
  key: string;
  contentType: string;
  body: Uint8Array;
};

export type StorageUploadResult = {
  key: string;
  url: string;
};

export type SignedUploadResult = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresAt: string;
};

export interface ObjectStorage {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  createSignedUpload(key: string, contentType: string): Promise<SignedUploadResult>;
}
