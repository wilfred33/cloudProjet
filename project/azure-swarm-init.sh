#!/bin/bash

# Script d'initialisation Docker Swarm et déploiement de l'application
# Usage: ./azure-swarm-init.sh

set -e

# ============================================
# CONFIGURATION (doit correspondre à azure-deploy.sh)
# ============================================

RESOURCE_GROUP="scapp-rg"
LOCATION="westeurope"
DNS_LABEL="scapp"
ADMIN_USER="admin-scapp"
VM_MANAGER_IP="10.0.0.4"
VM_WORKER_IP="10.0.0.5"

MANAGER_HOST="$DNS_LABEL.$LOCATION.cloudapp.azure.com"

# ============================================
# FONCTIONS HELPER
# ============================================

print_step() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# ============================================
# 1. VÉRIFICATION DE LA CONNEXION
# ============================================

print_step "1. Vérification de la connexion SSH au Manager"

if ! ssh -i ~/.ssh/id_rsa -o ConnectTimeout=10 $ADMIN_USER@$MANAGER_HOST "echo 'Connexion réussie'"; then
    echo "❌ Impossible de se connecter au Manager"
    echo "Vérifiez que:"
    echo "  1. Les VMs sont démarrées"
    echo "  2. Votre clé SSH est correcte (~/.ssh/id_rsa)"
    echo "  3. Le DNS $MANAGER_HOST est accessible"
    exit 1
fi

# ============================================
# 2. VÉRIFICATION DE DOCKER
# ============================================

print_step "2. Vérification de l'installation Docker"

echo "Vérification sur le Manager..."
ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker --version" || {
    echo "❌ Docker n'est pas encore installé sur le Manager"
    echo "Attendez quelques minutes et réessayez"
    exit 1
}

echo "Vérification sur le Worker..."
ssh -i ~/.ssh/id_rsa -J $ADMIN_USER@$MANAGER_HOST $ADMIN_USER@$VM_WORKER_IP "docker --version" || {
    echo "❌ Docker n'est pas encore installé sur le Worker"
    echo "Attendez quelques minutes et réessayez"
    exit 1
}

echo "✅ Docker est installé sur les deux VMs"

# ============================================
# 3. AJOUT DE L'UTILISATEUR AU GROUPE DOCKER
# ============================================

print_step "3. Configuration des permissions Docker"

ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "sudo usermod -aG docker $ADMIN_USER || true"
ssh -i ~/.ssh/id_rsa -J $ADMIN_USER@$MANAGER_HOST $ADMIN_USER@$VM_WORKER_IP "sudo usermod -aG docker $ADMIN_USER || true"

echo "⚠️  Reconnexion pour appliquer les permissions..."
sleep 2

# ============================================
# 4. INITIALISATION DU SWARM SUR LE MANAGER
# ============================================

print_step "4. Initialisation du Docker Swarm sur le Manager"

# Vérifier si Swarm est déjà initialisé
SWARM_STATUS=$(ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null" || echo "inactive")

if [ "$SWARM_STATUS" = "active" ]; then
    echo "⚠️  Swarm déjà initialisé, on continue..."
else
    ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker swarm init --advertise-addr $VM_MANAGER_IP"
    echo "✅ Swarm initialisé sur le Manager"
fi

# ============================================
# 5. RÉCUPÉRATION DU TOKEN WORKER
# ============================================

print_step "5. Récupération du token pour joindre le Swarm"

JOIN_TOKEN=$(ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker swarm join-token worker -q")

echo "Token récupéré: ${JOIN_TOKEN:0:20}..."

# ============================================
# 6. JONCTION DU WORKER AU SWARM
# ============================================

print_step "6. Jonction du Worker au Swarm"

# Vérifier si le worker est déjà dans le swarm
WORKER_IN_SWARM=$(ssh -i ~/.ssh/id_rsa -J $ADMIN_USER@$MANAGER_HOST $ADMIN_USER@$VM_WORKER_IP "docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null" || echo "inactive")

if [ "$WORKER_IN_SWARM" = "active" ]; then
    echo "⚠️  Worker déjà dans le Swarm"
else
    ssh -i ~/.ssh/id_rsa -J $ADMIN_USER@$MANAGER_HOST $ADMIN_USER@$VM_WORKER_IP \
        "docker swarm join --token $JOIN_TOKEN $VM_MANAGER_IP:2377"
    echo "✅ Worker joint au Swarm"
fi

# ============================================
# 7. VÉRIFICATION DU CLUSTER
# ============================================

print_step "7. Vérification du cluster Swarm"

ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker node ls"

# ============================================
# 8. COPIE DU FICHIER SCAPP.YML
# ============================================

print_step "8. Copie du fichier scapp.yml sur le Manager"

scp -i ~/.ssh/id_rsa src/scapp.yml $ADMIN_USER@$MANAGER_HOST:~/scapp.yml

echo "✅ Fichier scapp.yml copié"

# ============================================
# 9. DÉPLOIEMENT DE LA STACK
# ============================================

print_step "9. Déploiement de la stack scapp"

ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST << 'EOF'
    # Vérifier si la stack existe déjà
    if docker stack ls | grep -q scapp; then
        echo "⚠️  Stack scapp existe déjà, mise à jour..."
        docker stack rm scapp
        echo "Attente de la suppression complète (30 secondes)..."
        sleep 30
    fi

    # Déployer la stack
    docker stack deploy -c scapp.yml scapp

    echo ""
    echo "✅ Stack déployée!"
    echo ""
    echo "Vérification des services:"
    docker stack services scapp
EOF

# ============================================
# 10. RÉSUMÉ
# ============================================

print_step "✅ DÉPLOIEMENT TERMINÉ"

echo ""
echo "================================================"
echo "ACCÈS À L'APPLICATION"
echo "================================================"
echo ""
echo "Frontend: http://$MANAGER_HOST:3000"
echo "API Gateway: http://$MANAGER_HOST:8082"
echo "Visualizer: http://$MANAGER_HOST:80"
echo ""
echo "================================================"
echo "COMMANDES UTILES"
echo "================================================"
echo ""
echo "Vérifier les services:"
echo "  ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST 'docker stack services scapp'"
echo ""
echo "Vérifier les tâches:"
echo "  ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST 'docker stack ps scapp'"
echo ""
echo "Voir les logs d'un service (exemple: frontend):"
echo "  ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST 'docker service logs scapp_frontend'"
echo ""
echo "Visualizer en local (port 8888):"
echo "  ssh -i ~/.ssh/id_rsa -L 8888:localhost:80 $ADMIN_USER@$MANAGER_HOST"
echo "  Puis ouvrir: http://localhost:8888"
echo ""
echo "⚠️  Note: Les services peuvent prendre 2-3 minutes pour démarrer complètement"
echo ""
