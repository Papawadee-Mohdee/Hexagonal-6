import os
import requests
import zipfile
import geopandas as gpd

def simplify_geojson():
    url = "https://data.humdata.org/dataset/d24bdc45-eb4c-4e3d-8b16-44db02667c27/resource/10dde461-b781-4904-9559-7deb3e960913/download/tha_admin_boundaries.shp.zip"
    zip_path = "tha_admin_boundaries.shp.zip"
    
    # Download if not exists
    if not os.path.exists(zip_path):
        print(f"Downloading {url}...")
        r = requests.get(url, stream=True)
        with open(zip_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                
    # Extract
    extract_dir = "shapefiles"
    if not os.path.exists(extract_dir):
        os.makedirs(extract_dir)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
            
    # Find adm1 shapefile
    adm1_shp = None
    for root, dirs, files in os.walk(extract_dir):
        for file in files:
            if file.endswith('.shp') and 'admin1' in file:
                adm1_shp = os.path.join(root, file)
                break
                
    if not adm1_shp:
        print("Could not find adm1 shapefile!")
        return
        
    print(f"Reading {adm1_shp}...")
    gdf = gpd.read_file(adm1_shp)
    
    print("Simplifying geometry...")
    # Simplify geometry (tolerance in degrees, 0.01 is roughly 1km)
    gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.01, preserve_topology=True)
    
    # Keep only necessary columns
    columns_to_keep = ['adm1_name', 'adm1_name1', 'adm1_pcode']
    available_columns = [c for c in columns_to_keep if c in gdf.columns]
    
    # Output to GeoJSON
    out_file = "thailand_provinces.geojson"
    print(f"Saving to {out_file}...")
    gdf[available_columns + ['geometry']].to_file(out_file, driver='GeoJSON')
    
    # Also save province list to CSV
    gdf[available_columns].to_csv('prov_list.csv', index=False, encoding='utf-8-sig')
    print("Done!")

if __name__ == "__main__":
    simplify_geojson()
