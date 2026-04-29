"""Generate the center board artwork for Monopoli Merdeka."""
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

OUT = ROOT / "frontend" / "public" / "img" / "center.png"

PROMPT = (
    "Vintage 1945 Indonesian historical poster illustration. "
    "Centered composition: Monas (Indonesian National Monument obelisk) with golden flame on top. "
    "Large red and white Indonesian flag waving on a wooden pole on the left. "
    "Jakarta skyline background with colonial buildings and church spires. "
    "Dramatic sunrise sky with orange-red gradient. "
    "Sepia-toned, hand-drawn engraving style, parchment paper texture, fine line art with red flag accents. "
    "No text, no caption, no border. Square aspect. Painterly, dignified, heroic mood."
)


async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id="center-art-1", system_message="Vintage poster artist")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"No image: {text[:120] if text else ''}")
        return
    img = images[0]
    OUT.write_bytes(base64.b64decode(img["data"]))
    print(f"OK -> {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
