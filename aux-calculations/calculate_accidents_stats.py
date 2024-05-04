import sqlite3
import pandas as pd
import matplotlib.pyplot as plt

import folium
from folium.plugins import HeatMap
import json

import datetime


# get all accidents, no vehicle details, no passenger details
conn = sqlite3.connect("database/path/accidents.db")
sqlstr = f"""
    SELECT zzz_incidents.incident_id, aaa_types.type,
    aaa_voivodeships.voivodeship, aaa_districts.region, aaa_communes.commune, lat, lng,
    unix_timestamp, date, time, period, year, month,
    light, weather,
    aaa_places.place, aaa_places_surface_conds.place_surface_cond
    FROM zzz_incidents
    INNER JOIN aaa_types ON type_id = aaa_types.nid

    INNER JOIN aaa_voivodeships ON voivodeship_id = aaa_voivodeships.nid
    INNER JOIN aaa_districts ON district_id = aaa_districts.nids
    INNER JOIN aaa_communes ON commune_id = aaa_communes.nid

    INNER JOIN aaa_cond_light ON cond_light_id = aaa_cond_light.nid
    INNER JOIN aaa_cond_weather ON cond_weather_id = aaa_cond_weather.nid

    INNER JOIN aaa_place_markings ON place_markings_id = aaa_place_markings.nid
    INNER JOIN aaa_place_terrains ON place_terrain_type_id = aaa_place_terrains.nid
    INNER JOIN aaa_places ON place_id = aaa_places.nid
    INNER JOIN aaa_places_cross_types ON place_cross_type_id = aaa_places_cross_types.nid
    INNER JOIN aaa_places_geometries ON place_geometry_id = aaa_places_geometries.nid
    INNER JOIN aaa_places_road_types ON place_road_type_id = aaa_places_road_types.nid
    INNER JOIN aaa_places_roadlights ON place_roadlights_id = aaa_places_roadlights.nid
    INNER JOIN aaa_places_speed_limits ON place_speed_limit_id = aaa_places_speed_limits.nid
    INNER JOIN aaa_places_surface_conds ON place_surface_cond_id = aaa_places_surface_conds.nid
    INNER JOIN aaa_places_surface_types ON place_surface_type_id = aaa_places_surface_types.nid

    WHERE type_id IS NOT NULL;
"""
c = conn.cursor()
c.execute(sqlstr)
accidents = c.fetchall()
conn.close()

headers = [
    "incident_id", "type",
    "voivodeship", "region", "commune", "lat", "lng",
    "unix_timestamp", "date", "time", "period", "year", "month",
    "light", "weather",
    "place", "place_surface_condition"
]
accidents = [{k:v for k, v in zip(headers, x)} for x in accidents]
df = pd.DataFrame.from_records(accidents)
df['date_formatted'] = pd.to_datetime(df['date'])


# get all participants
conn = sqlite3.connect("database/path/accidents.db")
sqlstr = f"""
    SELECT zzz_participants.nid, zzz_participants.incident_id, bbb_vehicle_types.vehicle_type, bbb_vehicle_details.vehicle_detail
    FROM zzz_participants
    LEFT JOIN bbb_vehicle_types ON zzz_participants.vehicle_type_id = bbb_vehicle_types.nid
    LEFT JOIN bbb_vehicle_details ON zzz_participants.vehicle_detail_id = bbb_vehicle_details.nid
    LEFT JOIN bbb_vehicle_models ON zzz_participants.vehicle_model_id = bbb_vehicle_models.nid
"""
c = conn.cursor()
c.execute(sqlstr)
participants = c.fetchall()
conn.close()


headers = [
    "vehicle_id", "incident_id", "vehicle_type", "vehicle_detail"
]
participants = [{k:v for k, v in zip(headers, x)} for x in participants]
df_participants = pd.DataFrame.from_records(participants)


