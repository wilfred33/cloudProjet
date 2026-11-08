import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import json

# Read the trending products JSON data
data = json.loads(open('result_set.json').read())

# Extract trending products from the response
if 'trending' in data:
    products = data['trending']
    df = pd.DataFrame(products)

    # Use product name as key and totalSold as value
    df_plot = pd.DataFrame({
        'key': df['name'],
        'value': df['totalSold']
    })
else:
    print("Error: No 'trending' data found in the response")
    exit(1)

sns.set_theme(style="whitegrid")

plt.figure(figsize=(10, 6))
bars = sns.barplot(x='key', y='value', data=df_plot, palette="viridis")

plt.title('Top Selling Products', fontsize=16, fontweight='bold')
plt.ylabel('Total Sold', fontsize=12)
plt.xlabel('Products', fontsize=12)
plt.xticks(rotation=45, ha='right')

# Add value labels on top of bars
for i, bar in enumerate(bars.patches):
    bars.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.3,
             f'{int(bar.get_height())}', ha='center', va='bottom', fontsize=10)

plt.tight_layout()
plt.savefig("histogram.pdf", bbox_inches='tight')
print("Histogram saved as histogram.pdf")
