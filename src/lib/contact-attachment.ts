export const CONTACT_MAX_FILE_BYTES = 3 * 1024 * 1024;
export const CONTACT_MAX_BODY_BYTES = 4 * 1024 * 1024;
export const CONTACT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf";

const allowedAttachmentTypes: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  txt: ["text/plain"],
  rtf: ["application/rtf", "text/rtf"],
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function signatureMatches(extension: string, bytes: Uint8Array) {
  if (extension === "pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === "jpg" || extension === "jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === "png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === "webp") {
    return startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (["docx", "xlsx", "pptx"].includes(extension)) {
    return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
      || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
      || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08]);
  }
  if (["doc", "xls", "ppt"].includes(extension)) {
    return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  if (extension === "rtf") return new TextDecoder().decode(bytes.slice(0, 8)).startsWith("{\\rtf");
  if (extension === "txt") return !bytes.slice(0, 1024).includes(0);
  return false;
}

export function contactAttachmentExtension(fileName: string) {
  return fileName.trim().toLocaleLowerCase("en").match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

export function sanitizeContactAttachmentName(fileName: string) {
  const normalized = fileName.normalize("NFKC").replace(/[/\\\u0000-\u001f\u007f]/g, "-").trim();
  return (normalized || "document").slice(0, 180);
}

export function validateContactAttachmentMetadata(file: { name: string; type: string; size: number }) {
  const extension = contactAttachmentExtension(file.name);
  const allowedTypes = allowedAttachmentTypes[extension];
  if (!allowedTypes) return { valid: false as const, code: "UNSUPPORTED_FILE_TYPE" };
  if (file.size <= 0 || file.size > CONTACT_MAX_FILE_BYTES) return { valid: false as const, code: "FILE_TOO_LARGE" };
  if (file.type && !allowedTypes.includes(file.type)) return { valid: false as const, code: "FILE_TYPE_MISMATCH" };
  return { valid: true as const, extension, contentType: allowedTypes[0] };
}

export function validateContactAttachmentBytes(extension: string, bytes: Uint8Array) {
  return signatureMatches(extension, bytes);
}