# get all passengers
conn = sqlite3.connect("database/path/accidents.db")
sqlstr = f"""
    SELECT zzz_passengers.incident_id, zzz_passengers.vehicle_id,
    ccc_passenger_types.passenger_type, zzz_passengers.born, zzz_passengers.born_year, zzz_passengers.gender,
    ccc_rights.rights, zzz_passengers.driving_experience, ccc_under_influences.under_influence,
    ccc_injuries.injury, ccc_penalties.penalty, ccc_faults.fault
    FROM zzz_passengers
    LEFT JOIN ccc_passenger_types ON zzz_passengers.passenger_type_id = ccc_passenger_types.nid
    LEFT JOIN ccc_rights ON zzz_passengers.rights_id = ccc_rights.nid
    LEFT JOIN ccc_under_influences ON zzz_passengers.under_influence_id = ccc_under_influences.nid
    LEFT JOIN ccc_injuries ON zzz_passengers.injury_id = ccc_injuries.nid
    LEFT JOIN ccc_penalties ON zzz_passengers.penalty_id = ccc_penalties.nid
    LEFT JOIN ccc_faults ON zzz_passengers.fault_id = ccc_faults.nid
"""
c = conn.cursor()
c.execute(sqlstr)
passengers = c.fetchall()
conn.close()


headers = [
    "incident_id", "vehicle_id",
    "passenger_type", "born", "born_year", "gender",
    "rights", "driving_experience", "under_influence", "injury", "penalty", "fault",
]
passengers = [{k:v for k, v in zip(headers, x)} for x in passengers]
df_passengers = pd.DataFrame.from_records(passengers)



df['involved_bicycle'] = df['incident_id'].isin(df_participants[df_participants.vehicle_type == "Rower"]['incident_id'])
df['pedestrian_born_year'] = df['incident_id'].map(pedestrians_age_dict)
df['pedestrian_age'] = df["year"] - df['pedestrian_born_year']
df['involved_pedestrian'] = df['incident_id'].isin(df_participants[df_participants.vehicle_type == "Pieszy"]['incident_id'])
df['involved_pedestrian_below18'] = df.apply(lambda x: x["involved_pedestrian"] and x["pedestrian_age"] and x["pedestrian_age"] < 18, axis=1)

df['injury_minor'] = df['incident_id'].isin(df_passengers[df_passengers.injury == "Ranny lekko"]['incident_id'])
df['injury_major'] = df['incident_id'].isin(df_passengers[df_passengers.injury == "Ranny ciężko"]['incident_id'])
df['injury_death_30days'] = df['incident_id'].isin(df_passengers[df_passengers.injury == "Śmierć w ciągu 30 dni"]['incident_id'])
df['injury_death_instant'] = df['incident_id'].isin(df_passengers[df_passengers.injury == "Smierć na miejscu"]['incident_id'])

df['intoxicated_alcohol'] = df['incident_id'].isin(df_passengers[(df_passengers.under_influence == "Alkoholu") & (df_passengers.passenger_type == "Kierujący")]['incident_id'])
df['intoxicated_drugs'] = df['incident_id'].isin(df_passengers[(df_passengers.under_influence == "Innego środka") & (df_passengers.passenger_type == "Kierujący")]['incident_id'])


### General numbers
df_counts = df.groupby(["year", "date_formatted"]).count().reset_index()[["year", "date_formatted", "incident_id"]]
df_counts.rename(columns={"date_formatted": "date", "incident_id": "count"}, inplace=True)
df_counts.to_csv("output/path/total-accidents-by-days.csv", index=False)

### Bicycles
df_counts = df[df['involved_bicycle']==True].groupby(["year", "date_formatted"]).count().reset_index()[["year", "date_formatted", "incident_id"]]
df_counts.rename(columns={"date_formatted": "date", "incident_id": "count"}, inplace=True)
df_counts.to_csv('output/path/bicycle-accidents-by-days.csv', index=False)

avg_count_bikes_before = len(df[(df['involved_bicycle']==True) & (df['date']>="2010-05-21") & (df['date']<"2011-05-21")])/12
avg_count_bikes_in_year_of_intro = len(df[(df['involved_bicycle']==True) & (df['date']>="2011-05-21") & (df['date']<"2012-05-21")])/12
avg_count_bikes_in_following_years = len(df[(df['involved_bicycle']==True) & (df['date']>="2012-05-21") & (df['date']<"2022-05-21")])/120

