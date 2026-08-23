import ReactMarkdown from "react-markdown";

/**
 * Renders a single line of markdown (typically containing an inline link)
 * without MarkdownSection's block-level <p>/.prose wrapper — for short text
 * fragments used inside an existing <p>/<li>/<span>, like a Roadmap stage's
 * description or a single learning-objective bullet.
 */
export function InlineMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a href={href} className="text-indigo-600 hover:underline dark:text-indigo-400">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
