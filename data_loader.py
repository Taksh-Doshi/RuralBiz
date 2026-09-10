import csv
from typing import Dict, Any, List

def load_village_data(villages_csv_path: str, amenities_csv_path: str) -> List[Dict[str, Any]]:
    """
    Loads census demographics and amenities from clean CSVs.
    Returns a list of village profiles matching the expected schema for logic.py.
    """
    profiles_dict = {}
    
    # 1. Load core demographics
    with open(villages_csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            village_id = str(row['village_code']).strip()
            
            profiles_dict[village_id] = {
                "village_id": village_id,
                "name": row['village_name'],
                "population": int(row['population_2011']),
                "households": int(row['households_2011']),
                # Safe defaults for fields missing from Census data
                "household_income_bands": {
                    "low": {"share_of_households_pct": 50},
                    "typical": {"share_of_households_pct": 40},
                    "higher": {"share_of_households_pct": 10}
                },
                "existing_local_enterprises": [],
                "target_enterprise_type": None
            }

    # 2. Load amenities and map to expected connectivity strings
    with open(amenities_csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            village_id = str(row['village_code']).strip()
            if village_id in profiles_dict:
                
                # Map road access
                road = "pucca_road_all_season" if row.get('all_weather_road') == 'yes' else "kutcha_road_seasonal"
                
                # Map market access
                if row.get('market_mandi') == 'yes':
                    market = "daily_local_market_plus_town_access"
                elif row.get('market_haat') == 'yes':
                    market = "daily_local_market"
                else:
                    market = "weekly_haat_only"
                
                # Map internet
                internet = "4G_available" if row.get('internet_available') == 'yes' else "2G/3G_intermittent"

                profiles_dict[village_id]["connectivity"] = {
                    "road": road,
                    "market_day_access": market,
                    "internet": internet
                }

    # logic.py expects a list of dictionaries, not a dict of dicts
    return list(profiles_dict.values())

# Load the real Census data into memory globally
REAL_VILLAGE_DATA = load_village_data("villages.csv", "amenities.csv")