import React from "react";
import audio from "../game/audio";
import { Switch } from "../components/ui/switch";

export default function Menu({ onPlay, onHowTo, musicOn, setMusicOn, sfxOn, setSfxOn }) {
  return (
    <div className="screen menu" data-testid="menu-screen">
      <div className="papan-pengumuman">
        <span className="paku tl" /><span className="paku tr" />
        <span className="paku bl" /><span className="paku br" />
        <h1 className="menu-title">Papan Pengumuman</h1>
        <p className="menu-sub">Pilih perjalananmu, Pejuang.</p>
        <div className="menu-buttons">
          <button className="btn btn-primary" data-testid="menu-play-btn" onClick={() => { audio.stamp(); onPlay(); }}>
            MULAI BERMAIN
          </button>
          <button className="btn btn-outline" data-testid="menu-howto-btn" onClick={() => { audio.cardFlip(); onHowTo(); }}>
            CARA BERMAIN
          </button>
          <div className="menu-toggles">
            <label className="toggle-row" data-testid="menu-music-toggle">
              <span>Musik Latar</span>
              <Switch checked={musicOn} onCheckedChange={setMusicOn} />
            </label>
            <label className="toggle-row" data-testid="menu-sfx-toggle">
              <span>Efek Suara</span>
              <Switch checked={sfxOn} onCheckedChange={setSfxOn} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
