#!/bin/bash
#===============================================================================
#
#          FILE: setup-swarm-node.sh
#
#         USAGE: ./setup-swarm-node.sh
#
#   DESCRIPTION: Configure le firewall pour permettre la communication
#                Docker Swarm entre les nodes. À exécuter UNE SEULE FOIS
#                sur chaque VM qui rejoindra le cluster Swarm.
#
#       OPTIONS: ---
#  REQUIREMENTS: - UFW installé (sudo apt install ufw)
#                - Privilèges sudo
#         NOTES: Les règles firewall configurées sont persistantes et
#                survivent aux redémarrages. Pas besoin de ré-exécuter.
#        AUTHOR: Configuration Docker Swarm
#       CREATED: 2025-11-22
#===============================================================================

set -e  # Arrêter le script en cas d'erreur

echo "=========================================="
echo "Configuration du firewall pour Docker Swarm"
echo "=========================================="
echo ""

# Vérifier si le script est exécuté avec les privilèges nécessaires
if ! sudo -n true 2>/dev/null; then
    echo "Ce script nécessite les privilèges sudo."
    echo "Vous serez peut-être invité à entrer votre mot de passe."
    echo ""
fi

# Ouvrir les ports nécessaires pour Docker Swarm
echo "Ouverture des ports Docker Swarm..."
echo ""

echo "→ Port 2377/tcp (Cluster management communications)"
sudo ufw allow 2377/tcp

echo "→ Port 7946/tcp (Communication entre nodes)"
sudo ufw allow 7946/tcp

echo "→ Port 7946/udp (Communication entre nodes)"
sudo ufw allow 7946/udp

echo "→ Port 4789/udp (Overlay network traffic - VXLAN)"
sudo ufw allow 4789/udp

echo ""
echo "Activation du firewall..."
# --force permet d'activer sans confirmation interactive
sudo ufw --force enable

echo ""
echo "Rechargement des règles firewall..."
sudo ufw reload

echo ""
echo "=========================================="
echo "Configuration terminée avec succès! ✓"
echo "=========================================="
echo ""
echo "Règles firewall actives pour Docker Swarm:"
sudo ufw status | grep -E "2377|7946|4789" || echo "Aucune règle spécifique affichée"
echo ""
echo "Ces règles sont persistantes et survivront aux redémarrages."
echo "Vous pouvez maintenant initialiser ou rejoindre un cluster Swarm."
echo ""
