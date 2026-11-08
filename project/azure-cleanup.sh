#!/bin/bash

# Script de nettoyage des ressources Azure
# Usage: ./azure-cleanup.sh

set -e

RESOURCE_GROUP="scapp-rg"

echo ""
echo "========================================"
echo "⚠️  ATTENTION: SUPPRESSION DES RESSOURCES"
echo "========================================"
echo ""
echo "Ce script va supprimer TOUTES les ressources Azure du groupe: $RESOURCE_GROUP"
echo "Cela inclut:"
echo "  - Les 2 VMs (Manager et Worker)"
echo "  - Le réseau virtuel"
echo "  - Les NSG et règles de sécurité"
echo "  - Les adresses IP publiques"
echo "  - Tous les disques associés"
echo ""
read -p "Êtes-vous sûr de vouloir continuer? (tapez 'yes' pour confirmer): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Annulation de la suppression."
    exit 0
fi

echo ""
echo "Suppression du Resource Group $RESOURCE_GROUP..."
echo "⏳ Cela peut prendre quelques minutes..."
echo ""

az group delete \
  --name $RESOURCE_GROUP \
  --yes \
  --no-wait

echo ""
echo "✅ Commande de suppression lancée en arrière-plan"
echo ""
echo "Pour vérifier l'état de la suppression:"
echo "  az group show --name $RESOURCE_GROUP"
echo ""
echo "Le groupe sera complètement supprimé dans quelques minutes."
echo ""
