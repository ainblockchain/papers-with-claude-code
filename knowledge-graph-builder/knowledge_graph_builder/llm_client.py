"""LLM client using OpenAI-compatible API (vLLM, etc.)."""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

import openai

logger = logging.getLogger(__name__)


def get_client(base_url: Optional[str] = None) -> openai.OpenAI:
    """Get an OpenAI-compatible client pointing at the vLLM server.

    The base URL is determined in the following order:
    1. Explicit base_url parameter
    2. VLLM_BASE_URL environment variable

    Raises ValueError if neither is provided.
    Set VLLM_BASE_URL in your .env file for local use.
    """
    if base_url:
        url = base_url
    elif "VLLM_BASE_URL" in os.environ:
        url = os.environ["VLLM_BASE_URL"]
    else:
        raise ValueError(
            "LLM endpoint not configured. "
            "Set the VLLM_BASE_URL environment variable (e.g. in .env)."
        )

    return openai.OpenAI(base_url=url, api_key="unused")


def chat_completion(
    client: openai.OpenAI,
    model: str,
    system: str,
    user: str,
    max_tokens: int = 8192,
    temperature: float = 0.3,
) -> str:
    """Send a chat completion request and return the response text."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": user})

    logger.debug("Sending chat completion request (model=%s, max_tokens=%d)", model, max_tokens)

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )

    text = response.choices[0].message.content
    logger.debug("Got response: %d chars", len(text) if text else 0)
    return text or ""


def parse_json_response(text: str) -> dict:
    """Parse JSON from an LLM response, handling markdown code blocks and truncation."""
    # Strip markdown code fences.  Use rfind for the closing fence because the
    # JSON value itself may contain nested ```python blocks.
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.rfind("```")
        # rfind returns start-region if there's only one fence; fall back to end-of-string
        text = text[start:end].strip() if end > start else text[start:].strip()
    elif "```" in text:
        start = text.index("```") + 3
        end = text.rfind("```")
        text = text[start:end].strip() if end > start else text[start:].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to repair truncated JSON: close open strings and braces
    repaired = _repair_truncated_json(text)
    if repaired:
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass

    logger.error("Failed to parse LLM response as JSON (len=%d)", len(text))
    logger.debug("Response text: %s", text[:500])
    return {}


def _repair_truncated_json(text: str) -> str:
    """Best-effort repair of JSON truncated by max_tokens."""
    text = text.strip()
    if not text.startswith("{"):
        return ""

    # If inside an unterminated string, close it
    # Count unescaped quotes
    in_string = False
    i = 0
    while i < len(text):
        c = text[i]
        if c == "\\" and in_string:
            i += 2  # skip escaped char
            continue
        if c == '"':
            in_string = not in_string
        i += 1

    if in_string:
        text += '"'

    # Close open braces/brackets
    open_braces = text.count("{") - text.count("}")
    open_brackets = text.count("[") - text.count("]")
    text += "]" * max(0, open_brackets)
    text += "}" * max(0, open_braces)

    return text
