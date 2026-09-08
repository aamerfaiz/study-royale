import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders a node's lesson body — the primary study material, not a link-out
 * (docs/11-node-content-model.md). Lessons contain fenced code samples
 * throughout, so those get real styling rather than a default <pre>.
 */
export function Lesson({ content }: { content: string }) {
  return (
    <div className="text-[14px] leading-[1.65] text-ink-strong">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3.5 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-ink">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-3.5 list-disc space-y-1.5 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3.5 list-decimal space-y-1.5 pl-5">{children}</ol>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-accent underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className?.startsWith('language-'));
            if (isBlock) {
              return (
                <code className="font-mono text-[12.5px] leading-[1.6] text-ink-strong">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12.5px] text-ink">
                {children}
              </code>
            );
          },
          // Wide code samples scroll inside their own box; the page never does.
          pre: ({ children }) => (
            <pre className="mb-3.5 overflow-x-auto rounded-tile border border-hairline bg-sunken p-3.5">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <h3 className="font-display mt-5 mb-2 text-[16px] font-semibold">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-display mt-5 mb-2 text-[15px] font-semibold">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="font-display mt-4 mb-1.5 text-[14px] font-semibold">{children}</h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3.5 border-l-2 border-hairline-strong pl-3.5 text-ink-muted">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
