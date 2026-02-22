#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║             KW SALES CRM - Deploy Script                     ║
# ╠══════════════════════════════════════════════════════════════╣
# ║ App:              KW Sales CRM                               ║
# ║ Versione:         2.2.0                                      ║
# ║ Ultimo update:    2026-02-22                                 ║
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

set -e  # Esci se un comando fallisce

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
APP_VERSION="2.2.0"
VPS_HOST="root@185.192.97.108"
VPS_PATH="/opt/sales-app"
BRANCH="main"
PM2_PROCESS="sales-crm"
LOCAL_PORT=3003
SERVER_PORT=3003
PUBLIC_URL="https://crm.karalisdemo.it"
NGINX_CONFIG="/etc/nginx/sites-available/crm.karalisdemo.it"
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
    if [ -f "package.json" ]; then
        sed -i '' "s/\"version\": \"${old_version}\"/\"version\": \"${new_version}\"/" package.json
        print_success "package.json → v${new_version}"
    fi

    # 2. deploy.sh (questo file - APP_VERSION e header)
    sed -i '' "s/APP_VERSION=\"${old_version}\"/APP_VERSION=\"${new_version}\"/" deploy.sh
    sed -i '' "s/# ║ Versione:         ${old_version}/# ║ Versione:         ${new_version}/" deploy.sh
    # Aggiorna data ultimo update
    sed -i '' "s/# ║ Ultimo update:    [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}/# ║ Ultimo update:    $(date '+%Y-%m-%d')/" deploy.sh
    print_success "deploy.sh → v${new_version}"

    # 3. DEPLOY.md
    if [ -f "DEPLOY.md" ]; then
        sed -i '' "s/Versione attuale: \*\*${old_version}\*\*/Versione attuale: **${new_version}**/" DEPLOY.md
        print_success "DEPLOY.md → v${new_version}"
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
# STEP 1: Verifica stato Git
# ═══════════════════════════════════════════

print_step "Step 1/7 - Verifico stato Git locale..."
if [ -n "$(git status --porcelain)" ]; then
    git status --short
else
    print_warning "Nessuna modifica da committare"
    read -p "Vuoi continuare comunque con il deploy? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# ═══════════════════════════════════════════
# STEP 2: Add e Commit
# ═══════════════════════════════════════════

print_step "Step 2/7 - Aggiungo modifiche e creo commit..."
git add .
git commit -m "$COMMIT_MSG" || print_warning "Niente da committare"

# ═══════════════════════════════════════════
# STEP 3: Push a GitHub
# ═══════════════════════════════════════════

print_step "Step 3/7 - Push a GitHub ($BRANCH)..."
git push origin $BRANCH
print_success "Push completato"

# ═══════════════════════════════════════════
# STEP 4: Pull sul VPS + Install dipendenze
# ═══════════════════════════════════════════

print_step "Step 4/7 - Pull sul VPS e installazione dipendenze..."
ssh $VPS_HOST "cd $VPS_PATH && git pull origin $BRANCH && npm install"
print_success "Pull e npm install completati"

# ═══════════════════════════════════════════
# STEP 5: Prisma Generate
# ═══════════════════════════════════════════

print_step "Step 5/7 - Prisma generate sul server..."
ssh $VPS_HOST "cd $VPS_PATH && npx prisma generate"
print_success "Prisma client generato"

# ═══════════════════════════════════════════
# STEP 6: Build Next.js sul server
# ═══════════════════════════════════════════

print_step "Step 6/7 - Build Next.js sul server..."
ssh $VPS_HOST "cd $VPS_PATH && npm run build"
print_success "Build completata"

# ═══════════════════════════════════════════
# STEP 7: Restart PM2 + Pulizia cache
# ═══════════════════════════════════════════

print_step "Step 7/7 - Restart $PM2_PROCESS su VPS..."
ssh $VPS_HOST "cd $VPS_PATH && pm2 restart $PM2_PROCESS --update-env || pm2 start npm --name '$PM2_PROCESS' -- start -- -p $SERVER_PORT"
ssh $VPS_HOST "pm2 save"
print_success "Restart completato"

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
echo -e "  Data:     $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
