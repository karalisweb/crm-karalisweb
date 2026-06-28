#!/bin/bash
# Guardrail anti-"versione vecchia": all'avvio di ogni sessione Claude controlla se
# la cartella di lavoro è indietro/divergente rispetto a origin/main (= produzione).
# Nato dopo aver lavorato per errore su un branch v3.17.0 mentre la produzione era v3.22.2.
# Vive in .claude/ (non tracciato da git) così sopravvive ai cambi di branch.

d="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
cd "$d" 2>/dev/null || exit 0

# Fetch best-effort, senza mai bloccarsi su richieste di password
GIT_TERMINAL_PROMPT=0 git fetch --quiet origin main 2>/dev/null

b=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
v=$(grep -m1 '"version"' package.json 2>/dev/null | sed 's/.*"version"[^"]*"\([^"]*\)".*/\1/')

if ! git rev-parse --verify -q origin/main >/dev/null 2>&1; then
  echo "[git] origin/main non disponibile (offline?). Salto il controllo freschezza."
  exit 0
fi

if git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
  echo "[git] OK — branch \"$b\" (v$v) è allineato/avanti rispetto a origin/main (produzione)."
else
  n=$(git rev-list --count HEAD..origin/main 2>/dev/null)
  echo "[git] ⚠️ ATTENZIONE: il branch \"$b\" (v$v) è DIETRO/DIVERGENTE da origin/main di ${n} commit."
  echo "[git] origin/main è la produzione (ciò che gira sul VPS). NON deployare e NON sviluppare da qui."
  echo "[git] Allinea PRIMA di lavorare:  git checkout main && git pull origin main"
  echo "[git] (oppure riparti creando un branch da origin/main)."
fi
exit 0
