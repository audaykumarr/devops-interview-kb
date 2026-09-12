import type { ExtractRequest, ExtractResponse } from "./workers/resume-extract.worker";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const WORKER_TIMEOUT_MS = 20_000;

export type ExtractionResult = { ok: true; text: string } | { ok: false; error: string };

type FileKind = "text" | "pdf" | "docx" | "unsupported";

function detectKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (name.endsWith(".txt") || file.type === "text/plain") return "text";
  return "unsupported";
}

let workerInstance: Worker | null = null;
function getPreBundledExtractionWorker(): Worker {
  workerInstance ??= new Worker("/resume-extract-worker.js", { type: "module" });
  return workerInstance;
}

function isExtractionProtocolMessage(data: unknown): data is ExtractResponse {
  return !!data && typeof data === "object" && ((data as { type?: unknown }).type === "result" || (data as { type?: unknown }).type === "error");
}

function runInWorker(kind: "pdf" | "docx", buffer: ArrayBuffer): Promise<ExtractionResult> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = getPreBundledExtractionWorker();
    } catch {
      resolve({ ok: false, error: "Your browser couldn't start the file reader. Try pasting the text directly." });
      return;
    }

    const timeoutId = setTimeout(() => {
      worker.removeEventListener("message", onMessage);
      resolve({ ok: false, error: "This file took too long to read. Try a shorter document, or paste the text directly." });
    }, WORKER_TIMEOUT_MS);

    function onMessage(event: MessageEvent<unknown>) {
      if (!isExtractionProtocolMessage(event.data)) return;
      clearTimeout(timeoutId);
      worker.removeEventListener("message", onMessage);
      if (event.data.type === "result") resolve({ ok: true, text: event.data.text });
      else resolve({ ok: false, error: event.data.message });
    }

    worker.addEventListener("message", onMessage);
    worker.postMessage({ type: "extract", kind, buffer } satisfies ExtractRequest, [buffer]);
  });
}

export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `This file is ${mb} MB — the limit is 5 MB. Try a shorter document, or paste the text directly.` };
  }

  const kind = detectKind(file);
  if (kind === "unsupported") {
    return { ok: false, error: "Unsupported file type. Upload a .txt, .pdf, or .docx file, or paste the text directly." };
  }
  if (kind === "text") {
    try {
      return { ok: true, text: await file.text() };
    } catch {
      return { ok: false, error: "Couldn't read this text file. Try pasting the text directly." };
    }
  }

  const buffer = await file.arrayBuffer();
  return runInWorker(kind, buffer);
}
