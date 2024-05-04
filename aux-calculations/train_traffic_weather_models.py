import os
import sqlite3
import json
import zipfile

import datetime

import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.linear_model import LinearRegression, Ridge, Lasso, HuberRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.pipeline import make_pipeline
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor

# get weather data
%%time

folder_path = "input/path/zips3"
items = os.listdir(folder_path)
files = [os.path.join(folder_path, item) for item in items if os.path.isfile(os.path.join(folder_path, item))]

column_names = [
    "Kod stacji",
    "Nazwa stacji",
    "Rok",
    "Miesiąc",
    "Absolutna temperatura maksymalna",
    "Status pomiaru TMAX",
    "Średnia temperatura maksymalna",
    "Status pomiaru TMXS",
    "Absolutna temperatura minimalna",
    "Status pomiaru TMIN",
    "Średnia temperatura minimalna",
    "Status pomiaru TMNS",
    "Średnia temperatura miesięczna",
    "Status pomiaru STM",
    "Minimalna temperatura przy gruncie",
    "Status pomiaru TMNG",
    "Miesieczna suma opadów", #mm
    "Status pomiaru SUMM",
    "Maksymalna dobowa suma opadów",
    "Status pomiaru OPMX",
    "Pierwszy dzień wystapienia opadu maksymalnego",
    "Ostatni dzień wystąpienia opadu maksymalnego",
    "Maksymalna wysokość pokrywy śnieżnej", #cm
    "Status pomiaru PKSN",
    "Liczba dni z pokrywą śnieżną",
    "Liczba dni z opadem deszczu",
    "Liczba dni z opadem śniegu",
]

dfs = []
for f in [x for x in files if x.endswith(".zip")]:
    try:
        with zipfile.ZipFile(f, 'r') as z:
            # Get a list of all files in the ZIP archive
            zipped_files = z.namelist()
            for zf in zipped_files:
                if "k_m_d_" in zf:
                    csv_file_name = zf
                    break

            if csv_file_name:
                with z.open(csv_file_name) as csv_file:
                    dfs.append(pd.read_csv(csv_file, encoding='ISO-8859-1', names=column_names))
    except Exception as e:
        print(e)

df = pd.concat(dfs, ignore_index=True)
df["period"] = df.apply(lambda x: datetime.date(x["Rok"], x["Miesiąc"], 1), axis=1)

df_weather = df.groupby("period").agg(
    max_temp=("Średnia temperatura maksymalna", 'mean'),
    min_temp=("Średnia temperatura minimalna", 'mean'),
    avg_temp=("Średnia temperatura miesięczna", 'mean'),
    min_ground_temp=("Minimalna temperatura przy gruncie", 'mean'),
    avg_fall=("Miesieczna suma opadów", 'mean'),
    max_snow=("Maksymalna wysokość pokrywy śnieżnej", 'mean'),
    snow_coverage_days=("Liczba dni z pokrywą śnieżną", 'mean'),
    rain_fall_days=("Liczba dni z opadem deszczu", 'mean'),
    snow_fall_days=("Liczba dni z opadem śniegu", 'mean'),
).reset_index()


# get accidents numbers
df_acc = pd.read_csv("input/path/pedestrians-accidents-by-days.csv")
df_acc["period"] = df_acc["date"].apply(lambda x: datetime.date(int(x.split("-")[0]), int(x.split("-")[1]), 1))
df_acc = df_acc.groupby("period").agg(
    count = ("count", 'sum')
).reset_index()


# get traffic data
df_traffic = pd.read_pickle("input/path/df_traffic.pkl")
df_traffic = df_traffic.groupby("period").agg(
    traffic_volume = ("count", 'mean')
).reset_index()


# merge accidents, traffic and weather data
df_acc = df_acc.merge(df_weather, left_on="period", right_on="period")
df_acc = df_acc.merge(df_traffic, left_on="period", right_on="period")
df_acc["year"] = df_acc["period"].apply(lambda x: x.year)


# evaluate models
variables = ["max_temp", "min_temp", "avg_temp", "min_ground_temp", "avg_fall", "max_snow", "snow_coverage_days", "rain_fall_days", "snow_fall_days", "traffic_volume"]
# exclude years 2020-2022 - for these years predictions will be made
df_train = df_acc[~df_acc["year"].isin([2022, 2021, 2020])]

X = df_train[variables]
y = df_train['count']

