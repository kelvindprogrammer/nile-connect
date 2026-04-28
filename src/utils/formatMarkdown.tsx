import React from 'react';

// Pre-process text: strip/convert HTML tags to markdown equivalents
function preprocessText(raw: string): string {
    return raw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
        .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '## $1\n')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n'); // Collapse excessive newlines
}

function renderInline(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={i} className="font-black text-current">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            return <code key={i} className="bg-black/10 px-1 rounded text-[0.9em] font-mono">{part.slice(1, -1)}</code>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
    });
}

export function formatMarkdown(text: string, className?: string): React.ReactNode {
    if (!text) return null;

    const clean = preprocessText(text);
    const lines = clean.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: string[] = [];
    let listType: 'ul' | 'ol' = 'ul';

    const flushList = () => {
        if (listBuffer.length === 0) return;
        const Tag = listType === 'ul' ? 'ul' : 'ol';
        elements.push(
            <Tag key={`list-${elements.length}`} className={`space-y-1.5 my-2 ${listType === 'ol' ? 'ml-4' : 'ml-2'}`}>
                {listBuffer.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                        {listType === 'ul'
                            ? <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-current opacity-40 flex-shrink-0" />
                            : <span className="font-black text-current opacity-50 flex-shrink-0 min-w-[1.2em]">{i + 1}.</span>
                        }
                        <span className="leading-relaxed">{renderInline(item)}</span>
                    </li>
                ))}
            </Tag>
        );
        listBuffer = [];
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('### ')) {
            flushList();
            elements.push(
                <h4 key={i} className="font-black text-current text-sm mt-3 mb-1 pb-0.5 border-b border-current/10 uppercase tracking-tight">
                    {renderInline(trimmed.slice(4))}
                </h4>
            );
        } else if (trimmed.startsWith('## ')) {
            flushList();
            elements.push(
                <h3 key={i} className="font-black text-current text-base mt-4 mb-1.5 uppercase tracking-tighter">
                    {renderInline(trimmed.slice(3))}
                </h3>
            );
        } else if (trimmed.startsWith('# ')) {
            flushList();
            elements.push(
                <h2 key={i} className="font-black text-current text-lg mt-4 mb-2 uppercase tracking-tighter">
                    {renderInline(trimmed.slice(2))}
                </h2>
            );
        } else if (/^\d+\.\s/.test(trimmed)) {
            listType = 'ol';
            listBuffer.push(trimmed.replace(/^\d+\.\s/, ''));
        } else if (/^[-•*]\s/.test(trimmed)) {
            listType = 'ul';
            listBuffer.push(trimmed.slice(2));
        } else if (!trimmed) {
            flushList();
            if (elements.length > 0 && i < lines.length - 1) {
                elements.push(<div key={`gap-${i}`} className="h-1.5" />);
            }
        } else {
            flushList();
            elements.push(
                <p key={i} className="leading-relaxed">{renderInline(trimmed)}</p>
            );
        }
    });

    flushList();

    return (
        <div className={`text-left space-y-0.5 ${className ?? ''}`}>
            {elements}
        </div>
    );
}
