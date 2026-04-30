'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  src: string;
  header: string;
  homeHref?: string;
};

function slugify(children: React.ReactNode): string {
  const text = (Array.isArray(children) ? children : [children])
    .map(c => (typeof c === 'string' ? c : ''))
    .join('');
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

export default function MarkdownDoc({ src, header, homeHref = '/' }: Props) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetch(src).then(r => r.text()).then(setContent);
  }, [src]);

  if (content === null) return <main className="mdoc" />;

  return (
    <>
      <ThemeToggle />
      <main className="mdoc">
        <div className="mdoc-frame mdoc-header">{header}</div>

        <article className="mdoc-frame mdoc-article pdoc pdoc-longform">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 id={slugify(children)} className="pdoc-h1">{children}</h1>,
              h2: ({ children }) => <h2 id={slugify(children)} className="pdoc-h2">{children}</h2>,
              h3: ({ children }) => <h3 id={slugify(children)} className="pdoc-h3">{children}</h3>,
              h4: ({ children }) => <h4 id={slugify(children)} className="pdoc-h4">{children}</h4>,
              hr: () => <div className="pdoc-hr" />,
              p: ({ children }) => <p className="pdoc-p">{children}</p>,
              strong: ({ children }) => <strong className="pdoc-strong">{children}</strong>,
              table: ({ children }) => <table className="pdoc-table">{children}</table>,
              blockquote: ({ children }) => <blockquote className="pdoc-bq">{children}</blockquote>,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>

        <nav className="mdoc-frame mdoc-footnav">
          <Link href={homeHref} className="mdoc-home">a.</Link>
        </nav>
      </main>
    </>
  );
}
