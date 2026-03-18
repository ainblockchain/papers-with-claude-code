'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVillageStore } from '@/stores/useVillageStore';
import { X, Send, Loader2, Brain, AlertTriangle, Wallet, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBaseX402Fetch, getBaseUsdcBalance } from '@/lib/payment/base-x402-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatChainAmount } from '@/lib/payment/chains';

interface AgentCard {
  name?: string;
  description?: string;
  skills?: Array<{ id: string; name: string; description?: string }>;
  url?: string;
  provider?: { organization?: string };
}

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  txHash?: string;
}

/** Extract txHash from the base64-encoded PAYMENT-RESPONSE header */
function extractTxHash(res: Response): string | undefined {
  const header =
    res.headers.get('PAYMENT-RESPONSE') || res.headers.get('X-PAYMENT-RESPONSE');
  if (!header) return undefined;
  try {
    const decoded = JSON.parse(atob(header));
    return decoded.transaction || decoded.txHash || undefined;
  } catch {
    return undefined;
  }
}

export function CogitoDialog() {
  const { cogitoDialogOpen, setCogitoDialogOpen } = useVillageStore();
  const [agentCard, setAgentCard] = useState<AgentCard | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [contextId, setContextId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check passkey on open
  useEffect(() => {
    if (!cogitoDialogOpen) return;
    setHasPasskey(!!useAuthStore.getState().passkeyInfo?.publicKey);
  }, [cogitoDialogOpen]);

  // Fetch A2A agent card via our API proxy (avoids CORS)
  useEffect(() => {
    if (!cogitoDialogOpen) return;
    setCardLoading(true);
    setCardError(null);
    fetch('/api/cogito-chat')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((card) => setAgentCard(card))
      .catch((err) => setCardError(err.message))
      .finally(() => setCardLoading(false));
  }, [cogitoDialogOpen]);

  // Fetch Base USDC balance on open
  useEffect(() => {
    if (!cogitoDialogOpen) return;
    getBaseUsdcBalance()
      .then((result) => {
        if (result) setBalance(result.formatted);
      })
      .catch(() => {});
  }, [cogitoDialogOpen]);

  // Focus input on open
  useEffect(() => {
    if (cogitoDialogOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [cogitoDialogOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    if (!cogitoDialogOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCogitoDialogOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cogitoDialogOpen, setCogitoDialogOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSendError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: Date.now() }]);
    setSending(true);

    try {
      const fetchBody = JSON.stringify({ message: text, contextId });
      const fetchOpts: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: fetchBody,
      };

      // Step 1: initial request (will return 402)
      let res = await fetch('/api/cogito-chat', fetchOpts);

      // Step 2: handle 402 — sign x402 payment on Base and retry
      if (res.status === 402) {
        const x402FetchFn = createBaseX402Fetch();
        if (!x402FetchFn) {
          throw new Error('Register a passkey first to enable x402 payments on Base.');
        }

        // Use the Base x402 client which auto-handles 402 → sign → retry
        res = await x402FetchFn('/api/cogito-chat', fetchOpts);

        // If still 402 after payment attempt, payment verification failed
        if (res.status === 402) {
          throw new Error('Payment verification failed. Check your USDC balance on Base.');
        }
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let errMsg = `Server error (${res.status})`;
        try {
          const errBody = JSON.parse(errText);
          errMsg = errBody.details
            ? `${errBody.error}: ${errBody.details}`
            : errBody.error || errBody.message || errMsg;
        } catch { /* use default */ }
        throw new Error(errMsg);
      }

      // Step 3: parse response — use text() for robustness
      const txHash = extractTxHash(res);
      const responseText = await res.text();
      let reply: string;
      try {
        const data = JSON.parse(responseText);
        reply = data.reply || data.response || data.content || JSON.stringify(data);
        // Preserve A2A context for conversation continuity
        if (data.contextId) setContextId(data.contextId);
      } catch {
        reply = responseText || 'Empty response from Cogito.';
      }

      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: reply, timestamp: Date.now(), txHash },
      ]);

      // Refresh balance after payment
      getBaseUsdcBalance()
        .then((result) => {
          if (result) setBalance(result.formatted);
        })
        .catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  if (!cogitoDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-teal-700/50 rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-teal-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {agentCard?.name || 'Cogito'}
              </h3>
              <p className="text-[10px] text-teal-400 font-mono">
                Knowledge Agent &middot; A2A
              </p>
            </div>
          </div>
          <button
            onClick={() => setCogitoDialogOpen(false)}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Agent Card Info */}
        {cardLoading && (
          <div className="p-3 flex items-center gap-2 text-xs text-gray-400 border-b border-teal-900/30">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading agent card...
          </div>
        )}
        {cardError && (
          <div className="p-3 text-xs text-yellow-400 border-b border-teal-900/30">
            Agent card unavailable: {cardError}
          </div>
        )}
        {agentCard && !cardLoading && (
          <div className="p-3 border-b border-teal-900/30 space-y-1">
            {agentCard.description && (
              <p className="text-xs text-gray-400">{agentCard.description}</p>
            )}
            {agentCard.skills && agentCard.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {agentCard.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2 py-0.5 rounded-full bg-teal-500/10 text-[10px] text-teal-300 border border-teal-500/20"
                    title={skill.description}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* x402 Base Payment Info */}
        <div className="px-3 py-2 bg-blue-500/5 border-b border-blue-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <p className="text-[10px] text-blue-300">
              {formatChainAmount('base', 'stageUnlock')} per message &middot; Base x402
            </p>
          </div>
          {balance !== null && (
            <span className="text-[10px] font-mono text-gray-400">
              {balance} USDC
            </span>
          )}
        </div>

        {/* No passkey warning */}
        {!hasPasskey && (
          <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-[10px] text-amber-300">
              Register a passkey to enable x402 payments on Base.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {messages.length === 0 && (
            <div className="text-center text-xs text-gray-500 py-8">
              <Brain className="h-8 w-8 mx-auto mb-2 text-teal-500/30" />
              <p>Ask Cogito about papers, research, or publication guides.</p>
              <p className="text-[10px] mt-1 text-gray-600">Each message is settled on Base via x402</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-teal-600/30 text-white'
                    : 'bg-[#16162a] text-gray-300 border border-teal-900/30'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.txHash && (
                  <a
                    href={`https://basescan.org/tx/${msg.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 mt-1 font-mono"
                  >
                    tx: {msg.txHash.slice(0, 10)}...
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-[#16162a] border border-teal-900/30 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Paying &amp; querying Cogito...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {sendError && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400 flex-1">{sendError}</p>
            <button
              onClick={() => setSendError(null)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-teal-900/50 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleSend();
              }
            }}
            placeholder={hasPasskey ? 'Ask Cogito something...' : 'Register passkey to chat'}
            className="flex-1 bg-[#16162a] border border-teal-900/30 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
            disabled={sending || !hasPasskey}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !input.trim() || !hasPasskey}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Footer attribution */}
        <div className="px-3 pb-2 flex items-center justify-center gap-1">
          <p className="text-[9px] text-gray-600">
            Built with <span className="text-teal-500">Claude Code</span> &middot; x402 protocol
          </p>
        </div>
      </div>
    </div>
  );
}
