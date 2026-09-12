import * as pdfjsLib from "pdfjs-dist";
import * as pdfjsWorkerEntryForSameThreadFakeWorkerMode from "pdfjs-dist/build/pdf.worker.mjs";

(globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorkerEntryForSameThreadFakeWorkerMode;

export type ExtractRequest = { type: "extract"; kind: "pdf" | "docx"; buffer: ArrayBuffer };
export type ExtractResponse = { type: "result"; text: string } | { type: "error"; message: string };

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  try {
    const doc = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      pages.push(pageText);
    }
    return pages.join("\n").trim();
  } finally {
    await loadingTask.destroy();
  }
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}

self.onmessage = async (event: MessageEvent<ExtractRequest>) => {
  if (event.data?.type !== "extract") return;
  const { kind, buffer } = event.data;
  try {
    const text = kind === "pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);
    if (!text) {
      self.postMessage({ type: "error", message: "No readable text was found in this file — it may be a scanned image. Try pasting the text instead." } satisfies ExtractResponse);
      return;
    }
    self.postMessage({ type: "result", text } satisfies ExtractResponse);
  } catch {
    self.postMessage({ type: "error", message: "This file couldn't be read. Try a different file, or paste the text directly." } satisfies ExtractResponse);
  }
};
