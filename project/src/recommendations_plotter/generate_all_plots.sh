#!/bin/bash

# Script pour générer tous les graphiques de recommandations

echo "Generating trending products histogram..."
PLOT_DIR=$(pwd)
docker run \
  -e RECOMMENDATIONS_URL=http://recommendations-container:80/recommendations/trending \
  --volume ${PLOT_DIR}/plots:/usr/app/plots \
  --network src_scapp-network \
  recommendations_plotter

echo "Generating product association graphs..."
docker run \
  --volume ${PLOT_DIR}/plots:/usr/app/plots \
  --network src_scapp-network \
  recommendations_plotter \
  python3 plot_associations.py

echo "All plots generated successfully in plots/ directory:"
ls -lh plots/*.pdf
