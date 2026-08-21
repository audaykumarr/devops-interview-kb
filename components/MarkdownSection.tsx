import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownSection({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none dark:prose-invert prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