X_all = df_acc[variables]
y_all = df_acc['count']

models = {
    "Linear Regression": make_pipeline(
        StandardScaler(),
        LinearRegression()
    ),
    "Polynomial & LinearRegression": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        LinearRegression()
    ),
    "Ridge Regression": make_pipeline(
        StandardScaler(),
        Ridge()
    ),
    "Lasso Regression": make_pipeline(
        StandardScaler(),
        Lasso()
    ),
    "Polynomial & Ridge Regression": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        Ridge()
    ),
    "HuberRegressor": make_pipeline(
        StandardScaler(),
        HuberRegressor()
    ),
    "Polynomial & HuberRegressor": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        HuberRegressor()
    ),
    "Random Forest": make_pipeline(
        StandardScaler(),
        RandomForestRegressor()
    ),
    "Polynomial & Random Forest": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        RandomForestRegressor()
    ),
    "Gradient Boosting": make_pipeline(
        StandardScaler(),
        GradientBoostingRegressor()
    ),
    "Polynomial & Gradient Boosting": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        GradientBoostingRegressor()
    ),
    "XGBoost": make_pipeline(
        StandardScaler(),
        XGBRegressor()
    ),
    "Polynomial & XGBoost": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        XGBRegressor()
    ),
    "LightGBM": make_pipeline(
        StandardScaler(),
        LGBMRegressor(verbose=-1)
    ),
    "CatBoost": make_pipeline(
        StandardScaler(),
        CatBoostRegressor(verbose=0)
    ),
    "Polynomial & CatBoost": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        CatBoostRegressor(verbose=0)
    ),
}

results = {}
for name, model in models.items():
    model.fit(X, y)
    predictions = model.predict(X_all)
    mse = mean_squared_error(y_all, predictions)
    r2 = r2_score(y_all, predictions)
    results[name] = (mse, r2)

# print results
for name, (mse, r2) in results.items():
    print(f"{name} - MSE: {mse:.2f}, R-squared: {r2:.2f}")

df_acc['predicted_count'] = predictions



# train RandomForest
model = make_pipeline(
        StandardScaler(),
        RandomForestRegressor()
    )
model.fit(X, y)
# see the results
predictions = model.predict(df_acc[variables])
df_acc['predicted_count'] = predictions
plt.figure(figsize=(10, 6))
plt.plot(df_acc['period'], df_acc['count'], label='actual count', color='blue', marker='o', linestyle='-', markersize=5)
plt.plot(df_acc['period'], df_acc['predicted_count'], label='predicted count', color='red', marker='x', linestyle='--', markersize=5)
plt.xlabel('date')
plt.ylabel('count')
plt.xticks(rotation=45)
plt.legend()
plt.tight_layout()
plt.show()
# save the results
df_acc["predicted_count"] = df_acc["predicted_count"].apply(lambda x: int(round(x, 0)))
df_acc[["year", "period", "count", "predicted_count"]].to_csv("output/path/pedestrians-random-forest-predicted-accidents-by-months.csv", index=False)

# train Polynomial
model = make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        LinearRegression()
    )
model.fit(X, y)
# see the results
predictions = model.predict(df_acc[variables])
df_acc['predicted_count'] = predictions
plt.figure(figsize=(10, 6))
plt.plot(df_acc['period'], df_acc['count'], label='actual count', color='blue', marker='o', linestyle='-', markersize=5)
plt.plot(df_acc['period'], df_acc['predicted_count'], label='predicted count', color='red', marker='x', linestyle='--', markersize=5)
plt.xlabel('date')
plt.ylabel('count')
plt.xticks(rotation=45)
plt.legend()
plt.tight_layout()
plt.show()
# save the results
df_acc["predicted_count"] = df_acc["predicted_count"].apply(lambda x: int(round(x, 0)))
df_acc[["year", "period", "count", "predicted_count"]].to_csv("output/path/pedestrians-linear-regression-predicted-accidents-by-months.csv", index=False)


# calculate correlation coefficient
df_test = df_acc[~df_acc["year"].isin([2022, 2021, 2020])]
variables = ["max_temp", "min_temp", "avg_temp", "min_ground_temp", "avg_fall", "max_snow", "snow_coverage_days", "rain_fall_days", "snow_fall_days", "traffic_volume"]
for var in variables:
    correlation = df_test['count'].corr(df_test[var])
    print(f"Correlation coefficient count / {var}:", correlation)
