import { BOARD, PROKLAMASI_CARDS, BHINNEKA_CARDS } from "./data";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const createInitialState = (players, mode = "KEMERDEKAAN") => ({
  players: players.map((p, i) => ({
    id: i,
    name: p.name,
    tokenId: p.tokenId,
    money: 1500,
    position: 0,
    properties: [], // cell ids
    buildings: {}, // { cellId: count (1-5, 5 = benteng) }
    inJail: false,
    jailTurns: 0,
    jailFreeCards: 0,
    bankrupt: false,
    quizPassed: false,
    visited: new Set(),
  })),
  board: BOARD,
  currentPlayer: 0,
  phase: "ROLL",
  dice: [1, 1],
  doublesCount: 0,
  bank: 50000,
  cards: {
    proklamasi: shuffle(PROKLAMASI_CARDS),
    bhinneka: shuffle(BHINNEKA_CARDS),
  },
  mode,
  round: 1,
  log: [],
  freeParkingPot: 0,
  proklamasiTriggered: false,
  finalRoundOwner: null,
  finalRoundRemaining: 0,
});

export const ownerOf = (state, cellId) => {
  for (const p of state.players) {
    if (p.properties.includes(cellId)) return p;
  }
  return null;
};

export const groupComplete = (state, player, group) => {
  const cells = state.board.filter((c) => c.group === group);
  return cells.every((c) => player.properties.includes(c.id));
};

export const hasAnyCompleteGroup = (state, player) => {
  const groups = new Set(state.board.filter(c => c.group).map(c => c.group));
  for (const g of groups) {
    if (groupComplete(state, player, g)) return true;
  }
  return false;
};

export const hasBenteng = (player) => {
  return Object.values(player.buildings).some((n) => n >= 5);
};

export const computeRent = (state, player, cell) => {
  if (cell.type === "railroad") {
    const railsOwned = player.properties.filter(
      (id) => state.board[id].type === "railroad"
    ).length;
    return [25, 50, 100, 200][railsOwned - 1] || 25;
  }
  if (cell.type !== "property") return 0;
  const buildings = player.buildings[cell.id] || 0;
  if (buildings === 0) {
    // Double base if owns full group
    const base = cell.rent[0];
    return groupComplete(state, player, cell.group) ? base * 2 : base;
  }
  return cell.rent[buildings] || cell.rent[0];
};
