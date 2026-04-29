import { useEffect, useState } from "react";
import "./App.css";
import Splash from "./screens/Splash";
import Menu from "./screens/Menu";
import Setup from "./screens/Setup";
import Board from "./screens/Board";
import Victory from "./screens/Victory";
import HowToPlay from "./screens/HowToPlay";
import audio from "./game/audio";

function App() {
  const [screen, setScreen] = useState("splash");
  const [showHowTo, setShowHowTo] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);
  const [winner, setWinner] = useState(null);
  const [stats, setStats] = useState(null);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [factsOn, setFactsOn] = useState(true);

  useEffect(() => {
    const onFirstClick = () => {
      audio.init();
      if (musicOn) audio.startMusic();
      window.removeEventListener("pointerdown", onFirstClick);
    };
    window.addEventListener("pointerdown", onFirstClick);
    return () => window.removeEventListener("pointerdown", onFirstClick);
  }, [musicOn]);

  useEffect(() => { audio.setMusic(musicOn); }, [musicOn]);
  useEffect(() => { audio.setSfx(sfxOn); }, [sfxOn]);

  return (
    <div className="App" data-testid="app-root">
      {screen === "splash" && (
        <Splash onContinue={() => setScreen("menu")} />
      )}
      {screen === "menu" && (
        <Menu
          onPlay={() => setScreen("setup")}
          onHowTo={() => setShowHowTo(true)}
          musicOn={musicOn}
          setMusicOn={setMusicOn}
          sfxOn={sfxOn}
          setSfxOn={setSfxOn}
        />
      )}
      {screen === "setup" && (
        <Setup
          onBack={() => setScreen("menu")}
          onStart={(cfg) => { setGameConfig(cfg); setScreen("board"); }}
          musicOn={musicOn}
          setMusicOn={setMusicOn}
          sfxOn={sfxOn}
          setSfxOn={setSfxOn}
          factsOn={factsOn}
          setFactsOn={setFactsOn}
        />
      )}
      {screen === "board" && gameConfig && (
        <Board
          config={gameConfig}
          factsOn={factsOn}
          onWin={(w, s) => { setWinner(w); setStats(s); setScreen("victory"); }}
          onQuit={() => setScreen("menu")}
        />
      )}
      {screen === "victory" && winner && (
        <Victory
          winner={winner}
          stats={stats}
          onMenu={() => setScreen("menu")}
          onPlayAgain={() => setScreen("setup")}
        />
      )}
      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
    </div>
  );
}

export default App;
