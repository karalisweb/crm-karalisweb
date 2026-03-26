#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║             KW SALES CRM - Deploy Script                     ║
# ╠══════════════════════════════════════════════════════════════╣
# ║ App:              KW Sales CRM                               ║
# ║ Versione:         (da package.json)                          ║
# ║ Ultimo update:    2026-03-24                                 ║
# ║                                                              ║
# ║ Cartella locale:  ~/Desktop/Sviluppo App Claude Code/       ║
# ║                   CRM /sales-app                             ║
# ║ Repo GitHub:      github.com/karalisweb/crm-karalisweb      ║
# ║ Cartella server:  /opt/sales-app                             ║
# ║                                                              ║
# ║ Porta locale:     3003                                       ║
# ║ Porta server:     3003 (proxy Nginx su porta 80/443)         ║
# ║                                                              ║
# ║ URL pubblico:     https://crm.karalisdemo.it                 ║
# ║ VPS:              185.192.97.108                              ║
# ║ Process manager:  PM2 (nome: sales-crm)                      ║
# ║ Restart server:   pm2 restart sales-crm                      ║
# ║ Restart locale:   npm run dev                                ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Uso: ./deploy.sh "messaggio commit"               (auto-patch bump)
#      ./deploy.sh --bump patch "messaggio commit"   (esplicito patch)
#      ./deploy.sh --bump minor "messaggio commit"
#      ./deploy.sh --bump major "messaggio commit"
#      ./deploy.sh --no-bump "messaggio commit"      (nessun bump versione)
#      ./deploy.sh --ci "messaggio commit"           (non-interattivo, per Claude Code)
#      ./deploy.sh --ci --bump minor "messaggio"     (combinabile)
#
# Il deploy esegue in ordine:
# 0. Versioning (auto-patch di default, --bump per minor/major)
#    → Aggiorna: package.json, DEPLOY.md, sidebar.tsx, settings/page.tsx, README.md, TECHNICAL-DOCS.md
#    → Auto-genera entry in CHANGELOG.md dal commit message
#    → Auto-aggiorna versione e data in GUIDA_UTENTE.md
# 1. Verifica coerenza versione e CHANGELOG
# 2. Verifica stato Git
# 3. Build locale di verifica (type-check)
# 4. Add + Commit
# 5. Push a GitHub
# 6. Pull sul VPS (con git stash automatico)
# 7. npm install (solo se package.json cambiato) + Prisma generate
# 8. Build Next.js sul server
# 9. Restart PM2 + health check

set -e  # Esci se un comando fallisce

# Carica nvm se disponibile (necessario per npm su Mac con nvm)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════
# CONFIGURAZIONE (modifica qui per altre app)
# ═══════════════════════════════════════════
APP_NAME="KW Sales CRM"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Versione letta dinamicamente da package.json
APP_VERSION=$(grep '"version"' "${SCRIPT_DIR}/package.json" | head -1 | sed 's/.*"version"[^"]*"\([^"]*\)".*/\1/')
VPS_HOST="root@185.192.97.108"
VPS_PATH="/opt/sales-app"
BRANCH="main"
PM2_PROCESS="sales-crm"
LOCAL_PORT=3003
SERVER_PORT=3003
PUBLIC_URL="https://crm.karalisdemo.it"
GITHUB_REPO="github.com/karalisweb/crm-karalisweb"

# ═══════════════════════════════════════════
# FUNZIONI
# ═══════════════════════════════════════════

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

