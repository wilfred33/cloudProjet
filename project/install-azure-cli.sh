#!/bin/bash

# Script d'installation Azure CLI
# Source: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux

set -e

echo ""
echo "========================================"
echo "Installation d'Azure CLI"
echo "========================================"
echo ""

# Vérifier si Azure CLI est déjà installé
if command -v az &> /dev/null; then
    echo "✅ Azure CLI est déjà installé"
    az --version | head -1
    exit 0
fi

echo "Installation d'Azure CLI en cours..."
echo ""

# Installation via le script officiel Microsoft
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

echo ""
echo "========================================"
echo "✅ Installation terminée!"
echo "========================================"
echo ""

# Vérifier l'installation
if command -v az &> /dev/null; then
    echo "Version installée:"
    az --version | head -1
    echo ""
    echo "Prochaine étape: Connectez-vous à Azure avec:"
    echo "  az login"
else
    echo "❌ Erreur: Azure CLI n'a pas pu être installé"
    exit 1
fi
