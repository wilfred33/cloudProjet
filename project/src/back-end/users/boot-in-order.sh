#!/bin/bash -
#===============================================================================
#
#          FILE: boot-in-order.sh
#
#         USAGE: ./boot-in-order.sh
#
#   DESCRIPTION:
#     Waits until the deamon of CouchDB starts to create a database. The
#     environment variable DB_URL contains more details of such DB
#     (name, authentication information of administrator, etc).
#       OPTIONS: ---
#  REQUIREMENTS: This script makes use of the environment variables DB_NAME and
#     DB_URL, be sure that such variables were defined before running this script.
#          BUGS: ---
#         NOTES: ---
#        AUTHOR: Raziel Carvajal-Gomez (), raziel.carvajal@uclouvain.be
#  ORGANIZATION:
#       CREATED: 10/08/2018 09:20
#      REVISION:  ---
#===============================================================================
if [ "${WITH_PERSISTENT_DATA}" != "" ]; then
  echo "Wait (indefenitly) until the DB creation (name: ${DB_NAME})."
  echo "The DB URL is: ${DB_URL}"
  until curl --request PUT ${DB_URL} ; do
    echo -e "\t DB (${DB_NAME}) wasn't created - trying again later..."
    sleep 2
  done
  echo "DB (${DB_NAME}) was created!"
fi

echo "Start users service in background..."
npm start &

echo "Waiting for users service to be ready..."
sleep 5

# Attendre que le service soit vraiment prêt
until curl -s http://localhost:80/user/${ADMIN_NAME}/${ADMIN_PASSW} > /dev/null 2>&1; do
  echo "Waiting for users service to start..."
  sleep 2
done

echo "Users service is ready! Checking if admin user exists..."

# Vérifier si l'utilisateur admin existe déjà
ADMIN_CHECK=$(curl -s http://localhost:80/user/${ADMIN_NAME}/${ADMIN_PASSW} | grep -o '"status":"success"' || echo "")

if [ -z "$ADMIN_CHECK" ]; then
  echo "Admin user does not exist. Creating admin user: ${ADMIN_NAME}"
  curl -X POST http://localhost:80/user \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_NAME}\",\"password\":\"${ADMIN_PASSW}\"}"
  echo ""
  echo "Admin user created successfully!"
else
  echo "Admin user already exists, skipping creation."
fi

echo "Initialization complete. Keeping service running..."
wait