avg_count_bikes_injury_before = len(df[(
    (df['injury_minor']==True) | (df['injury_major']==True) | (df['injury_death_30days']==True) | (df['injury_death_instant']==True)
) & (df['involved_bicycle']==True) & (df['date']>="2010-05-21") & (df['date']<"2011-05-21")])/12
avg_count_bikes_injury_in_year_of_intro = len(df[(
    (df['injury_minor']==True) | (df['injury_major']==True) | (df['injury_death_30days']==True) | (df['injury_death_instant']==True)
) & (df['involved_bicycle']==True) & (df['date']>="2011-05-21") & (df['date']<"2012-05-21")])/12
avg_count_bikes_injury_in_following_years = len(df[(
    (df['injury_minor']==True) | (df['injury_major']==True) | (df['injury_death_30days']==True) | (df['injury_death_instant']==True)
) & (df['involved_bicycle']==True) & (df['date']>="2012-05-21") & (df['date']<"2022-05-21")])/120

avg_count_all_before = len(df[(df['date']>="2010-05-21") & (df['date']<"2011-05-21")])/12
avg_count_all_in_year_of_intro = len(df[(df['date']>="2011-05-21") & (df['date']<"2012-05-21")])/12
avg_count_all_in_following_years = len(df[(df['date']>="2012-05-21") & (df['date']<"2022-05-21")])/120

# Number of accidents with bikes involved
print(round(avg_count_bikes_before, 0))
print(round(avg_count_bikes_in_year_of_intro, 0))
print(round(avg_count_bikes_in_following_years, 0))
# Number of accidents with bikes involved where people injured
print(round(avg_count_bikes_injury_before, 0))
print(round(avg_count_bikes_injury_in_year_of_intro, 0))
print(round(avg_count_bikes_injury_in_following_years, 0))
# share of accidents with bikes involved in total accidents
print(  round((avg_count_bikes_before / avg_count_all_before) * 100, 1)  )
print(  round((avg_count_bikes_in_year_of_intro / avg_count_all_in_year_of_intro) * 100, 1)  )
print(  round((avg_count_bikes_in_following_years / avg_count_all_in_following_years) * 100, 1)  )

### Pedestrians
df_counts = df[(df["place"]=="Przejście dla pieszych") & (df['involved_pedestrian']==True)].groupby(["year", "date_formatted"]).count().reset_index()[["year", "date_formatted", "incident_id"]]
df_counts.rename(columns={"date_formatted": "date", "incident_id": "count"}, inplace=True)
df_counts.to_csv('output/path/pedestrians-accidents-by-days.csv', index=False)

avg_count_pedestrian_previous_years = len(df[(df["place"]=="Przejście dla pieszych") & (df['involved_pedestrian']==True) & (df['date']>="2010-06-01") & (df['date']<"2020-05-31")])/120
avg_count_pedestrian_before = len(df[(df["place"]=="Przejście dla pieszych") & (df['involved_pedestrian']==True) & (df['date']>="2020-06-01") & (df['date']<"2021-05-31")])/12
avg_count_pedestrian_in_year_of_intro = len(df[(df["place"]=="Przejście dla pieszych") & (df['involved_pedestrian']==True) & (df['date']>="2021-06-01") & (df['date']<"2022-05-31")])/12

avg_count_pedestrian_injury_previous_years = len(df[(df["place"]=="Przejście dla pieszych") & (
    (df['injury_minor']==True) | (df['injury_major']==True) | (df['injury_death_30days']==True) | (df['injury_death_instant']==True)
) & (df['involved_pedestrian']==True) & (df['date']>="2010-06-01") & (df['date']<"2020-05-31")])/120
avg_count_pedestrian_injury_before = len(df[(df["place"]=="Przejście dla pieszych") & (
    (df['injury_minor']==True) | (df['injury_major']==True) | (df['injury_death_30days']==True) | (df['injury_death_instant']==True)
) & (df['involved_pedestrian']==True) & (df['date']>="2020-06-01") & (df['date']<"2021-05-31")])/12
avg_count_pedestrian_injury_in_year_of_intro = len(df[(df["place"]=="Przejście dla pieszych") & (
    (df['injury_minor']==True) | (df['injury_major']==True) | (df['injury_death_30days']==True) | (df['injury_death_instant']==True)
) & (df['involved_pedestrian']==True) & (df['date']>="2021-06-01") & (df['date']<"2022-05-31")])/12

