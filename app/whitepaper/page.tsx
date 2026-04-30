import MarkdownDoc from '../components/MarkdownDoc';

export default function WhitepaperPage() {
  return (
    <MarkdownDoc
      src="/docs/Whitepaper.md"
      header="the whitepaper. the protocol, the argument, the lineage."
      homeHref="/"
      numbered
    />
  );
}
