"""One-time generator for vintage etching style property illustrations.
Run with: cd /app/backend && python ../scripts/gen_etchings.py
"""
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

OUT = ROOT / "frontend" / "public" / "img" / "etch"
OUT.mkdir(parents=True, exist_ok=True)

PROMPT_BASE = (
    "Vintage 1945 Indonesian historical engraving illustration of {subject}. "
    "Sepia-toned, hand-drawn, etching/woodcut style, cross-hatching, parchment paper background, "
    "no text, no caption, no border, square aspect, centered subject, dignified, monochrome with brown ink. "
    "Style of antique book illustration, fine line art."
)

TARGETS = [
    ("monas", "Monas tugu obelisk Jakarta dengan bendera Indonesia"),
    ("surabaya_monument", "Tugu Pahlawan Surabaya monument"),
    ("istana", "Istana Merdeka Indonesia colonial palace front facade"),
    ("rumah_proklamasi", "rumah Proklamasi Pegangsaan Timur 56 dengan tiang bendera"),
    ("stasiun", "stasiun kereta api kolonial Hindia Belanda dengan lokomotif uap"),
    ("gedung_sate", "Gedung Sate Bandung dengan ornamen tusuk sate di puncak"),
    ("ampera", "Jembatan Ampera Palembang dengan menara"),
    ("hotel_des_indes", "Hotel Des Indes kolonial Batavia"),
    ("kampung", "kampung Jawa rumah joglo tradisional di pedesaan Indonesia"),
    ("pelabuhan", "pelabuhan Tanjung Priok dengan kapal uap dan dermaga"),
    ("balai_kota", "Balai Kota Jakarta gedung kolonial dengan tiang"),
    ("tugu_yogya", "Tugu Pal Putih Yogyakarta"),
    ("rri", "gedung Radio Republik Indonesia dengan menara antena"),
    ("antara", "kantor berita Antara mesin tik tua dan pena"),
    ("ikada", "lapangan Ikada rapat akbar dengan banyak orang dan panggung"),
    ("bppki", "gedung BPPKI dengan kolom-kolom"),
    ("bandung_api", "Bandung Lautan Api kota terbakar"),
    ("rengasdengklok", "rumah Rengasdengklok dengan dua tokoh"),
]


async def gen_one(name: str, subject: str):
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("Missing EMERGENT_LLM_KEY")
        return False
    out_path = OUT / f"{name}.png"
    if out_path.exists():
        print(f"skip {name} (exists)")
        return True
    try:
        chat = LlmChat(api_key=api_key, session_id=f"etch-{name}", system_message="You are an artist that creates vintage engraving illustrations.")
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        prompt = PROMPT_BASE.format(subject=subject)
        msg = UserMessage(text=prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        if not images:
            print(f"No image for {name}: {text[:80] if text else ''}")
            return False
        img = images[0]
        data = base64.b64decode(img["data"])
        out_path.write_bytes(data)
        print(f"OK {name} -> {out_path}")
        return True
    except Exception as e:
        print(f"ERR {name}: {e}")
        return False


async def main():
    sem = asyncio.Semaphore(3)

    async def run(name, subj):
        async with sem:
            await gen_one(name, subj)

    await asyncio.gather(*[run(n, s) for n, s in TARGETS])


if __name__ == "__main__":
    asyncio.run(main())