print_step() {
    echo -e "\n${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
    echo -e "${RED}[X] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

# ═══════════════════════════════════════════
# VERSIONING
# ═══════════════════════════════════════════

bump_version() {
    local current="$1"
    local bump_type="$2"

    local major minor patch
    major=$(echo "$current" | cut -d. -f1)
    minor=$(echo "$current" | cut -d. -f2)
    patch=$(echo "$current" | cut -d. -f3)

    case "$bump_type" in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
    esac

    echo "${major}.${minor}.${patch}"
}

update_version_in_files() {
    local old_version="$1"
    local new_version="$2"

    # 1. package.json
    if [ -f "${SCRIPT_DIR}/package.json" ]; then
        sed -i '' "s/\"version\": \"${old_version}\"/\"version\": \"${new_version}\"/" "${SCRIPT_DIR}/package.json"
        print_success "package.json → v${new_version}"
    fi

    # 2. DEPLOY.md
    if [ -f "${SCRIPT_DIR}/DEPLOY.md" ]; then
        sed -i '' "s/Versione attuale: \*\*${old_version}\*\*/Versione attuale: **${new_version}**/" "${SCRIPT_DIR}/DEPLOY.md"
        print_success "DEPLOY.md → v${new_version}"
    fi

    # 3. Sidebar version label
    local SIDEBAR_FILE="${SCRIPT_DIR}/src/components/layout/sidebar.tsx"
    if [ -f "$SIDEBAR_FILE" ]; then
        sed -i '' "s/v${old_version}/v${new_version}/g" "$SIDEBAR_FILE"
        print_success "sidebar.tsx → v${new_version}"
    fi

    # 4. Settings page version
    local SETTINGS_FILE="${SCRIPT_DIR}/src/app/(dashboard)/settings/page.tsx"
    if [ -f "$SETTINGS_FILE" ]; then
        sed -i '' "s/v${old_version}/v${new_version}/g" "$SETTINGS_FILE"
        print_success "settings/page.tsx → v${new_version}"
    fi

    # 5. README.md
    if [ -f "${SCRIPT_DIR}/README.md" ]; then
        sed -i '' "s/Versione: \*\*${old_version}\*\*/Versione: **${new_version}**/" "${SCRIPT_DIR}/README.md"
        print_success "README.md → v${new_version}"
    fi

    # 6. TECHNICAL-DOCS.md
    if [ -f "${SCRIPT_DIR}/TECHNICAL-DOCS.md" ]; then
        sed -i '' "s/Versione: \*\*${old_version}\*\*/Versione: **${new_version}**/" "${SCRIPT_DIR}/TECHNICAL-DOCS.md"
        sed -i '' "s/Ultimo aggiornamento: [0-9]*-[0-9]*-[0-9]*/Ultimo aggiornamento: $(date '+%Y-%m-%d')/" "${SCRIPT_DIR}/TECHNICAL-DOCS.md"
        print_success "TECHNICAL-DOCS.md → v${new_version}"
    fi
}

# Auto-append entry in CHANGELOG.md
append_changelog_entry() {
    local version="$1"
    local commit_msg="$2"
    local today
    today=$(date '+%Y-%m-%d')

    local CHANGELOG="${SCRIPT_DIR}/CHANGELOG.md"
    if [ ! -f "$CHANGELOG" ]; then
        print_warning "CHANGELOG.md non trovato, skip auto-entry"
        return
    fi

    # Se la versione è già nel CHANGELOG, skip
    if grep -q "\[${version}\]" "$CHANGELOG"; then
        print_success "CHANGELOG contiene già [${version}], skip auto-entry"
        return
    fi

    # Inserisci dopo la prima riga "---" (separatore dopo header)
    # Formato: ## [VERSION] - DATE\n\n- commit_msg\n
    local ENTRY="## [${version}] - ${today}\n\n- ${commit_msg}\n"

    # Trova la prima occorrenza di "---" e inserisci dopo
    sed -i '' "/^---$/,/^---$/{
        /^---$/{
            n
            i\\
\\
${ENTRY}
        }
    }" "$CHANGELOG" 2>/dev/null

    # Fallback: se sed non ha funzionato (struttura diversa), usa approccio più robusto
    if ! grep -q "\[${version}\]" "$CHANGELOG"; then
        # Cerca la prima riga ## [ e inserisci prima
        local TEMP_FILE
        TEMP_FILE=$(mktemp)
        local inserted=false
        while IFS= read -r line; do
            if [ "$inserted" = false ] && echo "$line" | grep -q "^## \["; then
                echo "" >> "$TEMP_FILE"
                echo "## [${version}] - ${today}" >> "$TEMP_FILE"
                echo "" >> "$TEMP_FILE"
                echo "- ${commit_msg}" >> "$TEMP_FILE"
                echo "" >> "$TEMP_FILE"
                inserted=true
            fi
            echo "$line" >> "$TEMP_FILE"
        done < "$CHANGELOG"
        mv "$TEMP_FILE" "$CHANGELOG"
    fi

    print_success "CHANGELOG.md → aggiunta entry [${version}]"
}

