#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║             KW SALES CRM - Deploy Script                     ║
# ╠══════════════════════════════════════════════════════════════╣
# ║ App:              KW Sales CRM                               ║
# ║ Versione:         (da package.json)                          ║
# ║ Ultimo update:    2026-02-23                                 ║
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
# Uso: ./deploy.sh "messaggio commit"
#      ./deploy.sh --bump patch "messaggio commit"
#      ./deploy.sh --bump minor "messaggio commit"
#      ./deploy.sh --bump major "messaggio commit"
#
# Il deploy esegue in ordine:
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

    # 3. Sidebar version label (se presente)
    local SIDEBAR_FILE="${SCRIPT_DIR}/src/components/layout/sidebar.tsx"
    if [ -f "$SIDEBAR_FILE" ]; then
        sed -i '' "s/v${old_version}/v${new_version}/g" "$SIDEBAR_FILE"
        print_success "sidebar.tsx → v${new_version}"
    fi
}

# ═══════════════════════════════════════════
# PARSING ARGOMENTI
# ═══════════════════════════════════════════

BUMP_TYPE=""
COMMIT_MSG=""

if [ "$1" = "--bump" ]; then
    BUMP_TYPE="$2"
    COMMIT_MSG="$3"

    if [[ "$BUMP_TYPE" != "major" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "patch" ]]; then
        print_error "Tipo di bump non valido: $BUMP_TYPE"
        echo "Usa: major, minor, o patch"
        exit 1
    fi

    if [ -z "$COMMIT_MSG" ]; then
        print_error "Devi specificare un messaggio di commit!"
        echo "Uso: ./deploy.sh --bump $BUMP_TYPE \"messaggio commit\""
        exit 1
    fi
else
    COMMIT_MSG="$1"
fi

# Verifica messaggio commit
if [ -z "$COMMIT_MSG" ]; then
    print_error "Devi specificare un messaggio di commit!"
    echo ""
    echo "Uso:"
    echo "  ./deploy.sh \"messaggio commit\""
    echo "  ./deploy.sh --bump patch \"fix bug XYZ\""
    echo "  ./deploy.sh --bump minor \"nuova funzionalita ABC\""
    echo "  ./deploy.sh --bump major \"redesign completo\""
    exit 1
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
    update_version_in_files "$APP_VERSION" "$NEW_VERSION"
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
        read -p "  Continuare comunque? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
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
    read -p "Vuoi continuare comunque con il deploy? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# ═══════════════════════════════════════════
# STEP 3: Build locale di verifica
# ═══════════════════════════════════════════

print_step "Step 3/9 - Build locale di verifica (type-check)..."
BUILD_LOG=$(mktemp)
if cd "${SCRIPT_DIR}" && npm run build > "$BUILD_LOG" 2>&1; then
    print_success "Build locale OK"
else
    print_error "Build locale fallita!"
    echo -e "  ${YELLOW}Ultimi errori:${NC}"
    tail -20 "$BUILD_LOG" 2>/dev/null | sed 's/^/    /'
    if [ -t 0 ]; then
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

print_step "Step 6/9 - Pull sul VPS (con stash automatico)..."
ssh $VPS_HOST "cd $VPS_PATH && git stash --include-untracked 2>/dev/null; git pull origin $BRANCH"
print_success "Pull completato"

# ═══════════════════════════════════════════
# STEP 7: npm install + Prisma generate
# ═══════════════════════════════════════════

print_step "Step 7/9 - Dipendenze e Prisma generate..."

# npm install solo se package.json è cambiato
PACKAGE_CHANGED=$(ssh $VPS_HOST "cd $VPS_PATH && git diff HEAD~1 --name-only 2>/dev/null | grep package.json" 2>/dev/null || echo "")
if [ -n "$PACKAGE_CHANGED" ]; then
    echo -e "  ${CYAN}package.json modificato → npm install${NC}"
    ssh $VPS_HOST "cd $VPS_PATH && npm install"
    print_success "npm install completato"
else
    print_success "package.json invariato, skip npm install"
fi

# Prisma generate (sempre necessario per CRM)
ssh $VPS_HOST "cd $VPS_PATH && npx prisma generate"
print_success "Prisma client generato"

# ═══════════════════════════════════════════
# STEP 8: Build Next.js sul server
# ═══════════════════════════════════════════

print_step "Step 8/9 - Build Next.js sul server..."
ssh $VPS_HOST "cd $VPS_PATH && npm run build"
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
