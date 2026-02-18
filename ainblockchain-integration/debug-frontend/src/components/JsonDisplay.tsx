'use client';

import { useState } from 'react';

interface JsonDisplayProps {
  data: unknown;
  label?: string;
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'text-purple-400'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-blue-400'; // key
        } else {
          cls = 'text-green-400'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-yellow-400'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-red-400'; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export default function JsonDisplay({ data, label }: JsonDisplayProps) {
  const [copied, setCopied] = useState(false);

  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = jsonStr;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const highlighted = syntaxHighlight(jsonStr);

  return (
    <div className="relative">
      {label && (
        <p className="text-xs text-gray-500 mb-2">{label}</p>
      )}
      <div className="relative bg-gray-950 border border-gray-800 rounded-lg">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 text-xs text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre
          className="p-3 pt-8 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
