#!/bin/bash

# Local VMs cleanup script
# Usage: ./local-cleanup.sh

set -e

VM_MANAGER_NAME="scapp-manager-local"
VM_WORKER_NAME="scapp-worker-local"

echo ""
echo "========================================"
echo "LOCAL VMs CLEANUP"
echo "========================================"
echo ""

# Stop VMs
echo "Stopping VMs..."
multipass stop $VM_MANAGER_NAME $VM_WORKER_NAME 2>/dev/null || true

# Delete VMs
echo "Deleting VMs..."
multipass delete $VM_MANAGER_NAME $VM_WORKER_NAME 2>/dev/null || true

# Purge
echo "Purging..."
multipass purge

echo ""
echo "✅ Cleanup completed!"
echo ""
