import React from 'react';

function parseInlineTokens(text: string, variant: 'light' | 'dark'): React.ReactNode[] {
  // Split on **bold**, `code`, or *italic*
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong
          key={idx}
          className={variant === 'dark' ? 'font-bold text-white' : 'font-bold text-stone-950'}
        >
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className={
            variant === 'dark'
              ? 'px-1.5 py-0.5 mx-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold'
              : 'px-1.5 py-0.5 mx-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300/70 font-mono text-[11px] font-bold'
          }
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className={variant === 'dark' ? 'italic text-slate-300' : 'italic text-stone-600'}>
          {token.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

export function renderRichAiMessage(text: string, variant: 'light' | 'dark' = 'light'): React.ReactNode {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-left">
      {lines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal rule ---
        if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
          return (
            <hr
              key={idx}
              className={variant === 'dark' ? 'border-slate-700/80 my-2' : 'border-stone-200 my-2'}
            />
          );
        }

        // Headings ### / ## / #
        const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          const title = headingMatch[2];
          return (
            <h5
              key={idx}
              className={
                variant === 'dark'
                  ? 'text-[13px] font-extrabold text-amber-300 pt-1 tracking-tight'
                  : 'text-[13px] font-extrabold text-amber-950 pt-1 tracking-tight'
              }
            >
              {parseInlineTokens(title, variant)}
            </h5>
          );
        }

        // Nested or flat bullet points (* , - , • )
        const bulletMatch = rawLine.match(/^(\s*)[-*•]\s+(.+)$/);
        if (bulletMatch) {
          const indentSpaces = bulletMatch[1]?.length || 0;
          const body = bulletMatch[2];
          const isNested = indentSpaces >= 2;
          return (
            <div
              key={idx}
              className={`flex items-start gap-1.5 leading-relaxed ${isNested ? 'pl-4' : 'pl-0.5'}`}
            >
              <span
                className={
                  variant === 'dark'
                    ? `font-bold mt-0.5 shrink-0 ${isNested ? 'text-emerald-400' : 'text-amber-400'}`
                    : `font-bold mt-0.5 shrink-0 ${isNested ? 'text-stone-400' : 'text-amber-700'}`
                }
              >
                {isNested ? '◦' : '•'}
              </span>
              <span className="flex-1">{parseInlineTokens(body, variant)}</span>
            </div>
          );
        }

        // Numbered list item
        const numberedMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 leading-relaxed pl-0.5">
              <span
                className={
                  variant === 'dark'
                    ? 'font-bold text-amber-300 shrink-0'
                    : 'font-bold text-amber-800 shrink-0'
                }
              >
                {numberedMatch[1]}
              </span>
              <span className="flex-1">{parseInlineTokens(numberedMatch[2], variant)}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {parseInlineTokens(rawLine, variant)}
          </p>
        );
      })}
    </div>
  );
}