avg_count_all_previous_years = len(df[(df['date']>="2010-06-01") & (df['date']<"2020-05-31")])/120
avg_count_all_before = len(df[(df['date']>="2020-06-01") & (df['date']<"2021-05-31")])/12
avg_count_all_in_year_of_intro = len(df[(df['date']>="2021-06-01") & (df['date']<"2022-05-31")])/12


# Number of accidents on pedestrian crossing with pedestrians involved
print(round(avg_count_pedestrian_previous_years, 0))
print(round(avg_count_pedestrian_before, 0))
print(round(avg_count_pedestrian_in_year_of_intro, 0))
print()
# Number of accidents on pedestrian crossing with pedestrians involved where people injured
print(round(avg_count_pedestrian_injury_previous_years, 0))
print(round(avg_count_pedestrian_injury_before, 0))
print(round(avg_count_pedestrian_injury_in_year_of_intro, 0))
print()
# share of accidents on pedestrian crossing with pedestrians involved in total accidents
print(  round((avg_count_pedestrian_previous_years / avg_count_all_previous_years) * 100, 1)  )
print(  round((avg_count_pedestrian_before / avg_count_all_before) * 100, 1)  )
print(  round((avg_count_pedestrian_in_year_of_intro / avg_count_all_in_year_of_intro) * 100, 1)  )


### Types of accidents
df_types = df.groupby(["type"]).count().reset_index()[["type", "incident_id"]].sort_values(by="incident_id", ascending=False)
df_types.rename(columns={"type": "type", "incident_id": "count"}, inplace=True)
df_types.to_csv('output/path/accidents-by-types.csv', index=False)



### Police getting tickets
# get all accidents, no vehicle details, no passenger details
conn = sqlite3.connect("database/path/accidents.db")
sqlstr = f"""
    SELECT zzz_participants.incident_id,
    aaa_types.type,
    bbb_vehicle_types.vehicle_type, bbb_vehicle_details.vehicle_detail,
    ccc_passenger_types.passenger_type, ccc_under_influences.under_influence, ccc_penalties.penalty, ccc_faults.fault
    FROM zzz_participants
    INNER JOIN zzz_passengers ON zzz_participants.nid = zzz_passengers.vehicle_id
    LEFT JOIN bbb_vehicle_types ON zzz_participants.vehicle_type_id = bbb_vehicle_types.nid
    LEFT JOIN bbb_vehicle_details ON zzz_participants.vehicle_detail_id = bbb_vehicle_details.nid
    LEFT JOIN ccc_passenger_types ON zzz_passengers.passenger_type_id = ccc_passenger_types.nid
    LEFT JOIN ccc_under_influences ON zzz_passengers.under_influence_id = ccc_under_influences.nid
    LEFT JOIN ccc_penalties ON zzz_passengers.penalty_id = ccc_penalties.nid
    LEFT JOIN ccc_faults ON zzz_passengers.fault_id = ccc_faults.nid
    INNER JOIN zzz_incidents ON zzz_participants.incident_id = zzz_incidents.incident_id
    LEFT JOIN aaa_types ON zzz_incidents.type_id = aaa_types.nid
    WHERE zzz_incidents.type_id IS NOT NULL;
"""
c = conn.cursor()
c.execute(sqlstr)
accidents = c.fetchall()
conn.close()


headers = [
    "incident_id",
    "type",
    "vehicle_type", "vehicle_detail",
    "passenger_type", "under_influence", "penalty", "fault",
]
accidents = [{k:v for k, v in zip(headers, x)} for x in accidents]
df = pd.DataFrame.from_records(accidents)


df["is_police"] = df["vehicle_detail"].apply(lambda x: True if x=='Pojazd uprzywilejowany Policja' else False)
df["is_fault"] = df['fault'].apply(lambda x: True if x else False)
df["did_anybody_got_penalty"] = df['incident_id'].isin(df[df["penalty"].notna()]["incident_id"])
df["penalty_x"] = df["penalty"].apply(lambda x: x if x else "Brak")
df["fault_x"] = df["fault"].apply(lambda x: x if x else "Brak")

df[(df["did_anybody_got_penalty"]==True)].groupby(["passenger_type", "fault_x", "penalty_x", "is_police"]).count().reset_index()[["passenger_type", "fault_x", "penalty_x", "is_police", "incident_id"]].to_excel("output/path/policja.xlsx")