# Auto-update GUIDA_UTENTE.md version e date
update_guida_utente() {
    local new_version="$1"
    local today
    today=$(date '+%Y-%m-%d')

    local GUIDA="${SCRIPT_DIR}/GUIDA_UTENTE.md"
    if [ ! -f "$GUIDA" ]; then
        print_warning "GUIDA_UTENTE.md non trovato, skip"
        return
    fi

    # Aggiorna riga "Versione: **X.Y.Z**"
    sed -i '' "s/Versione: \*\*[0-9]*\.[0-9]*\.[0-9]*\*\*/Versione: **${new_version}**/" "$GUIDA"

    # Aggiorna riga "Ultimo aggiornamento: YYYY-MM-DD"
    sed -i '' "s/Ultimo aggiornamento: [0-9]*-[0-9]*-[0-9]*/Ultimo aggiornamento: ${today}/" "$GUIDA"

    # Aggiorna footer "Documento aggiornato il YYYY-MM-DD | KW Sales CRM vX.Y.Z"
    sed -i '' "s/Documento aggiornato il [0-9]*-[0-9]*-[0-9]*/Documento aggiornato il ${today}/" "$GUIDA"
    sed -i '' "s/KW Sales CRM v[0-9]*\.[0-9]*\.[0-9]*/KW Sales CRM v${new_version}/" "$GUIDA"

    print_success "GUIDA_UTENTE.md → v${new_version} (${today})"
}

# ═══════════════════════════════════════════
# PARSING ARGOMENTI
# ═══════════════════════════════════════════

BUMP_TYPE=""
COMMIT_MSG=""
CI_MODE=false
NO_BUMP=false

# Parsing flessibile: --ci, --bump, --no-bump possono apparire in qualsiasi ordine
ARGS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --ci)
            CI_MODE=true
            shift
            ;;
        --no-bump)
            NO_BUMP=true
            shift
            ;;
        --bump)
            BUMP_TYPE="$2"
            if [[ "$BUMP_TYPE" != "major" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "patch" ]]; then
                print_error "Tipo di bump non valido: $BUMP_TYPE"
                echo "Usa: major, minor, o patch"
                exit 1
            fi
            shift 2
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Il primo argomento rimanente e' il messaggio di commit
COMMIT_MSG="${ARGS[0]:-}"

# Verifica messaggio commit
if [ -z "$COMMIT_MSG" ]; then
    print_error "Devi specificare un messaggio di commit!"
    echo ""
    echo "Uso:"
    echo "  ./deploy.sh \"messaggio commit\"                (auto-patch bump)"
    echo "  ./deploy.sh --bump minor \"nuova funzionalita\""
    echo "  ./deploy.sh --bump major \"redesign completo\""
    echo "  ./deploy.sh --no-bump \"hotfix veloce\"         (nessun bump)"
    echo "  ./deploy.sh --ci \"messaggio commit\"           (non-interattivo)"
    echo "  ./deploy.sh --ci --bump minor \"messaggio\"     (combinabile)"
    exit 1
fi

# Default: auto-patch bump se non specificato --bump e non specificato --no-bump
if [ -z "$BUMP_TYPE" ] && [ "$NO_BUMP" = false ]; then
    BUMP_TYPE="patch"
fi

if [ "$CI_MODE" = true ]; then
    print_warning "Modalita CI attiva (non-interattivo, skip prompt)"
fi

# Header
print_header "$APP_NAME v$APP_VERSION - Deploy"

# ═══════════════════════════════════════════
# STEP 0: Versioning (se richiesto)
# ═══════════════════════════════════════════

if [ -n "$BUMP_TYPE" ]; then
    print_step "Step 0 - Aggiornamento versione ($BUMP_TYPE)..."
    NEW_VERSION=$(bump_version "$APP_VERSION" "$BUMP_TYPE")
    echo -e "  ${CYAN}${APP_VERSION}${NC} → ${GREEN}${NEW_VERSION}${NC}"

    # Aggiorna versione in tutti i file
    update_version_in_files "$APP_VERSION" "$NEW_VERSION"

    # Auto-append entry in CHANGELOG.md
    append_changelog_entry "$NEW_VERSION" "$COMMIT_MSG"

    # Auto-update GUIDA_UTENTE.md
    update_guida_utente "$NEW_VERSION"

    APP_VERSION="$NEW_VERSION"
    echo ""
