#!/bin/sh

echo "=== Products Initialization Script ==="

# URL du service (localhost car on est dans le même conteneur)
URL="http://localhost:80"

# Vérifier si des produits existent déjà
EXISTING=$(curl -s ${URL}/products | grep -o '"products":\[' || echo "")

if [ -z "$EXISTING" ]; then
  echo "Products database is empty, initializing with sample data..."
else
  PRODUCT_COUNT=$(curl -s ${URL}/products | grep -o '"_id"' | wc -l)
  if [ "$PRODUCT_COUNT" -gt 0 ]; then
    echo "Products already exist ($PRODUCT_COUNT products found), skipping initialization"
    exit 0
  fi
fi

echo "Creating Vegetables..."

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Brocolli","price":2.73,"category":"Vegetables","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/broccoli.jpg"}' \
  ${URL}/products

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Cauliflower","price":6.3,"category":"Vegetables","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/cauliflower.jpg"}' \
  ${URL}/products

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Cucumber","price":5.6,"category":"Vegetables","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620046/dummy-products/cucumber.jpg"}' \
  ${URL}/products

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Beetroot","price":8.7,"category":"Vegetables","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/beetroot.jpg"}' \
  ${URL}/products

echo "Creating Fruits..."

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Apple","price":2.34,"category":"Fruits","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/apple.jpg"}' \
  ${URL}/products

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Banana","price":1.69,"category":"Fruits","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/banana.jpg"}' \
  ${URL}/products

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Grapes","price":5.98,"category":"Fruits","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/grapes.jpg"}' \
  ${URL}/products

curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Mango","price":6.8,"category":"Fruits","image":"https://res.cloudinary.com/sivadass/image/upload/v1493620045/dummy-products/mango.jpg"}' \
  ${URL}/products

echo "=== Products initialization complete! ==="