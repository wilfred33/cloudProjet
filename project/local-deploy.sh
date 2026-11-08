#!/bin/bash

# Local Docker Swarm deployment script with 2 Multipass VMs
# Usage: ./local-deploy.sh

set -e

# ============================================
# CONFIGURATION
# ============================================

VM_MANAGER_NAME="scapp-manager-local"
VM_WORKER_NAME="scapp-worker-local"
VM_CPUS="2"
VM_MEMORY="2G"
VM_DISK="10G"

# ============================================
# HELPER FUNCTIONS
# ============================================

print_step() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# ============================================
# 1. CHECK MULTIPASS INSTALLATION
# ============================================

print_step "1. Checking Multipass Installation"

if ! command -v multipass &> /dev/null; then
    echo "❌ Multipass is not installed"
    echo ""
    echo "To install Multipass:"
    echo "  sudo snap install multipass"
    echo ""
    exit 1
fi

echo "✅ Multipass is installed"
multipass version

# ============================================
# 2. CREATE MANAGER VM
# ============================================

print_step "2. Creating Manager VM"

if multipass list | grep -q "$VM_MANAGER_NAME"; then
    echo "⚠️  Manager VM already exists, deleting..."
    multipass delete $VM_MANAGER_NAME
    multipass purge
fi

multipass launch \
    --name $VM_MANAGER_NAME \
    --cpus $VM_CPUS \
    --memory $VM_MEMORY \
    --disk $VM_DISK \
    22.04

echo "✅ Manager VM created"

# ============================================
# 3. CREATE WORKER VM
# ============================================

print_step "3. Creating Worker VM"

if multipass list | grep -q "$VM_WORKER_NAME"; then
    echo "⚠️  Worker VM already exists, deleting..."
    multipass delete $VM_WORKER_NAME
    multipass purge
fi

multipass launch \
    --name $VM_WORKER_NAME \
    --cpus $VM_CPUS \
    --memory $VM_MEMORY \
    --disk $VM_DISK \
    22.04

echo "✅ Worker VM created"

# ============================================
# 4. INSTALL DOCKER ON MANAGER
# ============================================

print_step "4. Installing Docker on Manager"

multipass exec $VM_MANAGER_NAME -- bash -c '
    # Update packages
    sudo apt-get update

    # Install dependencies
    sudo apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Add user to docker group
    sudo usermod -aG docker ubuntu
'

echo "✅ Docker installed on Manager"

# ============================================
# 5. INSTALL DOCKER ON WORKER
# ============================================

print_step "5. Installing Docker on Worker"

multipass exec $VM_WORKER_NAME -- bash -c '
    # Update packages
    sudo apt-get update

    # Install dependencies
    sudo apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Add user to docker group
    sudo usermod -aG docker ubuntu
'

echo "✅ Docker installed on Worker"

# ============================================
# 6. GET IP ADDRESSES
# ============================================

print_step "6. Getting IP Addresses"

MANAGER_IP=$(multipass info $VM_MANAGER_NAME | grep IPv4 | awk '{print $2}')
WORKER_IP=$(multipass info $VM_WORKER_NAME | grep IPv4 | awk '{print $2}')

echo "Manager IP: $MANAGER_IP"
echo "Worker IP: $WORKER_IP"

# ============================================
# 7. INITIALIZE SWARM
# ============================================

print_step "7. Initializing Swarm on Manager"

multipass exec $VM_MANAGER_NAME -- bash -c "
    docker swarm init --advertise-addr $MANAGER_IP
"

echo "✅ Swarm initialized"

# ============================================
# 8. GET JOIN TOKEN
# ============================================

print_step "8. Getting worker join token"

JOIN_TOKEN=$(multipass exec $VM_MANAGER_NAME -- docker swarm join-token worker -q)

echo "Token retrieved: ${JOIN_TOKEN:0:20}..."

# ============================================
# 9. JOIN WORKER TO SWARM
# ============================================

print_step "9. Joining Worker to Swarm"

multipass exec $VM_WORKER_NAME -- bash -c "
    docker swarm join --token $JOIN_TOKEN $MANAGER_IP:2377
"

echo "✅ Worker joined Swarm"

# ============================================
# 10. VERIFY CLUSTER
# ============================================

print_step "10. Verifying cluster"

multipass exec $VM_MANAGER_NAME -- docker node ls

# ============================================
# 11. COPY SCAPP.YML FILE
# ============================================

print_step "11. Copying scapp.yml file"

multipass transfer src/scapp.yml $VM_MANAGER_NAME:/home/ubuntu/scapp.yml

echo "✅ File copied"

# ============================================
# 12. DEPLOY STACK
# ============================================

print_step "12. Deploying scapp stack"

multipass exec $VM_MANAGER_NAME -- bash -c '
    docker stack deploy -c scapp.yml scapp
'

echo "✅ Stack deployed"

# Wait a few seconds
sleep 5

# Display services
multipass exec $VM_MANAGER_NAME -- docker stack services scapp

# ============================================
# 13. SUMMARY
# ============================================

print_step "✅ LOCAL DEPLOYMENT COMPLETED"

echo ""
echo "================================================"
echo "VM INFORMATION"
echo "================================================"
echo ""
echo "Manager:"
echo "  Name: $VM_MANAGER_NAME"
echo "  IP: $MANAGER_IP"
echo "  SSH: multipass shell $VM_MANAGER_NAME"
echo ""
echo "Worker:"
echo "  Name: $VM_WORKER_NAME"
echo "  IP: $WORKER_IP"
echo "  SSH: multipass shell $VM_WORKER_NAME"
echo ""
echo "================================================"
echo "APPLICATION ACCESS"
echo "================================================"
echo ""
echo "⚠️  IMPORTANT: These URLs are accessible ONLY from YOUR computer"
echo "   (The PC that ran this script)"
echo ""
echo "Frontend: http://$MANAGER_IP:3000"
echo "Gateway: http://$MANAGER_IP:8082"
echo "Visualizer: http://$MANAGER_IP:80"
echo ""
echo "================================================"
echo "USEFUL COMMANDS"
echo "================================================"
echo ""
echo "Connect to Manager:"
echo "  multipass shell $VM_MANAGER_NAME"
echo ""
echo "View services:"
echo "  multipass exec $VM_MANAGER_NAME -- docker stack services scapp"
echo ""
echo "View nodes:"
echo "  multipass exec $VM_MANAGER_NAME -- docker node ls"
echo ""
echo "View service logs:"
echo "  multipass exec $VM_MANAGER_NAME -- docker service logs scapp_frontend"
echo ""
echo "Stop VMs:"
echo "  multipass stop $VM_MANAGER_NAME $VM_WORKER_NAME"
echo ""
echo "Start VMs:"
echo "  multipass start $VM_MANAGER_NAME $VM_WORKER_NAME"
echo ""
echo "Delete VMs:"
echo "  ./local-cleanup.sh"
echo ""