fi

# ═══════════════════════════════════════════
# STEP 1: Verifica CHANGELOG e coerenza
# ═══════════════════════════════════════════

print_step "Step 1/9 - Verifico CHANGELOG e coerenza versioni..."

# 1a: Verifica che CHANGELOG.md contenga la versione corrente
if [ -f "${SCRIPT_DIR}/CHANGELOG.md" ]; then
    if ! grep -q "\[$APP_VERSION\]" "${SCRIPT_DIR}/CHANGELOG.md"; then
        print_warning "CHANGELOG.md non contiene la versione $APP_VERSION"
        if [ "$CI_MODE" = true ]; then
            print_warning "CI mode: continuo senza CHANGELOG aggiornato"
        else
            read -p "  Continuare comunque? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        print_success "CHANGELOG contiene [$APP_VERSION]"
    fi
else
    print_warning "CHANGELOG.md non trovato, skip verifica"
fi

# 1b: Verifica coerenza versione sidebar
SIDEBAR_FILE="${SCRIPT_DIR}/src/components/layout/sidebar.tsx"
if [ -f "$SIDEBAR_FILE" ]; then
    SIDEBAR_V=$(grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' "$SIDEBAR_FILE" | head -1)
    if [ -n "$SIDEBAR_V" ] && [ "$SIDEBAR_V" != "v$APP_VERSION" ]; then
        print_warning "Sidebar version ($SIDEBAR_V) diversa da v$APP_VERSION"
        sed -i '' "s/$SIDEBAR_V/v$APP_VERSION/" "$SIDEBAR_FILE"
        print_success "Sidebar version aggiornata a v$APP_VERSION"
    else
        print_success "Sidebar version $SIDEBAR_V coerente"
    fi
fi

# ═══════════════════════════════════════════
# STEP 2: Verifica stato Git
# ═══════════════════════════════════════════

print_step "Step 2/9 - Verifico stato Git locale..."
if [ -n "$(git -C "${SCRIPT_DIR}" status --porcelain)" ]; then
    git -C "${SCRIPT_DIR}" status --short
else
    print_warning "Nessuna modifica da committare"
    if [ "$CI_MODE" = true ]; then
        print_warning "CI mode: continuo con deploy (push commit esistenti)"
    else
        read -p "Vuoi continuare comunque con il deploy? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
fi

# ═══════════════════════════════════════════
# STEP 3: Build locale di verifica
# ═══════════════════════════════════════════

print_step "Step 3/9 - Build locale di verifica (type-check)..."
BUILD_LOG=$(mktemp)
if cd "${SCRIPT_DIR}" && NODE_OPTIONS="--max-old-space-size=4096" npm run build > "$BUILD_LOG" 2>&1; then
    print_success "Build locale OK"
else
    print_error "Build locale fallita!"
    echo -e "  ${YELLOW}Ultimi errori:${NC}"
    tail -20 "$BUILD_LOG" 2>/dev/null | sed 's/^/    /'
    # In CI mode, build failure blocca sempre il deploy (sicurezza)
    if [ "$CI_MODE" = true ]; then
        print_error "CI mode: build fallita, deploy annullato"
        rm -f "$BUILD_LOG"
        exit 1
    elif [ -t 0 ]; then
        read -p "  Continuare comunque? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            rm -f "$BUILD_LOG"
            exit 1
        fi
    else
        rm -f "$BUILD_LOG"
        exit 1
    fi
fi
rm -f "$BUILD_LOG"

# ═══════════════════════════════════════════
# STEP 4: Add e Commit
# ═══════════════════════════════════════════

print_step "Step 4/9 - Aggiungo modifiche e creo commit..."
git -C "${SCRIPT_DIR}" add .
git -C "${SCRIPT_DIR}" commit -m "$COMMIT_MSG" || print_warning "Niente da committare"

# ═══════════════════════════════════════════
# STEP 5: Push a GitHub
# ═══════════════════════════════════════════

print_step "Step 5/9 - Push a GitHub ($BRANCH)..."
git -C "${SCRIPT_DIR}" push origin $BRANCH
print_success "Push completato"

# ═══════════════════════════════════════════
# STEP 6: Pull sul VPS (con git stash)
# ═══════════════════════════════════════════

print_step "Step 6/9 - Pull sul VPS (con stash + pulizia)..."
# Stash modifiche locali + rimuovi file spuri non tracciati nella root
ssh $VPS_HOST "cd $VPS_PATH && git stash --include-untracked 2>/dev/null; git clean -f -d --exclude=node_modules --exclude=.next --exclude=logs --exclude=.env* 2>/dev/null; git pull origin $BRANCH"
print_success "Pull completato"

# ═══════════════════════════════════════════
# STEP 7: npm install + Prisma (db push → generate)
# ═══════════════════════════════════════════

print_step "Step 7/9 - Dipendenze + Prisma (schema → client)..."

# npm install solo se package.json è cambiato
PACKAGE_CHANGED=$(ssh $VPS_HOST "cd $VPS_PATH && git diff HEAD~1 --name-only 2>/dev/null | grep package.json" 2>/dev/null || echo "")
if [ -n "$PACKAGE_CHANGED" ]; then
    echo -e "  ${CYAN}package.json modificato → npm install${NC}"
    ssh $VPS_HOST "cd $VPS_PATH && npm install"
    print_success "npm install completato"
else
    print_success "package.json invariato, skip npm install"
fi

# PRIMA sincronizza schema DB (nuovi campi/tabelle)
SCHEMA_CHANGED=$(ssh $VPS_HOST "cd $VPS_PATH && git diff HEAD~1 --name-only 2>/dev/null | grep schema.prisma" 2>/dev/null || echo "")
if [ -n "$SCHEMA_CHANGED" ]; then
    echo -e "  ${CYAN}schema.prisma modificato → prisma db push${NC}"
    ssh $VPS_HOST "cd $VPS_PATH && npx prisma db push --accept-data-loss"
    print_success "Database sincronizzato"
else
    print_success "schema.prisma invariato, skip db push"
fi

# POI genera il client Prisma (riflette lo schema aggiornato)
ssh $VPS_HOST "cd $VPS_PATH && npx prisma generate"
print_success "Prisma client generato"

# ═══════════════════════════════════════════
# STEP 8: Build Next.js sul server
# ═══════════════════════════════════════════

print_step "Step 8/9 - Build Next.js sul server..."
ssh $VPS_HOST "cd $VPS_PATH && export NODE_OPTIONS='--max-old-space-size=4096' && npm run build"
print_success "Build completata"

# ═══════════════════════════════════════════
# STEP 9: Restart PM2 + Health check
# ═══════════════════════════════════════════

print_step "Step 9/9 - Restart $PM2_PROCESS + health check..."
ssh $VPS_HOST "pm2 restart $PM2_PROCESS --update-env || pm2 start npm --name '$PM2_PROCESS' -- start -- -p $SERVER_PORT"
ssh $VPS_HOST "pm2 save"

# Health check: attendi avvio e verifica risposta
echo -e "  ${CYAN}Attendo avvio server...${NC}"
sleep 5
HTTP_STATUS=$(ssh $VPS_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:${SERVER_PORT}/login" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Health check OK (HTTP $HTTP_STATUS)"
elif [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "302" ]; then
    print_success "Health check OK (HTTP $HTTP_STATUS - redirect)"
else
    print_error "Health check fallito! (HTTP $HTTP_STATUS)"
    echo -e "  ${YELLOW}Controlla i log: ssh $VPS_HOST \"pm2 logs $PM2_PROCESS --lines 30 --nostream\"${NC}"
fi

# ═══════════════════════════════════════════
# RIEPILOGO FINALE
# ═══════════════════════════════════════════

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy completato!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "  App:      ${APP_NAME}"
echo -e "  Versione: v${APP_VERSION}"
echo -e "  Commit:   ${COMMIT_MSG}"
echo -e "  Branch:   ${BRANCH}"
echo -e "  Server:   ${VPS_HOST} (porta ${SERVER_PORT})"
echo -e "  PM2:      ${PM2_PROCESS}"
echo -e "  URL:      ${PUBLIC_URL}"
echo -e "  Health:   HTTP ${HTTP_STATUS}"
echo -e "  Data:     $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
