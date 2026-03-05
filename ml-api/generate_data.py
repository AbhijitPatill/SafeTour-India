import pandas as pd
import numpy as np

np.random.seed(42)

# Normal tourist movement in India
normal = []
for _ in range(800):
    lat = np.random.uniform(8.0, 37.0)
    lng = np.random.uniform(68.0, 97.0)
    speed = np.random.uniform(0, 60)       # km/h normal
    time_in_zone = np.random.uniform(1, 120)  # minutes
    activity = np.random.choice([0, 1, 2])    # 0=leisure, 1=adventure, 2=transit
    normal.append([lat, lng, speed, time_in_zone, activity, 0])

# Anomalous movement
anomalous = []
for _ in range(200):
    lat = np.random.uniform(8.0, 37.0)
    lng = np.random.uniform(68.0, 97.0)
    speed = np.random.uniform(150, 500)    # impossibly fast
    time_in_zone = np.random.uniform(200, 600)  # stuck too long
    activity = np.random.choice([0, 1, 2])
    anomalous.append([lat, lng, speed, time_in_zone, activity, 1])

df = pd.DataFrame(
    normal + anomalous,
    columns=['lat', 'lng', 'speed', 'time_in_zone', 'activity_type', 'is_anomaly']
)
df.to_csv('training_data.csv', index=False)
print(f"✅ Generated {len(df)} records")