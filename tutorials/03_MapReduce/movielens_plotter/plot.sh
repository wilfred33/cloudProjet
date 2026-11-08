curl ${COUCHDB_URL}/_design/queries/_view/movies_per_category?group=true >> result_set.json

python3 plot.py
mv *.pdf plots