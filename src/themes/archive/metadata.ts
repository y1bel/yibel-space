import type { PostView } from "@core/content";

export type ArchiveClassification = "public" | "internal" | "restricted" | "confidential";

export interface ArchivePostMetadata {
  recordId?: string;
  classification?: ArchiveClassification;
  documentType?: string;
  recordStatus?: string;
  receivedAt?: string;
  researchNotes?: string;
  indexTerms?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

export function getArchivePostMetadata(post: PostView): ArchivePostMetadata {
  const extension = post.themeExtensions.archive;
  if (!isRecord(extension)) {
    return {};
  }

  const classification = getString(extension.classification);
  return {
    recordId: getString(extension.recordId),
    classification: classification === "public" || classification === "internal" || classification === "restricted" || classification === "confidential" ? classification : undefined,
    documentType: getString(extension.documentType),
    recordStatus: getString(extension.recordStatus),
    receivedAt: getString(extension.receivedAt),
    researchNotes: getString(extension.researchNotes),
    indexTerms: getStringArray(extension.indexTerms)
  };
}