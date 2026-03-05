'use client';

import { CONFIDENTIAL_CONTENT } from './mockData';

interface ConcreteSectionProps {
  confidential?: boolean;
}

function ConfidentialBlock({ title, subtitle, content }: { title: string; subtitle?: string; content: string }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-[1.1rem] font-normal" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h4>
        {subtitle && (
          <p className="mt-0.5 text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div
        className="text-[0.88rem] leading-relaxed whitespace-pre-line"
        style={{ color: 'var(--text-secondary)' }}
        dangerouslySetInnerHTML={{
          __html: content
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
        }}
      />
    </div>
  );
}

export default function ConcreteSection({ confidential = false }: ConcreteSectionProps) {
  if (!confidential) {
    // Public: no inline concrete content — the docs handle it
    return null;
  }

  return (
    <section className="py-24 sm:py-32 px-8">
      <div className="max-w-2xl mx-auto space-y-16">
        <div className="space-y-4">
          <p className="text-[0.65rem] tracking-widest uppercase" style={{ color: 'var(--text-ghost)' }}>
            Investor Detail
          </p>
          <p className="text-[0.82rem] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
            Technically, Alexandria is an MCP server &mdash; a single connector that plugs into any frontier model. Claude, GPT, Gemini. Model-agnostic by design. The user adds the connector once, and three tool groups become available across every conversation. What follows is the business behind those tools.
          </p>
        </div>

        <ConfidentialBlock {...CONFIDENTIAL_CONTENT.businessModel} />
        <ConfidentialBlock {...CONFIDENTIAL_CONTENT.unitEconomics} />
        <ConfidentialBlock {...CONFIDENTIAL_CONTENT.competitivePosition} />
        <ConfidentialBlock {...CONFIDENTIAL_CONTENT.operatingModel} />
        <ConfidentialBlock {...CONFIDENTIAL_CONTENT.risks} />
        <ConfidentialBlock {...CONFIDENTIAL_CONTENT.founder} />
        <ConfidentialBlock {...CONFIDENTIAL_CONTENT.currentStage} />
      </div>
    </section>
  );
}
