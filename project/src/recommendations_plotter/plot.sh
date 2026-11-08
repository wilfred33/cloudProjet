#!/bin/bash
curl ${RECOMMENDATIONS_URL} > result_set.json
python3 plot.py
mv *.pdf plots
