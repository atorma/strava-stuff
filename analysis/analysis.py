import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

df = pd.read_csv("../export.csv", names=[
    'id',
    'type',
    'datetime',
    'moving_time',
    'elapsed_time',
    'distance',
    'speed',
    'power',
    'w_power',
    'device_power',
    'hr',
    'cadence',
    'elevation_gain',
    'trainer'
], parse_dates=['datetime'], index_col='datetime')
df['device_power'] = df['device_power'].apply(lambda x: False if np.isnan(x) else x)
df['outdoor'] = (~df['trainer']) & (df['type'] != 'VirtualRide')
df.loc[df['type'] == 'VirtualRide', 'type'] = 'Ride'
df.loc[df['type'] == 'WeightTraining', 'type'] = 'Workout'
df['type'] = df['type'].astype('category')
df.sort_index(inplace=True, ascending=False)

# Bad data
df.loc[(df['type'] == 'Run') & (df['speed'] > 5), 'speed'] = np.nan
df.loc[(df['type'] == 'Run') & (df['hr'] < 100), 'hr'] = np.nan
df.loc[(df['id'] == 3577181319), 'hr'] = np.nan

rest_hr = 60
df['norm_hr'] = np.nan
for act_type in df['type'].unique():
    mask = df['type'] == act_type
    hr = df[mask]['hr']
    mean_hr = hr.mean()
    df.loc[mask, 'norm_hr'] = (df[mask]['hr'] - rest_hr) / (mean_hr - rest_hr)


df['speed_eff'] = df['speed'] / df['norm_hr']
df['power_eff'] = df['w_power'] / df['norm_hr']
df.loc[(~df['device_power']), 'power_eff'] = np.nan
