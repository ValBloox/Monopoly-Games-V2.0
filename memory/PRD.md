# Monopoli Merdeka 1945 — PRD

## Original Problem Statement
Web game Monopoli bertema Sejarah Kemerdekaan Indonesia 1945. Vintage board game aesthetic, 2-4 players hotseat, 32 board cells, education-driven gameplay (Mode Kemerdekaan + quiz), Web Audio SFX, no backend gameplay dependency.

## User Choices (initial)
- Stack: React frontend + FastAPI/MongoDB backend (leaderboard only)
- Scope: Splash → Menu → Setup → Board → Dice → Move → Buy/Rent/Build → Cards → Jail → Mode Kemerdekaan + Quiz → Victory
- Quiz: 35 soal variatif
- Mode default: Kemerdekaan
- Visual: match user reference photo (vintage wood-table board, AI-generated etching illustrations per cell, paku/sekrup, name plaque)

## Architecture
- Frontend: React (CRA), single-page with screen state
- Backend: FastAPI + MongoDB (leaderboard endpoints)
- Audio: Web Audio API (generative SFX + drone music)
- Images: 18 AI-generated etching illustrations (Gemini Nano Banana) at /app/frontend/public/img/etch/ + center board art at /app/frontend/public/img/center.png

## What's Implemented (2026-04-28)
- 5 screens: Splash, Menu, Setup, Board, Victory + HowToPlay modal
- 32-cell board grid (11x11) with side color bars facing center, corners (AWAL, KMB, MERDEKA, PENJARA DIGUL)
- 18 AI etching illustrations mapped to property cells (sepia-filtered)
- Center board art: Monas + bendera + Jakarta skyline (AI-generated)
- Wood plank background with grain, paku/sekrup at all 8 board edges
- Player nameplate (rounded plaque) + floating top-hat token + ORI big display + money stack (banknotes by denomination) + mini property cards + kemerdekaan progress + jail status
- Dice animation, token movement step-by-step, bonus on passing AWAL
- Buy / pay rent / build (5 levels: Pos1-3, Markas, Benteng)
- Proklamasi & Bhinneka card decks (12 each) with action effects
- Penjara Digul (3 turns max, double to escape, bayar 50)
- Mode Kemerdekaan: 3 syarat + 3-question quiz, win on 2/3
- Mode Klasik: last man standing
- Victory screen with confetti, summary, facts learned + auto-save to leaderboard
- Backend POST/GET /api/leaderboard
- Toggle musik/SFX/fakta, responsive (1100px, 720px breakpoints)

## Critical Bugs Fixed (iteration 1 → 2)
- Tax cell (id=21 Hari Pahlawan) no longer triggers BUY phase + no NaN money
- Side effects moved out of setState updaters (no more StrictMode duplicate toasts)
- Type guards on buyProperty/buildHouse + ActionFooter
- stateRef pattern replaces stale closures

## Verified
- Backend leaderboard 8/8 pytest pass
- Frontend self-test 20-roll loop: no NaN, no duplicate tax toasts, money tracked correctly across both players
- Visual matches user reference photo (wood table + plaque + paku + etched cells + center art + decks)

## Backlog (deferred)
- P1: Trade properties between players
- P1: Mortgage system
- P2: Animated coin flow on transactions
- P2: AI bot players
- P2: Online multiplayer
- P2: Leaderboard view in main menu

## Next Action Items
- Show leaderboard list in menu (read-only)
- Add background keroncong music sample (currently ambient drone)
- Add achievements/badges (e.g., "Kuasai Wilayah", "Diplomat Ulung")
