#!/bin/bash

# Script de vérification de l'état du déploiement Azure
# Usage: ./azure-check-status.sh

RESOURCE_GROUP="scapp-rg"
LOCATION="westeurope"
DNS_LABEL="scapp"
ADMIN_USER="admin-scapp"

MANAGER_HOST="$DNS_LABEL.$LOCATION.cloudapp.azure.com"

echo ""
echo "========================================"
echo "VÉRIFICATION DU DÉPLOIEMENT AZURE"
echo "========================================"
echo ""

# Vérifier si le resource group existe
echo "1. Vérification du Resource Group..."
if az group show --name $RESOURCE_GROUP &>/dev/null; then
    echo "   ✅ Resource Group existe"
else
    echo "   ❌ Resource Group n'existe pas"
    echo "   Lancez: ./azure-deploy.sh"
    exit 1
fi

# Vérifier les VMs
echo ""
echo "2. Vérification des VMs..."
VM_COUNT=$(az vm list --resource-group $RESOURCE_GROUP --query "length(@)" -o tsv)
echo "   Nombre de VMs: $VM_COUNT/2"

if [ "$VM_COUNT" -eq 2 ]; then
    echo "   ✅ Les 2 VMs existent"

    # État des VMs
    echo ""
    echo "   État des VMs:"
    az vm list --resource-group $RESOURCE_GROUP --show-details \
        --query "[].{Name:name, PowerState:powerState, PrivateIP:privateIps, PublicIP:publicIps}" \
        --output table
else
    echo "   ❌ Nombre incorrect de VMs"
fi

# Vérifier la connexion SSH
echo ""
echo "3. Vérification de la connexion SSH au Manager..."
if ssh -i ~/.ssh/id_rsa -o ConnectTimeout=5 -o StrictHostKeyChecking=no $ADMIN_USER@$MANAGER_HOST "echo '   ✅ Connexion SSH OK'" 2>/dev/null; then
    :
else
    echo "   ❌ Impossible de se connecter en SSH"
    echo "   Vérifiez que la VM est démarrée et que votre clé SSH est correcte"
fi

# Vérifier Docker
echo ""
echo "4. Vérification de Docker..."
if ssh -i ~/.ssh/id_rsa -o ConnectTimeout=5 -o StrictHostKeyChecking=no $ADMIN_USER@$MANAGER_HOST "docker --version" 2>/dev/null | grep -q "Docker version"; then
    DOCKER_VERSION=$(ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker --version" 2>/dev/null)
    echo "   ✅ Docker installé: $DOCKER_VERSION"
else
    echo "   ⏳ Docker pas encore installé (attendez 2-3 minutes après le déploiement)"
fi

# Vérifier le Swarm
echo ""
echo "5. Vérification du Docker Swarm..."
SWARM_STATUS=$(ssh -i ~/.ssh/id_rsa -o ConnectTimeout=5 $ADMIN_USER@$MANAGER_HOST "docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null" || echo "error")

if [ "$SWARM_STATUS" = "active" ]; then
    echo "   ✅ Swarm initialisé"

    # Nombre de nodes
    NODE_COUNT=$(ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker node ls --format '{{.Hostname}}' | wc -l" 2>/dev/null)
    echo "   Nombre de nodes: $NODE_COUNT/2"

    # Liste des nodes
    echo ""
    echo "   Nodes du Swarm:"
    ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker node ls" 2>/dev/null | sed 's/^/   /'

elif [ "$SWARM_STATUS" = "inactive" ]; then
    echo "   ⏳ Swarm pas encore initialisé"
    echo "   Lancez: ./azure-swarm-init.sh"
else
    echo "   ❌ Impossible de vérifier le Swarm (Docker pas prêt?)"
fi

# Vérifier la stack
echo ""
echo "6. Vérification de la stack scapp..."
STACK_EXISTS=$(ssh -i ~/.ssh/id_rsa -o ConnectTimeout=5 $ADMIN_USER@$MANAGER_HOST "docker stack ls 2>/dev/null | grep -c scapp" || echo "0")

if [ "$STACK_EXISTS" -gt 0 ]; then
    echo "   ✅ Stack scapp déployée"

    echo ""
    echo "   Services:"
    ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker stack services scapp" 2>/dev/null | sed 's/^/   /'

    echo ""
    echo "   État des tâches:"
    RUNNING=$(ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker stack ps scapp --filter 'desired-state=running' --format '{{.Name}}' | wc -l" 2>/dev/null)
    TOTAL=$(ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST "docker stack ps scapp --format '{{.Name}}' | wc -l" 2>/dev/null)
    echo "   Tâches en cours: $RUNNING/$TOTAL"
else
    echo "   ⏳ Stack pas encore déployée"
    echo "   Lancez: ./azure-swarm-init.sh"
fi

# Tester l'accessibilité web
echo ""
echo "7. Test de l'accessibilité web..."

# Test Frontend
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://$MANAGER_HOST:3000 | grep -q "200\|301\|302"; then
    echo "   ✅ Frontend accessible: http://$MANAGER_HOST:3000"
else
    echo "   ⏳ Frontend pas encore accessible"
fi

# Test Gateway
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://$MANAGER_HOST:8082 | grep -q "200\|404"; then
    echo "   ✅ Gateway accessible: http://$MANAGER_HOST:8082"
else
    echo "   ⏳ Gateway pas encore accessible"
fi

# Test Visualizer
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://$MANAGER_HOST:80 | grep -q "200"; then
    echo "   ✅ Visualizer accessible: http://$MANAGER_HOST:80"
else
    echo "   ⏳ Visualizer pas encore accessible"
fi

echo ""
echo "========================================"
echo "RÉSUMÉ"
echo "========================================"
echo ""
echo "URLs d'accès:"
echo "  - Frontend:   http://$MANAGER_HOST:3000"
echo "  - Gateway:    http://$MANAGER_HOST:8082"
echo "  - Visualizer: http://$MANAGER_HOST:80"
echo ""
echo "SSH Manager:"
echo "  ssh -i ~/.ssh/id_rsa $ADMIN_USER@$MANAGER_HOST"
echo ""
