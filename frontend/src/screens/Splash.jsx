import React, { useEffect } from "react";
import audio from "../game/audio";
import { BatikCorner, FlagWave } from "../game/svg";

export default function Splash({ onContinue }) {
  useEffect(() => {
    const t = setTimeout(() => {}, 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="screen splash" data-testid="splash-screen">
      <div className="batik-corner tl"><BatikCorner size={120} /></div>
      <div className="batik-corner tr" style={{ transform: "scaleX(-1)" }}><BatikCorner size={120} /></div>
      <div className="batik-corner bl" style={{ transform: "scaleY(-1)" }}><BatikCorner size={120} /></div>
      <div className="batik-corner br" style={{ transform: "scale(-1,-1)" }}><BatikCorner size={120} /></div>
      <div className="splash-flag"><FlagWave /></div>
      <div className="splash-logo">
        <div className="logo-monopoli">MONOPOLI</div>
        <div className="logo-merdeka">MERDEKA</div>
        <div className="logo-year">1945</div>
      </div>
      <div className="splash-tag">Permainan Sejarah Kemerdekaan Indonesia</div>
      <button
        className="btn btn-primary btn-pulse splash-btn"
        data-testid="splash-start-btn"
        onClick={() => { audio.stamp(); onContinue(); }}
      >
        MULAI BERMAIN
      </button>
    </div>
  );
}
