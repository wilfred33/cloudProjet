#!/bin/bash

# Local deployment status check script
# Usage: ./local-check-status.sh

VM_MANAGER_NAME="scapp-manager-local"
VM_WORKER_NAME="scapp-worker-local"

echo ""
echo "========================================"
echo "LOCAL DEPLOYMENT STATUS CHECK"
echo "========================================"
echo ""

# Check if VMs exist
echo "1. Checking VMs..."
if multipass list | grep -q "$VM_MANAGER_NAME"; then
    echo "   ✅ Manager VM exists"
else
    echo "   ❌ Manager VM does not exist"
    echo "   Run: ./local-deploy.sh"
    exit 1
fi

if multipass list | grep -q "$VM_WORKER_NAME"; then
    echo "   ✅ Worker VM exists"
else
    echo "   ❌ Worker VM does not exist"
    exit 1
fi

# VM status
echo ""
echo "2. VM Status:"
multipass list | grep -E "(Name|scapp-)"

# Get IPs
MANAGER_IP=$(multipass info $VM_MANAGER_NAME | grep IPv4 | awk '{print $2}')
WORKER_IP=$(multipass info $VM_WORKER_NAME | grep IPv4 | awk '{print $2}')

echo ""
echo "3. IP Addresses:"
echo "   Manager: $MANAGER_IP"
echo "   Worker: $WORKER_IP"

# Check Docker
echo ""
echo "4. Checking Docker..."
DOCKER_VERSION=$(multipass exec $VM_MANAGER_NAME -- docker --version 2>/dev/null || echo "Not installed")
echo "   Docker Manager: $DOCKER_VERSION"

# Check Swarm
echo ""
echo "5. Checking Swarm..."
SWARM_STATUS=$(multipass exec $VM_MANAGER_NAME -- docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "error")

if [ "$SWARM_STATUS" = "active" ]; then
    echo "   ✅ Swarm active"

    echo ""
    echo "   Swarm Nodes:"
    multipass exec $VM_MANAGER_NAME -- docker node ls | sed 's/^/   /'
else
    echo "   ❌ Swarm not active"
fi

# Check stack
echo ""
echo "6. Checking scapp stack..."
STACK_EXISTS=$(multipass exec $VM_MANAGER_NAME -- docker stack ls 2>/dev/null | grep -c scapp || echo "0")

if [ "$STACK_EXISTS" -gt 0 ]; then
    echo "   ✅ scapp stack deployed"

    echo ""
    echo "   Services:"
    multipass exec $VM_MANAGER_NAME -- docker stack services scapp | sed 's/^/   /'
else
    echo "   ❌ Stack not yet deployed"
fi

# Access URLs
echo ""
echo "========================================"
echo "APPLICATION ACCESS"
echo "========================================"
echo ""
echo "⚠️  Accessible ONLY from your computer:"
echo ""
echo "Frontend:   http://$MANAGER_IP:3000"
echo "Gateway:    http://$MANAGER_IP:8082"
echo "Visualizer: http://$MANAGER_IP:80"
echo ""
