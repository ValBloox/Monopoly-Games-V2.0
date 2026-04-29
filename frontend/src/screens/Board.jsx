import React, { useEffect, useMemo, useRef, useState } from "react";
import { BOARD, CELL_HISTORY_META, GROUP_COLORS, PROPERTY_FACTS, QUIZ_BANK, TOKEN_OPTIONS } from "../game/data";
import { createInitialState, ownerOf, computeRent, groupComplete, hasAnyCompleteGroup, hasBenteng } from "../game/state";
import audio from "../game/audio";
import { Bendera, FlagWave, Garuda, PropertyIllustration, HeroToken, PawnToken, MoneyNoteAsset } from "../game/svg";
import Dice3D from "../components/Dice3D";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Compute grid position (col, row) for cell index, using 12x12 grid.
// Corners: 0 (BL), 11 (BR), 22 (TR), 33 (TL)
const gridPos = (id) => {
  if (id <= 11) return { col: 1 + id, row: 12 };
  if (id <= 22) return { col: 12, row: 12 - (id - 11) };
  if (id <= 33) return { col: 12 - (id - 22), row: 1 };
  return { col: 1, row: 1 + (id - 33) };
};

const sideOf = (id) => {
  const c = BOARD[id];
  return c.side;
};

export default function Board({ config, factsOn, onWin, onQuit }) {
  const pieceStyle = config.pieceStyle || "human";
  const [state, setState] = useState(() => createInitialState(config.players, config.mode));
  const [diceAnim, setDiceAnim] = useState(false);
  const [diceShown, setDiceShown] = useState([1, 1]);
  const [diceTotalFlash, setDiceTotalFlash] = useState(null);
  const [diceRollToken, setDiceRollToken] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // {type, ...}
  const [hoverCell, setHoverCell] = useState(null);
  const [animatingMove, setAnimatingMove] = useState(false);
  const [movePulse, setMovePulse] = useState(0);
  const [statsTracker, setStatsTracker] = useState({ correctAnswers: 0, facts: new Set() });
  const tokensRef = useRef({});
  const rollLockRef = useRef(false);

  const cur = state.players[state.currentPlayer];
  const alivePlayers = state.players.filter((p) => !p.bankrupt);
  const leftPlayers = alivePlayers.slice(0, Math.ceil(alivePlayers.length / 2));
  const rightPlayers = alivePlayers.slice(Math.ceil(alivePlayers.length / 2));

  const pushToast = (msg, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const randomize = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const buildCellQuizBank = useMemo(() => {
    const properties = BOARD.filter((c) => c.type === "property" || c.type === "railroad");
    const cityPool = [...new Set(Object.values(CELL_HISTORY_META).map((m) => m.city))];
    const yearPool = [...new Set(Object.values(CELL_HISTORY_META).map((m) => m.foundedYear).filter(Boolean))];
    const rolePool = [...new Set(Object.values(CELL_HISTORY_META).map((m) => m.role))];
    const kindPool = [...new Set(Object.values(CELL_HISTORY_META).map((m) => m.kind))];

    const pickDistractors = (pool, answer, n = 3) =>
      randomize(pool.filter((x) => x !== answer)).slice(0, n);
    const bank = {};
    properties.forEach((cell) => {
      const meta = CELL_HISTORY_META[cell.id] || {
        city: "Indonesia",
        era: "sejarah Indonesia",
        foundedYear: null,
        kind: "situs sejarah",
        role: PROPERTY_FACTS[cell.id] || `${cell.name} adalah situs penting sejarah Indonesia.`,
      };
      const fact = PROPERTY_FACTS[cell.id] || meta.role;
      const roleOpts = randomize([meta.role, ...pickDistractors(rolePool, meta.role)]);
      const cityOpts = randomize([meta.city, ...pickDistractors(cityPool, meta.city)]);
      const kindOpts = randomize([meta.kind, ...pickDistractors(kindPool, meta.kind)]);
      const yearAnswer = meta.foundedYear ? String(meta.foundedYear) : "Tidak tercatat pasti";
      const yearOpts = meta.foundedYear
        ? randomize([yearAnswer, ...pickDistractors(yearPool.map(String), yearAnswer)])
        : randomize([yearAnswer, "1945", "1908", "1955"]);
      const eraOpts = randomize([meta.era, "era kerajaan maritim", "masa revolusi fisik 1945-1949", "orde baru"]);

      bank[cell.id] = [
        {
          pertanyaan: `${cell.name} berada di kota mana?`,
          pilihan: cityOpts,
          jawaban: cityOpts.indexOf(meta.city),
          fakta: fact,
        },
        {
          pertanyaan: `Apa peran sejarah utama dari ${cell.name}?`,
          pilihan: roleOpts,
          jawaban: roleOpts.indexOf(meta.role),
          fakta: meta.role,
        },
        {
          pertanyaan: `${cell.name} paling tepat diklasifikasikan sebagai...`,
          pilihan: kindOpts,
          jawaban: kindOpts.indexOf(meta.kind),
          fakta: `${cell.name} termasuk kategori ${meta.kind}.`,
        },
        {
          pertanyaan: `${cell.name} mulai dikenal/didirikan sekitar tahun berapa?`,
          pilihan: yearOpts,
          jawaban: yearOpts.indexOf(yearAnswer),
          fakta: meta.foundedYear
            ? `Data umum menyebut sekitar tahun ${meta.foundedYear}.`
            : `Tahun pendirian ${cell.name} tidak tercatat pasti pada data permainan.`,
        },
        {
          pertanyaan: `${cell.name} paling terkait dengan periode apa dalam narasi sejarah Indonesia?`,
          pilihan: eraOpts,
          jawaban: eraOpts.indexOf(meta.era),
          fakta: `${cell.name} paling relevan dengan ${meta.era}.`,
        },
      ];
    });
    return bank;
  }, []);

  const buildPropertyQuiz = (cell) => {
    const pack = buildCellQuizBank[cell.id] || randomize(QUIZ_BANK).slice(0, 5);
    const pick = pack[Math.floor(Math.random() * pack.length)];
    return {
      question: pick.pertanyaan,
      options: pick.pilihan,
      answer: pick.jawaban,
      fact: pick.fakta,
    };
  };

  const buildRentQuestionChoices = (cellId) => randomize(buildCellQuizBank[cellId] || QUIZ_BANK).slice(0, 3);

  const updatePlayer = (idx, patch) => {
    setState((s) => {
      const players = s.players.map((p, i) => i === idx ? { ...p, ...patch } : p);
      return { ...s, players };
    });
  };

  const log = (msg) => setState((s) => ({ ...s, log: [...s.log, msg].slice(-20) }));

  // Roll dice handler
  const rollDice = async () => {
    if (state.phase !== "ROLL" || animatingMove || diceAnim || rollLockRef.current) return;
    rollLockRef.current = true;
    audio.diceRoll();
    setDiceAnim(true);
    setDiceRollToken((v) => v + 1);
    // Safety unlock: if 3D callback fails for any reason, UI won't get stuck.
    setTimeout(() => {
      if (rollLockRef.current && stateRef.current.phase === "ROLL") {
        rollLockRef.current = false;
        setDiceAnim(false);
      }
    }, 7000);
  };

  const handleDiceRollComplete = (roll) => {
    try {
      setDiceShown(roll);
      setDiceAnim(false);
      const total = roll[0] + roll[1];
      setDiceTotalFlash(total);
      try {
        audio.diceTotal(total);
      } catch (e) {}
      setTimeout(() => setDiceTotalFlash(null), 1500);
      Promise.resolve(afterRoll(roll)).catch(() => {
        rollLockRef.current = false;
      });
    } catch (e) {
      rollLockRef.current = false;
      setDiceAnim(false);
      pushToast("Terjadi kendala saat membaca hasil dadu. Coba lempar lagi.", "peringatan");
    }
  };

  const afterRoll = async (roll) => {
    const total = roll[0] + roll[1];
    const isDouble = roll[0] === roll[1];
    const nextDoublesCount = isDouble ? stateRef.current.doublesCount + 1 : 0;
    setState((s) => ({ ...s, dice: roll, doublesCount: nextDoublesCount }));

    const player = stateRef.current.players[stateRef.current.currentPlayer];

    if (isDouble && nextDoublesCount >= 3) {
      audio.jail();
      pushToast(`${player.name} tiga kali dadu kembar, langsung ke Penjara Digul!`, "bahaya");
      setState((s) => ({
        ...s,
        players: s.players.map((p) => p.id === player.id ? {
          ...p,
          position: 33,
          inJail: true,
          jailTurns: 0,
        } : p),
        phase: "END_TURN",
        doublesCount: 0,
      }));
      rollLockRef.current = false;
      return;
    }

    // jail handling
    if (player.inJail) {
      if (isDouble) {
        pushToast(`${player.name} keluar penjara dengan dadu kembar!`, "sukses");
        updatePlayer(player.id, { inJail: false, jailTurns: 0 });
      } else {
        const newTurns = player.jailTurns + 1;
        if (newTurns >= 3) {
          if (player.money >= 50) {
            updatePlayer(player.id, { inJail: false, jailTurns: 0, money: player.money - 50 });
            pushToast(`${player.name} bayar tebusan ORI 50, keluar penjara.`, "info");
          } else {
            pushToast(`${player.name} tidak punya cukup ORI untuk tebusan!`, "bahaya");
          }
        } else {
          updatePlayer(player.id, { jailTurns: newTurns });
          pushToast(`${player.name} masih di penjara (giliran ${newTurns}/3).`, "peringatan");
          setState((s) => ({ ...s, phase: "END_TURN" }));
          rollLockRef.current = false;
          return;
        }
      }
    }

    await moveSteps(player.id, total);
    landOnCell(player.id);
    rollLockRef.current = false;
  };

  const moveSteps = async (pid, steps) => {
    setAnimatingMove(true);
    for (let i = 0; i < steps; i++) {
      await wait(240);
      audio.step();
      setMovePulse((v) => v + 1);
      // Compute outside updater to avoid StrictMode double-side-effects
      const before = stateRef.current.players[pid].position;
      const after = (before + 1) % BOARD.length;
      const passedStart = after === 0;
      if (passedStart) audio.coin();
      setState((s) => ({
        ...s,
        players: s.players.map((p) => p.id === pid ? { ...p, position: after, money: p.money + (passedStart ? 200 : 0) } : p),
      }));
    }
    await wait(180);
    audio.land();
    setAnimatingMove(false);
  };

  const teleport = async (pid, cellId, collectStart) => {
    setState((s) => {
      const players = s.players.map((p) => {
        if (p.id !== pid) return p;
        let money = p.money;
        if (collectStart && cellId < p.position) { money += 200; audio.coin(); }
        return { ...p, position: cellId, money };
      });
      return { ...s, players };
    });
    await wait(300);
  };

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const landOnCell = (pid) => {
    // Wait one tick so React has committed previous setStates from moveSteps
    setTimeout(() => {
      const s = stateRef.current;
      const player = s.players[pid];
      const cell = BOARD[player.position];

      if (PROPERTY_FACTS[cell.id] && factsOn) {
        setStatsTracker((t) => {
          const facts = new Set(t.facts);
          facts.add(PROPERTY_FACTS[cell.id]);
          return { ...t, facts };
        });
      }

      // Compute resolution (pure)
      let patch = null;
      let nextPhase = "ACTION";
      let toast = null;
      let sfx = null;

      if (cell.type === "corner") {
        if (cell.id === 33) {
          nextPhase = "END_TURN";
          toast = { msg: "Berkunjung di Penjara Digul. Aman.", kind: "info" };
        } else if (cell.id === 11) {
          toast = { msg: "Langsung ke Penjara Digul!", kind: "bahaya" };
          sfx = "jail";
          patch = (st) => ({ ...st, players: st.players.map((p) => p.id === pid ? { ...p, position: 33, inJail: true, jailTurns: 0 } : p), phase: "END_TURN" });
        } else if (cell.id === 22) {
          const pot = s.freeParkingPot || 0;
          if (pot > 0) {
            toast = { msg: `${player.name} mengambil ORI ${pot} dari Parkir Merdeka!`, kind: "sukses" };
            patch = (st) => ({
              ...st,
              players: st.players.map((p) => p.id === pid ? { ...p, money: p.money + pot } : p),
              freeParkingPot: 0,
              phase: "END_TURN",
            });
          } else {
            toast = { msg: "Parkir Merdeka. Belum ada pot yang terkumpul.", kind: "info" };
            nextPhase = "END_TURN";
          }
        } else if (cell.id === 0) {
          nextPhase = "END_TURN";
        }
      } else if (cell.type === "tax") {
        const owe = cell.amount;
        sfx = "payRent";
        toast = { msg: `${player.name} bayar ${cell.name} ORI ${owe}.`, kind: "peringatan" };
        patch = (st) => ({
          ...st,
          players: st.players.map((p) => p.id === pid ? { ...p, money: p.money - owe } : p),
          freeParkingPot: (st.freeParkingPot || 0) + owe,
          phase: "END_TURN",
        });
      } else if (cell.type === "chance" || cell.type === "community") {
        drawCard(pid, cell.type === "chance" ? "proklamasi" : "bhinneka");
        return; // drawCard handles its own state
      } else if (cell.type === "property" || cell.type === "railroad") {
        const owner = ownerOf(s, cell.id);
        if (!owner) {
          nextPhase = "ACTION_BUY";
        } else if (owner.id === pid) {
          const level = owner.buildings[cell.id] || 0;
          if (cell.type === "property" && groupComplete(s, owner, cell.group) && level < 3) {
            nextPhase = "ACTION_BUILD";
          } else {
            nextPhase = "END_TURN";
          }
        } else {
          const rent = computeRent(s, owner, cell);
          setModal({
            type: "rentQuizPick",
            ownerId: owner.id,
            targetId: pid,
            cellId: cell.id,
            rent,
            questions: buildRentQuestionChoices(cell.id),
          });
          return;
        }
      }

      // Apply side effects ONCE
      if (sfx === "jail") audio.jail();
      else if (sfx === "payRent") audio.payRent();
      if (toast) pushToast(toast.msg, toast.kind);

      // Commit state ONCE
      if (patch) {
        setState(patch);
      } else {
        setState((st) => ({ ...st, phase: nextPhase }));
      }
    }, 200);
  };

  const drawCard = (pid, deck) => {
    const top = stateRef.current.cards[deck][0];
    audio.cardFlip();
    setState((s) => ({
      ...s,
      cards: { ...s.cards, [deck]: [...s.cards[deck].slice(1), top] },
    }));
    setModal({ type: "card", deck, card: top, pid });
  };

  const applyCardAction = async (pid, action) => {
    // Pre-compute side effects once
    let sfx = null;
    switch (action.type) {
      case "money": sfx = action.amount > 0 ? "coin" : "payRent"; break;
      case "jail": sfx = "jail"; break;
      default: break;
    }
    if (sfx === "coin") audio.coin();
    else if (sfx === "payRent") audio.payRent();
    else if (sfx === "jail") audio.jail();

    setState((s) => {
      let players = [...s.players];
      const idx = pid;
      const p = { ...players[idx] };
      switch (action.type) {
        case "money": p.money += action.amount; break;
        case "move": {
          let pos = (p.position + action.steps + BOARD.length) % BOARD.length;
          if (action.steps > 0 && pos < p.position) p.money += 200;
          p.position = pos; break;
        }
        case "goto": {
          if (action.collectStart && action.cell < p.position) p.money += 200;
          p.position = action.cell; break;
        }
        case "jail": p.position = 33; p.inJail = true; p.jailTurns = 0; break;
        case "jailfree": p.jailFreeCards = (p.jailFreeCards || 0) + 1; break;
        case "collectAll": {
          players = players.map((pl) => pl.id === idx ? pl : { ...pl, money: pl.money - action.amount });
          p.money += action.amount * (players.length - 1);
          break;
        }
        case "payAll": {
          players = players.map((pl) => pl.id === idx ? pl : { ...pl, money: pl.money + action.amount });
          p.money -= action.amount * (players.length - 1);
          break;
        }
        default: break;
      }
      players[idx] = p;
      return { ...s, players };
    });
    // After applying, re-check landing if moved
    setTimeout(() => {
      const s = stateRef.current;
      const player = s.players[pid];
      const cell = BOARD[player.position];
      if (cell.type === "property" || cell.type === "railroad" || cell.type === "tax" || cell.type === "chance" || cell.type === "community") {
        landOnCell(pid);
      } else {
        setState((st) => ({ ...st, phase: "END_TURN" }));
      }
    }, 250);
  };

  const buyProperty = () => {
    const player = stateRef.current.players[stateRef.current.currentPlayer];
    const cell = BOARD[player.position];
    if (cell.type !== "property" && cell.type !== "railroad") {
      pushToast("Petak ini tidak bisa dibeli.", "peringatan");
      setState((s) => ({ ...s, phase: "END_TURN" }));
      return;
    }
    if (typeof cell.price !== "number") {
      setState((s) => ({ ...s, phase: "END_TURN" }));
      return;
    }
    if (player.money < cell.price) { pushToast("ORI tidak cukup!", "bahaya"); return; }
    setModal({
      type: "buyQuiz",
      pid: player.id,
      cellId: cell.id,
      price: cell.price,
      quiz: buildPropertyQuiz(cell),
      selected: null,
    });
  };

  const buildHouse = () => {
    const player = stateRef.current.players[stateRef.current.currentPlayer];
    const cell = BOARD[player.position];
    if (cell.type !== "property" || typeof cell.building !== "number") {
      setState((s) => ({ ...s, phase: "END_TURN" }));
      return;
    }
    const cost = cell.building;
    const owned = player.buildings[cell.id] || 0;
    if (owned >= 3) { pushToast("Sudah level maksimal (Landmark)!", "info"); setState(s => ({ ...s, phase: "END_TURN" })); return; }
    if (player.money < cost) { pushToast("ORI tidak cukup!", "bahaya"); return; }
    audio.stamp();
    setState((s) => ({
      ...s,
      players: s.players.map((p) => p.id === player.id ? {
        ...p,
        money: p.money - cost,
        buildings: { ...p.buildings, [cell.id]: owned + 1 },
      } : p),
      phase: "END_TURN",
    }));
    const labels = ["Rumah Level 1", "Rumah Level 2", "Landmark"];
    pushToast(`${player.name} membangun ${labels[owned]} di ${cell.name}.`, "sukses");
  };

  const skipBuy = () => setState(s => ({...s, phase:"END_TURN"}));
  const skipBuild = () => setState(s => ({...s, phase:"END_TURN"}));

  const answerBuyQuiz = (idx) => {
    if (!modal || modal.type !== "buyQuiz") return;
    const right = idx === modal.quiz.answer;
    setModal({ ...modal, selected: idx });
    setTimeout(() => {
      if (right) {
        audio.quizCorrect();
        setState((s) => ({
          ...s,
          players: s.players.map((p) => p.id === modal.pid ? {
            ...p,
            money: p.money - modal.price,
            properties: [...p.properties, modal.cellId],
          } : p),
          phase: "END_TURN",
        }));
        pushToast(`${stateRef.current.players[modal.pid].name} berhasil menjawab dan membeli ${BOARD[modal.cellId].name}.`, "sukses");
      } else {
        audio.quizWrong();
        setState((s) => ({ ...s, phase: "END_TURN" }));
        pushToast(idx === -1 ? "Waktu habis. Properti belum bisa dibeli." : "Jawaban salah. Properti belum bisa dibeli.", "bahaya");
      }
      setModal(null);
    }, 900);
  };

  const chooseRentQuestion = (question) => {
    if (!modal || modal.type !== "rentQuizPick") return;
    setModal({
      ...modal,
      type: "rentQuizAnswer",
      question,
      selected: null,
    });
  };

  const answerRentQuiz = (idx) => {
    if (!modal || modal.type !== "rentQuizAnswer") return;
    const right = idx === modal.question.jawaban;
    setModal({ ...modal, selected: idx });
    setTimeout(() => {
      if (right) {
        audio.quizCorrect();
        setState((s) => ({ ...s, phase: "END_TURN" }));
        pushToast(`${stateRef.current.players[modal.targetId].name} menjawab benar dan bebas dari denda sewa!`, "sukses");
      } else {
        audio.quizWrong();
        setState((s) => ({
          ...s,
          players: s.players.map((p) => {
            if (p.id === modal.targetId) return { ...p, money: p.money - modal.rent };
            if (p.id === modal.ownerId) return { ...p, money: p.money + modal.rent };
            return p;
          }),
          phase: "END_TURN",
        }));
        pushToast(
          idx === -1
            ? `${stateRef.current.players[modal.targetId].name} kehabisan waktu dan terkena denda ORI ${modal.rent}.`
            : `${stateRef.current.players[modal.targetId].name} salah jawab dan terkena denda ORI ${modal.rent}.`,
          "bahaya"
        );
      }
      setModal(null);
    }, 1000);
  };

  const endTurn = () => {
    // Bankruptcy check (compute side effects outside updater)
    const s0 = stateRef.current;
    const newlyBankrupt = s0.players.filter(p => p.money < 0 && !p.bankrupt);
    newlyBankrupt.forEach(p => pushToast(`${p.name} gugur dalam perjuangan...`, "bahaya"));

    setState((s) => {
      let players = s.players.map((p) => p.money < 0 && !p.bankrupt ? { ...p, bankrupt: true, properties: [], buildings: {} } : p);
      const alive = players.filter((p) => !p.bankrupt);
      if (s.mode === "KLASIK" && alive.length === 1) {
        setTimeout(() => onWin(alive[0], { round: s.round, money: alive[0].money, props: alive[0].properties.length, correctAnswers: 0, mode: s.mode, facts: [...statsTracker.facts] }), 100);
        return { ...s, players };
      }
      let { finalRoundOwner, finalRoundRemaining, proklamasiTriggered } = s;
      if (proklamasiTriggered && finalRoundRemaining > 0) {
        finalRoundRemaining -= 1;
        if (finalRoundRemaining === 0) {
          setTimeout(() => openQuiz(finalRoundOwner), 200);
        }
      }
      const current = players[s.currentPlayer];
      const shouldRollAgain =
        s.dice[0] === s.dice[1] &&
        !current.inJail &&
        !current.bankrupt &&
        !s.proklamasiTriggered;

      if (shouldRollAgain) {
        pushToast(`${current.name} mendapat giliran lagi karena dadu kembar!`, "info");
        return { ...s, players, phase: "ROLL", finalRoundOwner, finalRoundRemaining };
      }

      let next = (s.currentPlayer + 1) % players.length;
      while (players[next].bankrupt) next = (next + 1) % players.length;
      const round = next === 0 ? s.round + 1 : s.round;
      return { ...s, players, currentPlayer: next, phase: "ROLL", round, finalRoundOwner, finalRoundRemaining, doublesCount: 0 };
    });
  };

  const tryProklamasi = () => {
    const player = stateRef.current.players[stateRef.current.currentPlayer];
    const k = checkKemerdekaan(stateRef.current, player);
    if (!k.syarat1 || !k.syarat2) { pushToast("Belum memenuhi syarat!", "peringatan"); return; }
    audio.victory();
    setState(s => ({ ...s, proklamasiTriggered: true, finalRoundOwner: player.id, finalRoundRemaining: s.players.filter(p => !p.bankrupt && p.id !== player.id).length }));
    setModal({ type: "deklarasi", pid: player.id });
  };

  const openQuiz = (pid) => {
    // pick 3 random questions
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5).slice(0, 3);
    setModal({ type: "quiz", pid, questions: shuffled, current: 0, correct: 0, selected: null });
  };

  const answerQuiz = (idx) => {
    if (!modal || modal.type !== "quiz") return;
    const q = modal.questions[modal.current];
    const right = q.jawaban === idx;
    const newCorrect = modal.correct + (right ? 1 : 0);
    if (right) audio.quizCorrect(); else audio.quizWrong();
    setModal({ ...modal, selected: idx });
    setTimeout(() => {
      if (modal.current + 1 < modal.questions.length) {
        setModal({ ...modal, current: modal.current + 1, correct: newCorrect, selected: null });
      } else {
        // done
        const win = newCorrect >= 2;
        setStatsTracker((t) => ({ ...t, correctAnswers: newCorrect }));
        if (win) {
          const winner = state.players[modal.pid];
          setTimeout(() => onWin(winner, {
            round: state.round,
            money: winner.money,
            props: winner.properties.length,
            correctAnswers: newCorrect,
            facts: [...statsTracker.facts],
          }), 500);
        } else {
          pushToast("Tantangan Sejarah belum berhasil. Coba lagi nanti.", "peringatan");
          setState((s) => ({ ...s, proklamasiTriggered: false, finalRoundOwner: null, finalRoundRemaining: 0 }));
        }
        setModal(null);
      }
    }, 1200);
  };

  // Render board cells
  const renderCell = (cellId) => {
    const cell = BOARD[cellId];
    const { col, row } = gridPos(cellId);
    const owner = ownerOf(state, cellId);
    const buildings = owner ? (owner.buildings[cellId] || 0) : 0;
    const tokensHere = state.players.filter((p) => p.position === cellId && !p.bankrupt);
    const side = sideOf(cellId);
    const isCorner = cell.type === "corner";
    const tokenSize = 56; // Keep player sprite size consistent across all cells.

    let className = `cell ${cell.type} side-${side}`;
    if (isCorner) className += ` corner-${cell.id}`;
    if (owner) className += " owned";

    return (
      <div
        key={cellId}
        className={className}
        style={{ gridColumn: col, gridRow: row }}
        data-testid={`cell-${cellId}`}
        onMouseEnter={() => setHoverCell(cellId)}
        onMouseLeave={() => setHoverCell(null)}
      >
        {cell.group && <div className={`color-bar bar-${side}`} style={{ background: GROUP_COLORS[cell.group] }} />}
        {owner && (
          <div className="owner-mark" style={{ background: TOKEN_OPTIONS[owner.tokenId].color }} />
        )}
        <div className="cell-content">
          {cell.type === "corner" && (
            <CornerContent cell={cell} />
          )}
          {(cell.type === "property" || cell.type === "railroad") && (
            <>
              <div className="cell-name">{cell.name}</div>
              <div className="cell-illus"><PropertyIllustration id={cellId} /></div>
              <div className="cell-price">ORI {cell.price}</div>
            </>
          )}
          {cell.type === "tax" && (
            <>
              <div className="cell-name">{cell.name}</div>
              <div className="cell-illus"><PropertyIllustration id={cellId} /></div>
              <div className="cell-price">Pajak ORI {cell.amount}</div>
            </>
          )}
          {cell.type === "chance" && (
            <>
              <div className="cell-name">PROKLAMASI</div>
              <div className="qmark">?</div>
            </>
          )}
          {cell.type === "community" && (
            <>
              <div className="cell-name">BHINNEKA</div>
              <div className="cell-illus"><Garuda size={28} opacity={0.7} /></div>
            </>
          )}
        </div>
        {buildings > 0 && (
          <div className="buildings">
            {buildings >= 3 ? (
              <span className="landmark">
                <PropertyIllustration id={cellId} w={20} h={16} />
              </span>
            ) : (
              [...Array(buildings)].map((_, i) => <span key={i} className="house" />)
            )}
          </div>
        )}
        <div className="tokens-on-cell">
          {tokensHere.map((p, i) => (
            <span
              key={`${p.id}-${animatingMove && p.id === state.currentPlayer ? movePulse : 0}`}
              className="token-here"
              style={{
                "--tx": `${(i % 2) * 18 - 9}px`,
                "--ty": `${Math.floor(i / 2) * 16 - 2}px`,
                animation: animatingMove && p.id === state.currentPlayer ? "token-hop 280ms ease-out" : "none",
                animationDelay: animatingMove && p.id === state.currentPlayer ? `${(movePulse % 2) * 40}ms` : "0ms",
              }}
            >
              {pieceStyle === "pawn" ? (
                <PawnToken color={TOKEN_OPTIONS[p.tokenId].color} size={tokenSize} />
              ) : (
                <HeroToken color={TOKEN_OPTIONS[p.tokenId].color} tokenId={p.tokenId} size={tokenSize} />
              )}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="screen board-screen" data-testid="board-screen">
      <div className="board-layout">
        <div className="side-panel">
          {leftPlayers.map((p) => (
            <PlayerPanel key={p.id} player={p} active={p.id === state.currentPlayer} state={state} pieceStyle={pieceStyle} />
          ))}
        </div>

        <div className="board-wrap">
          <div className="board-frame">
            <span className="board-paku tl" /><span className="board-paku tr" />
            <span className="board-paku bl" /><span className="board-paku br" />
            <span className="board-paku lt" /><span className="board-paku lb" />
            <span className="board-paku rt" /><span className="board-paku rb" />
            <div className="board-grid" data-testid="board-grid">
              {BOARD.map((c) => renderCell(c.id))}
              <div className="board-center">
                <div
                  className="center-bg-img"
                  style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/img/center.png)` }}
                />
                <div className="center-content">
                  <div className="center-logo">
                    <div className="cl-1">MONOPOLI</div>
                    <div className="cl-2">MERDEKA</div>
                    <div className="cl-3">1945</div>
                  </div>
                  <div className="center-meta">
                    <span>Giliran: {cur.name}</span>
                    <span>Ronde {state.round}</span>
                    <span>Free Parking ORI {state.freeParkingPot || 0}</span>
                  </div>
                  <div className="center-decks">
                    <div className="deck-pile prok-deck">
                      <div>PROKLAMASI</div>
                    </div>
                    <div className="deck-pile bhin-deck">
                      <div>BHINNEKA</div>
                    </div>
                  </div>
                </div>
                <div className="dice-area">
                  <Dice3D
                    rollToken={diceRollToken}
                    onRollComplete={handleDiceRollComplete}
                    valueLabel={diceShown}
                  />
                </div>
                {diceTotalFlash !== null && (
                  <div className="dice-total-flash" data-testid="dice-total-flash">
                    {diceTotalFlash}
                  </div>
                )}
              </div>
              {hoverCell !== null && factsOn && (BOARD[hoverCell].type === "property" || BOARD[hoverCell].type === "railroad") && (
                <Tooltip cellId={hoverCell} state={state} />
              )}
            </div>
          </div>
        </div>

        <div className="side-panel right">
          {rightPlayers.map((p) => (
            <PlayerPanel key={p.id} player={p} active={p.id === state.currentPlayer} state={state} pieceStyle={pieceStyle} />
          ))}
        </div>
      </div>

      <div className="footer-actions">
        <ActionFooter
          state={state}
          cur={cur}
          onRoll={rollDice}
          onBuy={buyProperty}
          onSkipBuy={skipBuy}
          onBuild={buildHouse}
          onSkipBuild={skipBuild}
          onEnd={endTurn}
          onProklamasi={tryProklamasi}
          animating={animatingMove}
          onQuit={onQuit}
        />
      </div>

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} data-testid="toast">{t.msg}</div>
        ))}
      </div>

      {modal && modal.type === "card" && (
        <CardModal
          deck={modal.deck}
          card={modal.card}
          onClose={() => { applyCardAction(modal.pid, modal.card.action); setModal(null); }}
        />
      )}
      {modal && modal.type === "deklarasi" && (
        <div className="modal-overlay">
          <div className="modal-box dekl-box">
            <Bendera size={120} />
            <h2>{state.players[modal.pid].name} siap memproklamasikan kemerdekaan!</h2>
            <p>Pemain lain mendapat 1 putaran terakhir.</p>
            <button className="btn btn-primary" data-testid="dekl-ok-btn" onClick={() => setModal(null)}>Lanjutkan</button>
          </div>
        </div>
      )}
      {modal && modal.type === "quiz" && (
        <QuizModal modal={modal} player={state.players[modal.pid]} onAnswer={answerQuiz} />
      )}
      {modal && modal.type === "buyQuiz" && (
        <PropertyQuizModal
          title="KUIS PEMBELIAN PROPERTI"
          subtitle={`Jawab benar untuk membeli ${BOARD[modal.cellId].name}`}
          quiz={modal.quiz}
          selected={modal.selected}
          onAnswer={answerBuyQuiz}
          onTimeout={() => answerBuyQuiz(-1)}
          timerKey={`buy-${modal.cellId}-${modal.quiz.question}`}
        />
      )}
      {modal && modal.type === "rentQuizPick" && (
        <RentQuestionPickerModal
          owner={state.players[modal.ownerId]}
          target={state.players[modal.targetId]}
          questions={modal.questions}
          onChoose={chooseRentQuestion}
        />
      )}
      {modal && modal.type === "rentQuizAnswer" && (
        <PropertyQuizModal
          title={`TANTANGAN DARI ${state.players[modal.ownerId].name.toUpperCase()}`}
          subtitle={`Jawab benar agar ${state.players[modal.targetId].name} bebas dari denda ORI ${modal.rent}`}
          quiz={{
            question: modal.question.pertanyaan,
            options: modal.question.pilihan,
            answer: modal.question.jawaban,
            fact: modal.question.fakta,
          }}
          selected={modal.selected}
          onAnswer={answerRentQuiz}
          onTimeout={() => answerRentQuiz(-1)}
          timerKey={`rent-${modal.cellId}-${modal.question?.pertanyaan || ""}`}
        />
      )}
    </div>
  );
}

const CornerContent = ({ cell }) => {
  if (cell.id === 0) return (
    <div className="corner-inner awal">
      <div className="corner-title">AWAL</div>
      <div className="corner-arrow">↙</div>
      <div className="corner-sub">Lewat sini · Ambil ORI 200</div>
    </div>
  );
  if (cell.id === 11) return (
    <div className="corner-inner kmb">
      <div className="corner-arrow big">↗</div>
      <div className="corner-title">PERGI KE</div>
      <div className="corner-sub">PENJARA DIGUL</div>
    </div>
  );
  if (cell.id === 22) return (
    <div className="corner-inner merdeka">
      <FlagWave />
      <div className="corner-title">MERDEKA!</div>
      <div className="corner-sub">Parkir Merdeka</div>
    </div>
  );
  if (cell.id === 33) return (
    <div className="corner-inner penjara">
      <div className="jail-bars">
        <span /><span /><span />
      </div>
      <div className="corner-title">PENJARA</div>
      <div className="corner-sub">DIGUL</div>
    </div>
  );
  return null;
};

const Tooltip = ({ cellId, state }) => {
  const cell = BOARD[cellId];
  const owner = ownerOf(state, cellId);
  return (
    <div className="cell-tooltip" data-testid="cell-tooltip">
      <div className="tt-name">{cell.name}</div>
      <div className="tt-line">Harga: ORI {cell.price}</div>
      {cell.rent && <div className="tt-line">Sewa Dasar: ORI {cell.rent[0]}</div>}
      <div className="tt-line">Pemilik: {owner ? owner.name : "Tidak ada"}</div>
      {PROPERTY_FACTS[cellId] && <div className="tt-fact">"{PROPERTY_FACTS[cellId]}"</div>}
    </div>
  );
};

const PlayerPanel = ({ player, active, state, pieceStyle = "human" }) => {
  const tok = TOKEN_OPTIONS[player.tokenId];
  const k = state.mode === "KEMERDEKAAN" ? checkKemerdekaan(state, player) : null;
  // money stack distribution into denominations
  const stack = breakIntoStacks(player.money);
  const featuredDeck = player.id % 2 === 0 ? "PROKLAMASI" : "BHINNEKA";
  return (
    <div className={`player-panel ${active ? "active" : ""} ${player.bankrupt ? "bankrupt" : ""}`} data-testid={`player-panel-${player.id}`}>
      <div className="pp-token-float">
        {pieceStyle === "pawn" ? <PawnToken color={tok.color} size={56} /> : <HeroToken color={tok.color} tokenId={player.tokenId} size={56} />}
      </div>
      <div className={`pp-plate t${player.tokenId + 1}`}>{player.name}</div>
      <div className="pp-money-big" data-testid={`player-money-${player.id}`}>
        <span className="ori-lbl">ORI</span><span className="ori-amt">{player.money}</span>
      </div>
      <div className="pp-zone">
        <div className="pp-board">
          <div className="money-stack">
            {stack.map((s) => (
              <div key={s.value} className="banknote-asset-row">
                <MoneyNoteAsset value={s.value} width={92} height={30} />
                <span className="banknote-count">x{s.count}</span>
              </div>
            ))}
          </div>
          <div className="mini-props-list">
            {player.properties.slice(0, 4).map((id) => {
              const c = BOARD[id];
              return (
                <div key={id} className="mini-prop-card" title={c.name}>
                  <span className="mp-bar" style={{ background: c.group ? GROUP_COLORS[c.group] : "#6B4423" }} />
                  <span className="mp-name">{c.name}</span>
                  <span className="mp-price">ORI {c.price || ""}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={`pp-featured-deck ${featuredDeck === "PROKLAMASI" ? "prok" : "bhin"}`}>
          <div className="pp-featured-title">{featuredDeck}</div>
          <div className="pp-featured-sub">ambil saat mendarat di petak kartu</div>
        </div>
        {k && (
          <div className="kemerdekaan-prog" style={{ marginTop: 8, padding: "6px 0", borderTop: "1px dashed rgba(245,236,215,0.3)" }}>
            <div className={`syarat ${k.syarat1 ? "done" : ""}`}>● Kuasai Wilayah</div>
            <div className={`syarat ${k.syarat2 ? "done" : ""}`}>● Bangun Benteng</div>
            <div className={`syarat ${k.syarat3 ? "done" : ""}`}>● Tantangan Sejarah</div>
          </div>
        )}
        {player.jailFreeCards > 0 && <div className="pp-jailfree">🗝 Bebas Penjara x{player.jailFreeCards}</div>}
        {player.inJail && <div className="pp-jail">⛓ Di Penjara Digul</div>}
      </div>
    </div>
  );
};

function breakIntoStacks(amount) {
  const denoms = [500, 100, 50, 20, 10, 5, 1];
  const result = [];
  let left = Math.max(0, amount);
  for (const d of denoms) {
    const c = Math.floor(left / d);
    if (c > 0) {
      result.push({ value: d, count: Math.min(c, 9) });
      left -= c * d;
    }
  }
  return result.slice(0, 7); // cap visual rows for money stack display
}

const ActionFooter = ({ state, cur, onRoll, onBuy, onSkipBuy, onBuild, onSkipBuild, onEnd, onProklamasi, animating, onQuit }) => {
  const cell = BOARD[cur.position];
  const k = state.mode === "KEMERDEKAAN" ? checkKemerdekaan(state, cur) : null;
  const canProklamasi = k && k.syarat1 && k.syarat2 && !state.proklamasiTriggered;
  const isBuyable = cell.type === "property" || cell.type === "railroad";
  const isBuildable = cell.type === "property" && typeof cell.building === "number";

  if (state.phase === "ROLL") {
    return (
      <>
        <button className="btn btn-primary btn-roll" data-testid="action-roll-btn" disabled={animating} onClick={onRoll}>
          LEMPAR DADU
        </button>
        <button className="btn btn-outline btn-quit-inline" data-testid="action-quit-btn" onClick={onQuit}>KELUAR</button>
      </>
    );
  }
  if (state.phase === "ACTION_BUY" && isBuyable) {
    return (
      <>
        <button className="btn btn-primary" data-testid="action-buy-btn" onClick={onBuy}>BELI — ORI {cell.price}</button>
        <button className="btn btn-outline" data-testid="action-skipbuy-btn" onClick={onSkipBuy}>LEWATI</button>
      </>
    );
  }
  if (state.phase === "ACTION_BUILD" && isBuildable) {
    const lvl = (cur.buildings[cell.id] || 0);
    const labels = ["BANGUN RUMAH LV1", "BANGUN RUMAH LV2", "UPGRADE LANDMARK"];
    if (lvl >= 3) {
      return <button className="btn btn-outline" data-testid="action-end-btn" onClick={onEnd}>AKHIRI GILIRAN</button>;
    }
    return (
      <>
        <button className="btn btn-primary" data-testid="action-build-btn" onClick={onBuild}>{labels[lvl]} — ORI {cell.building}</button>
        <button className="btn btn-outline" data-testid="action-skipbuild-btn" onClick={onSkipBuild}>TIDAK SEKARANG</button>
      </>
    );
  }
  return (
    <>
      {canProklamasi && (
        <button className="btn btn-victory" data-testid="action-proklamasi-btn" onClick={onProklamasi}>
          🇮🇩 PROKLAMASIKAN KEMERDEKAAN!
        </button>
      )}
      <button className="btn btn-outline" data-testid="action-end-btn" onClick={onEnd}>AKHIRI GILIRAN</button>
    </>
  );
};

const CardModal = ({ deck, card, onClose }) => (
  <div className="modal-overlay" data-testid="card-modal">
    <div className={`event-card ${deck === "proklamasi" ? "card-prok" : "card-bhin"}`}>
      <div className="card-header">{deck === "proklamasi" ? "PROKLAMASI" : "BHINNEKA TUNGGAL IKA"}</div>
      <div className="card-icon">{deck === "proklamasi" ? <Bendera size={70} animate={false} /> : <Garuda size={70} />}</div>
      <div className="card-text">{card.text}</div>
      <div className="card-stamp" />
      <button className="btn btn-primary card-ok" data-testid="card-ok-btn" onClick={onClose}>BACA STEMPEL</button>
    </div>
  </div>
);

const QuizModal = ({ modal, player, onAnswer }) => {
  const q = modal.questions[modal.current];
  return (
    <div className="modal-overlay" data-testid="quiz-modal">
      <div className="modal-box quiz-box">
        <div className="quiz-head">★ TANTANGAN SEJARAH ★</div>
        <div className="quiz-pemain">Pemain: <b>{player.name}</b> · Soal {modal.current + 1}/3</div>
        <div className="quiz-q">{q.pertanyaan}</div>
        <div className="quiz-options">
          {q.pilihan.map((opt, i) => {
            const sel = modal.selected !== null;
            const right = q.jawaban === i;
            const cls = sel ? (right ? "right" : (modal.selected === i ? "wrong" : "")) : "";
            return (
              <button
                key={i}
                className={`quiz-opt ${cls}`}
                data-testid={`quiz-opt-${i}`}
                disabled={sel}
                onClick={() => onAnswer(i)}
              >
                <b>({String.fromCharCode(65 + i)})</b> {opt}
              </button>
            );
          })}
        </div>
        {modal.selected !== null && (
          <div className="quiz-fakta">📜 {q.fakta}</div>
        )}
      </div>
    </div>
  );
};

const PropertyQuizModal = ({ title, subtitle, quiz, selected, onAnswer, onTimeout, timerKey }) => {
  const [left, setLeft] = useState(10);
  const timeoutFiredRef = useRef(false);

  useEffect(() => {
    timeoutFiredRef.current = false;
    setLeft(10);
  }, [timerKey]);

  useEffect(() => {
    if (selected !== null) return undefined;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          if (!timeoutFiredRef.current) {
            timeoutFiredRef.current = true;
            if (typeof onTimeout === "function") onTimeout();
          }
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [selected, onTimeout]);

  return (
    <div className="modal-overlay" data-testid="property-quiz-modal">
      <div className="modal-box quiz-box">
        <div className="quiz-head">{title}</div>
        <div className="quiz-pemain">{subtitle}</div>
        <div className="quiz-timer">Waktu menjawab: {left}s</div>
        <div className="quiz-q">{quiz.question}</div>
        <div className="quiz-options">
          {quiz.options.map((opt, i) => {
            const sel = selected !== null;
            const right = quiz.answer === i;
            const cls = sel ? (right ? "right" : (selected === i ? "wrong" : "")) : "";
            return (
              <button
                key={i}
                className={`quiz-opt ${cls}`}
                disabled={sel}
                onClick={() => onAnswer(i)}
              >
                <b>({String.fromCharCode(65 + i)})</b> {opt}
              </button>
            );
          })}
        </div>
        {selected !== null && <div className="quiz-fakta">📜 {quiz.fact}</div>}
      </div>
    </div>
  );
};

const RentQuestionPickerModal = ({ owner, target, questions, onChoose }) => (
  <div className="modal-overlay" data-testid="rent-quiz-picker">
    <div className="modal-box quiz-box">
      <div className="quiz-head">PILIH TANTANGAN</div>
      <div className="quiz-pemain">{owner.name} memilih pertanyaan untuk {target.name}</div>
      <div className="quiz-options">
        {questions.map((q, i) => (
          <button
            key={i}
            className="quiz-opt"
            onClick={() => onChoose(q)}
          >
            <b>Pertanyaan {i + 1}.</b> {q.pertanyaan}
          </button>
        ))}
      </div>
    </div>
  </div>
);

function checkKemerdekaan(state, player) {
  return {
    syarat1: hasAnyCompleteGroup(state, player),
    syarat2: hasBenteng(player),
    syarat3: player.quizPassed || false,
  };
}
