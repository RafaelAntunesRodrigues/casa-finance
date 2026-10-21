#!/usr/bin/env bash
# Script de preparação ÚNICA de uma VM nova (Ubuntu/Debian) para rodar o
# CasaFinance. Rode uma vez, por SSH, logo após criar a VM:
#
#   ssh usuario@IP-DA-VM
#   curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/deploy/setup-vm.sh -o setup-vm.sh
#   bash setup-vm.sh
#
# (ou copie o arquivo manualmente com scp se preferir não confiar em curl|bash)
set -euo pipefail

echo "==> Instalando Docker Engine + plugin compose..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker instalado. Pode ser necessário reconectar o SSH para o grupo 'docker' valer."
fi

echo "==> Criando diretório de deploy em ~/casa-finance ..."
mkdir -p ~/casa-finance/data ~/casa-finance/backups
cd ~/casa-finance

cat <<'EOF'

Próximos passos manuais (uma única vez):

1. Copie estes 3 arquivos do seu computador para ~/casa-finance/ na VM
   (rode no SEU computador, não na VM):

     scp deploy/docker-compose.prod.yml usuario@IP-DA-VM:~/casa-finance/docker-compose.prod.yml
     scp deploy/Caddyfile              usuario@IP-DA-VM:~/casa-finance/Caddyfile
     scp deploy/.env.prod.example       usuario@IP-DA-VM:~/casa-finance/.env

2. Na VM, edite ~/casa-finance/.env e preencha SESSION_SECRET, DOMAIN e
   GHCR_IMAGE com os valores reais (veja o README, seção "Deploy na internet").

3. Ainda na VM, suba os containers:

     cd ~/casa-finance
     docker compose -f docker-compose.prod.yml up -d

4. Crie os dois usuários iniciais (sem senha padrão no código):

     docker compose -f docker-compose.prod.yml exec app node scripts/create-users.js

5. Acesse https://SEU_DOMINIO para confirmar que está no ar.

Depois disso, todo `git push` na branch main do seu repositório faz o
GitHub Actions publicar uma nova imagem e redeployar automaticamente nesta
VM — sem nenhuma ação manual adicional.
EOF
