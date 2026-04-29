"""Generate hero portraits for player tokens."""
import asyncio
import base64
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "backend" / ".env")
sys.path.insert(0, str(ROOT / "backend"))

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

OUT = ROOT / "frontend" / "public" / "img" / "heroes"
OUT.mkdir(parents=True, exist_ok=True)

PROMPT_BASE = (
    "Vintage 1945 Indonesian historical portrait of {subject}. "
    "Sepia-toned hand-drawn engraving style, oval framed bust portrait, "
    "dignified heroic expression, traditional Indonesian attire, "
    "antique book illustration, fine cross-hatching, parchment background, "
    "no text, no caption, centered subject, brown ink monochrome with subtle red accent. "
    "Square aspect ratio, head and shoulders only."
)

TARGETS = [
    ("soekarno", "President Soekarno wearing peci hat, Indonesian founding father, mid-30s, charismatic"),
    ("hatta", "Mohammad Hatta wearing glasses and suit, Indonesian Vice President, calm intellectual"),
    ("cutnyak", "Cut Nyak Dien Acehnese woman warrior, traditional headscarf, fierce determined expression"),
    ("diponegoro", "Prince Diponegoro Javanese warrior, traditional turban (sorban), dignified noble face"),
]


async def gen_one(name, subject):
    api_key = os.getenv("EMERGENT_LLM_KEY")
    out = OUT / f"{name}.png"
    if out.exists():
        print(f"skip {name}")
        return
    chat = LlmChat(api_key=api_key, session_id=f"hero-{name}", system_message="Vintage portrait artist")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=PROMPT_BASE.format(subject=subject))
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"FAIL {name}: {text[:80]}")
        return
    out.write_bytes(base64.b64decode(images[0]["data"]))
    print(f"OK {name}")


async def main():
    await asyncio.gather(*[gen_one(n, s) for n, s in TARGETS])


if __name__ == "__main__":
    asyncio.run(main())
