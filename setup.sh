#!/usr/bin/env bash
# ╔══════════════════════════════════════════════╗
# ║         JOB RADAR — One-click setup          ║
# ║  Запусти: bash setup.sh  и открой браузер    ║
# ╚══════════════════════════════════════════════╝
set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

info()    { echo -e "${BLUE}▶${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✗${RESET} $*"; exit 1; }
step()    { echo -e "\n${BOLD}$*${RESET}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         JOB RADAR — Setup            ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# 1. Node.js check
step "1/5 — Проверяю Node.js"
if ! command -v node &>/dev/null; then
  error "Node.js не найден. Установи Node.js 20+ с https://nodejs.org"
fi
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  error "Нужен Node.js 20+. У тебя v${NODE_VERSION}. Обнови на https://nodejs.org"
fi
success "Node.js v${NODE_VERSION}"

# 2. Install dependencies
step "2/5 — Устанавливаю зависимости"
npm install --silent
success "Зависимости установлены"

# 3. .env.local
step "3/5 — Настраиваю окружение"
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  success ".env.local создан из примера"
  warn "Открой .env.local и при необходимости добавь API-ключи (HH, Telegram и т.д.)"
else
  success ".env.local уже существует"
fi

# 4. DB migrate + seed
step "4/5 — Инициализирую базу данных"
mkdir -p data
npm run db:migrate
npm run db:seed
success "База данных готова"

# 5. Done!
step "5/5 — Всё готово!"
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║   JOB RADAR готов к запуску! 🚀          ║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Запусти:  ${BOLD}npm run dev${RESET}"
echo -e "  Открой:   ${BOLD}http://localhost:3000/inbox${RESET}"
echo ""
echo -e "  ${BLUE}Быстрые команды:${RESET}"
echo -e "    ${BOLD}npm run collect:jobs${RESET}       — собрать вакансии из всех источников"
echo -e "    ${BOLD}npm run scheduler:install${RESET}  — авто-сбор каждые 6 часов (macOS launchd)"
echo -e "    ${BOLD}npm run db:reset${RESET}           — очистить вакансии (профиль сохраняется)"
echo ""

# Optional: auto-open browser
read -r -p "Запустить dev-сервер прямо сейчас? [Y/n] " response
response="${response:-Y}"
if [[ "$response" =~ ^[Yy]$ ]]; then
  # Try to open browser after a short delay
  if command -v open &>/dev/null; then
    (sleep 2 && open "http://localhost:3000/inbox") &
  elif command -v xdg-open &>/dev/null; then
    (sleep 2 && xdg-open "http://localhost:3000/inbox") &
  fi
  npm run dev
fi
