#!/bin/bash

# Script de déploiement Azure pour Docker Swarm avec 2 VMs
# Usage: ./azure-deploy.sh

# Note: on ne met pas set -e pour éviter que le script s'arrête sur des erreurs mineures

# ============================================
# CONFIGURATION
# ============================================

RESOURCE_GROUP="scapp-rg"
LOCATION="westeurope"
VNET_NAME="scapp-vnet"
SUBNET_NAME="scapp-subnet"
NSG_NAME="scapp-nsg"

# VM Manager (Swarm Manager)
VM_MANAGER_NAME="scapp-manager"
VM_MANAGER_SIZE="Standard_D2s_v6"
VM_MANAGER_IP="10.0.0.4"

# VM Worker (Swarm Worker)
VM_WORKER_NAME="scapp-worker"
VM_WORKER_SIZE="Standard_D2s_v6"
VM_WORKER_IP="10.0.0.5"

# Authentication
ADMIN_USER="admin-scapp"
SSH_KEY_PATH="$HOME/.ssh/id_rsa.pub"

# DNS Label (pour accès public)
DNS_LABEL="scapp"

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
# 1. CRÉATION DU RESOURCE GROUP
# ============================================

print_step "1. Création du Resource Group"

az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

echo "Attente de 5 secondes pour que le Resource Group soit prêt..."
sleep 5

# ============================================
# 2. CRÉATION DU RÉSEAU VIRTUEL
# ============================================

print_step "2. Création du Virtual Network et Subnet"

az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --address-prefix 10.0.0.0/16 \
  --subnet-name $SUBNET_NAME \
  --subnet-prefix 10.0.0.0/24

echo "Attente de 5 secondes pour que le VNet soit prêt..."
sleep 5

# ============================================
# 3. CRÉATION DU NETWORK SECURITY GROUP
# ============================================

print_step "3. Création du Network Security Group"

az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name $NSG_NAME

# Règles pour Docker Swarm
print_step "3.1. Ajout des règles NSG pour Docker Swarm"

# SSH (port 22)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-ssh \
  --priority 100 \
  --source-address-prefixes '*' \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow

# Docker Swarm Management (port 2377)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-swarm-mgmt \
  --priority 110 \
  --source-address-prefixes '*' \
  --destination-port-ranges 2377 \
  --protocol Tcp \
  --access Allow

# Docker Swarm Node Communication (port 7946 TCP/UDP)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-swarm-node-tcp \
  --priority 120 \
  --source-address-prefixes '*' \
  --destination-port-ranges 7946 \
  --protocol Tcp \
  --access Allow

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-swarm-node-udp \
  --priority 121 \
  --source-address-prefixes '*' \
  --destination-port-ranges 7946 \
  --protocol Udp \
  --access Allow

# Docker Swarm Overlay Network (port 4789 UDP)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-swarm-overlay \
  --priority 130 \
  --source-address-prefixes '*' \
  --destination-port-ranges 4789 \
  --protocol Udp \
  --access Allow

# API Gateway (port 8082)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-gateway \
  --priority 200 \
  --source-address-prefixes '*' \
  --destination-port-ranges 8082 \
  --protocol Tcp \
  --access Allow

# Frontend (port 3000)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-frontend \
  --priority 210 \
  --source-address-prefixes '*' \
  --destination-port-ranges 3000 \
  --protocol Tcp \
  --access Allow

# Visualizer (port 80)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-visualizer \
  --priority 220 \
  --source-address-prefixes '*' \
  --destination-port-ranges 80 \
  --protocol Tcp \
  --access Allow

# CouchDB Ports (5984-5987)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-couchdb \
  --priority 230 \
  --source-address-prefixes '*' \
  --destination-port-ranges 5984-5987 \
  --protocol Tcp \
  --access Allow

# ============================================
# 4. CRÉATION DE LA VM MANAGER
# ============================================

print_step "4. Création de la VM Manager (Swarm Manager)"

az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_MANAGER_NAME \
  --image Ubuntu2204 \
  --size $VM_MANAGER_SIZE \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME \
  --nsg $NSG_NAME \
  --private-ip-address $VM_MANAGER_IP \
  --public-ip-address-dns-name $DNS_LABEL \
  --admin-username $ADMIN_USER \
  --ssh-key-values @$SSH_KEY_PATH \
  --authentication-type ssh

# Installation de Docker via extension
print_step "4.1. Installation de Docker sur VM Manager"

az vm extension set \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_MANAGER_NAME \
  --name DockerExtension \
  --publisher Microsoft.Azure.Extensions \
  --version 1.1

# ============================================
# 5. CRÉATION DE LA VM WORKER
# ============================================

print_step "5. Création de la VM Worker (Swarm Worker)"

az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_WORKER_NAME \
  --image Ubuntu2204 \
  --size $VM_WORKER_SIZE \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME \
  --nsg $NSG_NAME \
  --private-ip-address $VM_WORKER_IP \
  --public-ip-address "" \
  --admin-username $ADMIN_USER \
  --ssh-key-values @$SSH_KEY_PATH \
  --authentication-type ssh

# Installation de Docker via extension
print_step "5.1. Installation de Docker sur VM Worker"

az vm extension set \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_WORKER_NAME \
  --name DockerExtension \
  --publisher Microsoft.Azure.Extensions \
  --version 1.1

# ============================================
# 6. RÉCUPÉRATION DES INFORMATIONS
# ============================================

print_step "6. Récupération des informations de connexion"

MANAGER_PUBLIC_IP=$(az vm show \
  --resource-group $RESOURCE_GROUP \
  --name $VM_MANAGER_NAME \
  --show-details \
  --query publicIps \
  --output tsv)

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "================================================"
echo "INFORMATIONS DE CONNEXION"
echo "================================================"
echo ""
echo "Manager Public DNS: $DNS_LABEL.$LOCATION.cloudapp.azure.com"
echo "Manager Public IP: $MANAGER_PUBLIC_IP"
echo "Manager Private IP: $VM_MANAGER_IP"
echo "Worker Private IP: $VM_WORKER_IP"
echo ""
echo "================================================"
echo "COMMANDES SSH"
echo "================================================"
echo ""
echo "Se connecter au Manager:"
echo "  ssh -i ~/.ssh/id_rsa $ADMIN_USER@$DNS_LABEL.$LOCATION.cloudapp.azure.com"
echo ""
echo "Se connecter au Worker (via Manager comme proxy):"
echo "  ssh -i ~/.ssh/id_rsa -J $ADMIN_USER@$DNS_LABEL.$LOCATION.cloudapp.azure.com $ADMIN_USER@$VM_WORKER_IP"
echo ""
echo "Port forwarding pour Visualizer (localhost:8888):"
echo "  ssh -i ~/.ssh/id_rsa -L 8888:localhost:80 $ADMIN_USER@$DNS_LABEL.$LOCATION.cloudapp.azure.com"
echo ""
echo "Port forwarding pour Swarm (localhost:2377):"
echo "  ssh -i ~/.ssh/id_rsa -L 2377:localhost:2377 $ADMIN_USER@$DNS_LABEL.$LOCATION.cloudapp.azure.com"
echo ""
echo "================================================"
echo "PROCHAINES ÉTAPES"
echo "================================================"
echo ""
echo "1. Attendez 2-3 minutes que Docker s'installe sur les VMs"
echo "2. Exécutez: ./azure-swarm-init.sh"
echo "   (Ce script va initialiser le Swarm et déployer l'application)"
echo ""
