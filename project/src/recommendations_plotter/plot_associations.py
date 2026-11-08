import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd
import json
import requests

# Récupérer les données du service de recommandations
# On va interroger l'endpoint pour obtenir toutes les paires de produits
CART_DB_URL = "http://admin:admin@cart-db:5984/cart"

# Récupérer tous les paniers
response = requests.get(f"{CART_DB_URL}/_all_docs?include_docs=true")
data = response.json()

# Extraire les paires de produits
product_pairs = {}

for row in data['rows']:
    doc = row.get('doc', {})
    items = doc.get('items', [])

    if len(items) >= 2:
        # Créer toutes les paires possibles
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                product1 = items[i]['name']
                product2 = items[j]['name']

                # Créer une clé ordonnée pour éviter les doublons (A-B et B-A)
                pair = tuple(sorted([product1, product2]))

                if pair in product_pairs:
                    product_pairs[pair] += 1
                else:
                    product_pairs[pair] = 1

# Créer le graphe de réseau
G = nx.Graph()

# Ajouter les arêtes avec leur poids (fréquence)
for (prod1, prod2), frequency in product_pairs.items():
    G.add_edge(prod1, prod2, weight=frequency)

# Créer la visualisation
plt.figure(figsize=(14, 10))

# Position des nœuds (layout spring pour un bel arrangement)
pos = nx.spring_layout(G, k=2, iterations=50)

# Dessiner les nœuds
nx.draw_networkx_nodes(G, pos,
                       node_color='lightblue',
                       node_size=3000,
                       alpha=0.9)

# Dessiner les arêtes avec épaisseur proportionnelle à la fréquence
edges = G.edges()
weights = [G[u][v]['weight'] for u, v in edges]
max_weight = max(weights) if weights else 1

nx.draw_networkx_edges(G, pos,
                       width=[w * 3 / max_weight for w in weights],
                       alpha=0.6,
                       edge_color='gray')

# Dessiner les labels des nœuds
nx.draw_networkx_labels(G, pos,
                        font_size=10,
                        font_weight='bold')

# Ajouter les labels des arêtes (fréquences)
edge_labels = {(u, v): f"{G[u][v]['weight']}" for u, v in G.edges()}
nx.draw_networkx_edge_labels(G, pos,
                              edge_labels=edge_labels,
                              font_size=8)

plt.title('Product Association Network\n(Products frequently bought together)',
          fontsize=16, fontweight='bold', pad=20)
plt.axis('off')
plt.tight_layout()

# Sauvegarder le graphique
plt.savefig("plots/product_associations.pdf", bbox_inches='tight', dpi=300)
print("Product association graph saved as plots/product_associations.pdf")

# Créer aussi un top 10 des paires les plus fréquentes
top_pairs = sorted(product_pairs.items(), key=lambda x: x[1], reverse=True)[:10]

if top_pairs:
    plt.figure(figsize=(10, 6))

    pair_labels = [f"{p1} + {p2}" for (p1, p2), _ in top_pairs]
    frequencies = [freq for _, freq in top_pairs]

    bars = plt.barh(pair_labels, frequencies, color='steelblue')

    # Ajouter les valeurs sur les barres
    for i, (bar, freq) in enumerate(zip(bars, frequencies)):
        plt.text(freq + 0.1, i, str(freq), va='center', fontweight='bold')

    plt.xlabel('Frequency (times bought together)', fontsize=12)
    plt.ylabel('Product Pairs', fontsize=12)
    plt.title('Top 10 Product Pairs Frequently Bought Together',
              fontsize=14, fontweight='bold')
    plt.tight_layout()

    plt.savefig("plots/top_product_pairs.pdf", bbox_inches='tight', dpi=300)
    print("Top product pairs chart saved as plots/top_product_pairs.pdf")
