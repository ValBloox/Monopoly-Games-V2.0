import React, { useEffect } from "react";
import axios from "axios";
import { HeroToken, Bendera } from "../game/svg";
import { TOKEN_OPTIONS } from "../game/data";

const API = `${process.env.REACT_APP_BACKEND_URL || "http://localhost:8000"}/api`;

export default function Victory({ winner, stats, onMenu, onPlayAgain }) {
  const tok = TOKEN_OPTIONS[winner.tokenId];
  useEffect(() => {
    // record to leaderboard (fire and forget)
    axios.post(`${API}/leaderboard`, {
      name: winner.name,
      mode: stats.mode || "KEMERDEKAAN",
      rounds: stats.round || 0,
      money: stats.money || 0,
      properties_count: stats.props || 0,
      correct_answers: stats.correctAnswers || 0,
    }).catch(() => {});
  }, [winner, stats]);
  return (
    <div className="screen victory" data-testid="victory-screen">
      <div className="victory-bg" />
      <div className="confetti">
        {[...Array(40)].map((_, i) => (
          <span key={i} className={`confetto ${i % 2 ? "merah" : "putih"}`} style={{ left: `${(i * 2.5) % 100}%`, animationDelay: `${(i % 10) * 0.2}s` }} />
        ))}
      </div>
      <div className="victory-content">
        <div className="victory-bendera"><Bendera size={140} /></div>
        <h1 className="victory-title">INDONESIA MERDEKA!</h1>
        <div className="victory-token"><HeroToken color={tok.color} tokenId={winner.tokenId} size={80} /></div>
        <div className="victory-name">"{winner.name}"</div>
        <div className="victory-sub">telah memproklamasikan kemerdekaan!</div>

        <div className="victory-stats">
          <div className="stats-title">═══ RINGKASAN PERTANDINGAN ═══</div>
          <div>Ronde dimainkan: <b>{stats.round}</b></div>
          <div>Total ORI: <b>{stats.money}</b></div>
          <div>Properti dikuasai: <b>{stats.props}</b></div>
          <div>Soal kuis benar: <b>{stats.correctAnswers}/3</b></div>
          {stats.facts && stats.facts.length > 0 && (
            <>
              <div className="stats-title" style={{ marginTop: 10 }}>═══ FAKTA YANG KAMU PELAJARI ═══</div>
              {stats.facts.slice(0, 5).map((f, i) => (<div key={i} className="fact-line">• {f}</div>))}
            </>
          )}
        </div>

        <div className="victory-actions">
          <button className="btn btn-primary" data-testid="victory-again-btn" onClick={onPlayAgain}>MAIN LAGI</button>
          <button className="btn btn-outline" data-testid="victory-menu-btn" onClick={onMenu}>MENU UTAMA</button>
        </div>
      </div>
    </div>
  );
}
