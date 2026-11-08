import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import json

data = json.loads(open('result_set.json').read())
df = pd.DataFrame(data['rows'])

sns.set_theme(style="whitegrid")

plt.figure(figsize=(5, 6))
bars = sns.barplot(x='key', y='value', data=df, hue='key', legend=False)

plt.title('Total movies for each category')
plt.ylabel('Number of Movies')
plt.xlabel('')
bars.set_xticklabels([])

handles = [plt.Rectangle((0,0),1,1, color=bars.patches[i].get_facecolor()) for i in range(len(df))]
plt.legend(handles, df['key'], title="Category", bbox_to_anchor=(1.05, 1), loc='upper left')

plt.savefig("histogram.pdf", bbox_inches='tight')