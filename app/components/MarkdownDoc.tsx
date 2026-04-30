'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  src: string;
  header: string;
  homeHref?: string;
  /** When true, strip the manual `## contents.` block, inject hierarchical
   *  part.chapter numbers into headings, and render an auto-generated TOC
   *  in its place. Designed for the whitepaper's parts → chapters structure. */
  numbered?: boolean;
};

type TocEntry = {
  level: 1 | 2;
  text: string;
  slug: string;
  num: string;
};

// Recursively extract plain text from React children — handles nested
// elements like <em> from markdown emphasis, so a heading containing
// `*why.*` slugifies to the same value as the markdown source.
function flattenText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { children?: React.ReactNode } }).props;
    return flattenText(props.children);
  }
  return '';
}

function slugify(node: React.ReactNode): string {
  return flattenText(node).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

const TOC_MARKER = '\n%%MDOC_TOC%%\n';

function processNumbered(md: string): { pre: string; post: string; toc: TocEntry[] } {
  const lines = md.split('\n');
  const out: string[] = [];
  const toc: TocEntry[] = [];
  let part = 0;
  let chapter = 0;
  let isFirstH1 = true;
  let inFence = false;
  let inContents = false;
  let tocInserted = false;

  for (const line of lines) {
    if (line.startsWith('```')) inFence = !inFence;

    if (!inFence) {
      // Strip the manual `## contents.` block — runs until the next H1.
      if (/^##\s+contents\.?\s*$/i.test(line)) {
        inContents = true;
        if (!tocInserted) {
          out.push(TOC_MARKER);
          tocInserted = true;
        }
        continue;
      }
      if (inContents) {
        if (/^# /.test(line)) {
          inContents = false;
          // Fall through — process this H1 below.
        } else {
          continue;
        }
      }

      const h1 = /^# (.+)$/.exec(line);
      const h2 = /^## (.+)$/.exec(line);

      if (h1) {
        if (isFirstH1) {
          // Document title — keep as-is, no number.
          isFirstH1 = false;
          out.push(line);
          continue;
        }
        part++;
        chapter = 0;
        const text = h1[1];
        const num = String(part);
        out.push(`# ${num} ${text}`);
        toc.push({ level: 1, text, slug: slugify(`${num} ${text}`), num });
        continue;
      }

      if (h2 && part > 0) {
        chapter++;
        const text = h2[1];
        const num = `${part}.${chapter}`;
        out.push(`## ${num} ${text}`);
        toc.push({ level: 2, text, slug: slugify(`${num} ${text}`), num });
        continue;
      }
    }

    out.push(line);
  }

  const full = out.join('\n');
  const [pre, post = ''] = full.split(TOC_MARKER);
  return { pre, post, toc };
}

function TocBlock({ entries }: { entries: TocEntry[] }) {
  return (
    <nav className="mdoc-toc" aria-label="Contents">
      <p className="mdoc-toc-label">contents.</p>
      <ol className="mdoc-toc-list">
        {entries.map((e) => (
          <li key={e.slug} className={`mdoc-toc-item lvl-${e.level}`}>
            <a href={`#${e.slug}`}>
              <span className="mdoc-toc-num">{e.num}</span>
              <span className="mdoc-toc-text">{e.text.replace(/\*/g, '')}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => <h1 id={slugify(children)} className="pdoc-h1">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 id={slugify(children)} className="pdoc-h2">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 id={slugify(children)} className="pdoc-h3">{children}</h3>,
  h4: ({ children }: { children?: React.ReactNode }) => <h4 id={slugify(children)} className="pdoc-h4">{children}</h4>,
  hr: () => <div className="pdoc-hr" />,
  p: ({ children }: { children?: React.ReactNode }) => <p className="pdoc-p">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="pdoc-strong">{children}</strong>,
  table: ({ children }: { children?: React.ReactNode }) => <table className="pdoc-table">{children}</table>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="pdoc-bq">{children}</blockquote>,
};

export default function MarkdownDoc({ src, header, homeHref = '/', numbered = false }: Props) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetch(src).then(r => r.text()).then(setContent);
  }, [src]);

  const parsed = useMemo(() => {
    if (content === null) return null;
    return numbered ? processNumbered(content) : null;
  }, [content, numbered]);

  if (content === null) return <main className="mdoc" />;

  return (
    <>
      <ThemeToggle />
      <main className="mdoc">
        <div className="mdoc-frame mdoc-header">{header}</div>

        <article className="mdoc-frame mdoc-article pdoc pdoc-longform">
          {parsed ? (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                {parsed.pre}
              </ReactMarkdown>
              {parsed.toc.length > 0 && <TocBlock entries={parsed.toc} />}
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                {parsed.post}
              </ReactMarkdown>
            </>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
              {content}
            </ReactMarkdown>
          )}
        </article>

        <nav className="mdoc-frame mdoc-footnav">
          <Link href={homeHref} className="mdoc-home">a.</Link>
        </nav>
      </main>
    </>
  );
}
