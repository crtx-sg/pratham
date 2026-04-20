"""Unified LLM client — picks Gemini or Claude based on available env vars."""
import os


def has_llm():
    """Returns True if either Gemini or Anthropic API key is configured."""
    gem = os.getenv("GEMINI_API_KEY", "").strip()
    ant = os.getenv("ANTHROPIC_API_KEY", "").strip()
    return bool(gem) or (bool(ant) and ant != "your_key_here")


def complete(system_prompt: str, user_content: str, max_tokens: int = 1024) -> str:
    """
    Send system prompt + user content, get plain text response back.
    Prefers Gemini if GEMINI_API_KEY is set; falls back to Anthropic.
    Raises Exception on failure — caller should handle.
    """
    gem_key = os.getenv("GEMINI_API_KEY", "").strip()
    ant_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if gem_key:
        return _gemini_complete(gem_key, system_prompt, user_content, max_tokens)
    if ant_key and ant_key != "your_key_here":
        return _anthropic_complete(ant_key, system_prompt, user_content, max_tokens)
    raise RuntimeError("No LLM API key configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)")


def _gemini_complete(api_key: str, system_prompt: str, user_content: str, max_tokens: int) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    response = client.models.generate_content(
        model=model,
        contents=user_content,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
            temperature=0.3,
        ),
    )
    return response.text or ""


def _anthropic_complete(api_key: str, system_prompt: str, user_content: str, max_tokens: int) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
    )
    return response.content[0].text
