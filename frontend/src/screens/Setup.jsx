import React, { useState } from "react";
import audio from "../game/audio";
import { HeroToken, PawnToken } from "../game/svg";
import { TOKEN_OPTIONS } from "../game/data";
import { Switch } from "../components/ui/switch";

export default function Setup({ onStart, onBack, musicOn, setMusicOn, sfxOn, setSfxOn, factsOn, setFactsOn }) {
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState([
    { name: "", tokenId: 0 },
    { name: "", tokenId: 1 },
    { name: "", tokenId: 2 },
    { name: "", tokenId: 3 },
  ]);
  const [mode, setMode] = useState("KEMERDEKAAN");
  const [pieceStyle, setPieceStyle] = useState("human");

  const setPlayer = (i, key, val) => {
    setPlayers((prev) => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p));
  };

  const usedTokens = new Set(players.slice(0, count).map((p) => p.tokenId));
  const canStart = players.slice(0, count).every((p) => p.name.trim().length > 0)
    && new Set(players.slice(0, count).map(p => p.tokenId)).size === count;

  const start = () => {
    if (!canStart) return;
    audio.stamp();
    onStart({
      players: players.slice(0, count).map((p) => ({ ...p, name: p.name.trim() })),
      mode,
      pieceStyle,
    });
  };

  return (
    <div className="screen setup" data-testid="setup-screen">
      <div className="setup-inner">
        <button className="btn-back" data-testid="setup-back-btn" onClick={onBack}>← Kembali</button>
        <h2 className="setup-title">Berapa Pejuang Merdeka?</h2>
        <div className="player-count-row">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              className={`count-btn ${count === n ? "active" : ""}`}
              data-testid={`setup-count-${n}`}
              onClick={() => { audio.cardFlip(); setCount(n); }}
            >
              <div className="count-num">{n}</div>
              <div className="count-lbl">orang</div>
            </button>
          ))}
        </div>

        <h3 className="setup-sub">Nama & Token</h3>
        <div className="players-config">
          {players.slice(0, count).map((p, i) => (
            <div key={i} className="player-row" data-testid={`player-row-${i}`}>
              <div className="player-no">Pemain {i + 1}</div>
              <input
                className="name-input"
                data-testid={`player-name-${i}`}
                placeholder={`Nama Pejuang... (${TOKEN_OPTIONS[p.tokenId].default})`}
                value={p.name}
                onChange={(e) => setPlayer(i, "name", e.target.value)}
              />
              <div className="token-picker">
                {TOKEN_OPTIONS.map((t) => {
                  const taken = usedTokens.has(t.id) && p.tokenId !== t.id;
                  return (
                    <button
                      key={t.id}
                      className={`token-btn ${p.tokenId === t.id ? "selected" : ""} ${taken ? "taken" : ""}`}
                      data-testid={`token-${i}-${t.id}`}
                      disabled={taken}
                      onClick={() => { audio.cardFlip(); setPlayer(i, "tokenId", t.id); }}
                    >
                      {pieceStyle === "human" ? <HeroToken color={t.color} tokenId={t.id} size={32} /> : <PawnToken color={t.color} size={32} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <h3 className="setup-sub">Bentuk Pemain</h3>
        <div className="mode-row">
          <button
            className={`mode-card ${pieceStyle === "human" ? "active" : ""}`}
            data-testid="setup-style-human"
            onClick={() => { audio.cardFlip(); setPieceStyle("human"); }}
          >
            <div className="mode-title">Karakter Manusia</div>
            <div className="mode-desc"><HeroToken color="#5B1818" tokenId={0} size={34} /> Tokoh manusia.</div>
          </button>
          <button
            className={`mode-card ${pieceStyle === "pawn" ? "active" : ""}`}
            data-testid="setup-style-pawn"
            onClick={() => { audio.cardFlip(); setPieceStyle("pawn"); }}
          >
            <div className="mode-title">Pion</div>
            <div className="mode-desc"><PawnToken color="#2C3E50" size={34} /> Pion klasik.</div>
          </button>
        </div>

        <h3 className="setup-sub">Pilih Mode</h3>
        <div className="mode-row">
          <button
            className={`mode-card ${mode === "KLASIK" ? "active" : ""}`}
            data-testid="setup-mode-klasik"
            onClick={() => { audio.cardFlip(); setMode("KLASIK"); }}
          >
            <div className="mode-title">Mode Klasik</div>
            <div className="mode-desc">Buat semua lawan bangkrut.</div>
            <div className="mode-tag">Untuk Veteran</div>
          </button>
          <button
            className={`mode-card kemerdekaan ${mode === "KEMERDEKAAN" ? "active" : ""}`}
            data-testid="setup-mode-kemerdekaan"
            onClick={() => { audio.cardFlip(); setMode("KEMERDEKAAN"); }}
          >
            <div className="mode-badge">DIREKOMENDASIKAN</div>
            <div className="mode-title">Mode Kemerdekaan</div>
            <div className="mode-desc">Kuasai wilayah, bangun Benteng Republik, jawab Tantangan Sejarah — lalu Proklamasikan Kemerdekaan!</div>
          </button>
        </div>

        <div className="opt-toggles">
          <label className="toggle-row"><span>Musik Latar</span><Switch checked={musicOn} onCheckedChange={setMusicOn} /></label>
          <label className="toggle-row"><span>Efek Suara</span><Switch checked={sfxOn} onCheckedChange={setSfxOn} /></label>
          <label className="toggle-row"><span>Tampilkan Fakta Sejarah</span><Switch checked={factsOn} onCheckedChange={setFactsOn} /></label>
        </div>

        <button
          className="btn btn-primary btn-large"
          data-testid="setup-start-btn"
          disabled={!canStart}
          onClick={start}
        >
          MULAI PERJUANGAN!
        </button>
      </div>
    </div>
  );
}
