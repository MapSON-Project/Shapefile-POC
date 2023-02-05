import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl';
import shp from "shpjs";
// @ts-ignore
import geojsonMerger from '@mapbox/geojson-merge';

function App() {
  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lng, setLng] = useState(-70.9);
  const [lat, setLat] = useState(42.35);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    map.current = new maplibregl.Map({
      container: mapContainer.current as any,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [lng, lat],
      zoom: zoom
    });

    map.current.on('load', () => {
      if (!map.current?.getSource('geojson-map')) {
        map.current?.addSource('geojson-map', {
          type: 'geojson',
          data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_ports.geojson',
          tolerance: 1.2
        });
      }
    });

    map.current.on('mousemove', (e) => {
        setLat(e.lngLat.lat)
        setLng(e.lngLat.lng)
    });

    

    map.current.on('zoom', (e) => {
      setZoom(e.target.getZoom())
    })

  
  }, []);

  const updateLayer = (file: any) => {
    if (Array.isArray(file)){ 
      file = geojsonMerger.merge(file);
      console.log(file);
    }

    const source: maplibregl.GeoJSONSource = map.current?.getSource('geojson-map') as maplibregl.GeoJSONSource;
    source.setData(file);

    if (!map.current?.getLayer('geojson-map-fill')) {
      map.current?.addLayer({
        id: "geojson-map-fill",
        type: "fill",
        source: 'geojson-map',
        paint: {
          "fill-opacity": 0.8,
          "fill-color": "#a88ef5",
          "fill-outline-color": "#20124d"
        },
      });
    }  
  }

  const uploadZipHandler = async(file: File) => {
    if(!file){ 
      console.warn("No file uploaded to zip handler, skipping.")
      return; 
    }

    let geojson = await shp(await file.arrayBuffer());
    console.log(geojson);
    
    updateLayer(geojson);
    
  }

  const uploadFilesHandler = async(files: File[]) => {
    if(!files) { 
      console.warn("No files uploaded to file handler, skipping.")
      return;
    }

    console.log(files)

    const shps = files.filter(file => file.name.includes('.shp'));
    const dbfs = files.filter(file => file.name.includes('.dbf'));
    const cpgs = files.filter(file => file.name.includes(".cpg"));

    const toGeoJSON = async (file: File) => {
      const name = file.name.slice(0, -4);

      let dbfFile = dbfs.find(file => file.name.slice(0, -4) === name)

      let geojson;

      if(dbfFile) {
        let cpgFile = cpgs.find(file => file.name.slice(0, -4) === name) // not sure if needed

        let shpf = shp.parseShp(await file!.arrayBuffer());
        // @ts-ignore 
        let dbf = dbfFile && shp.parseDbf(await dbfFile!.arrayBuffer(),  await cpgFile?.arrayBuffer());

        geojson = shp.combine([shpf, dbf]);
      } else {
        geojson = await shp(await file.arrayBuffer());
      }

      return geojson;
    };

    const geojson = await Promise.all(shps.map(toGeoJSON))
    console.log(geojson);

    updateLayer(geojson)
  
  }

  return (
    <div>
      <div>
        <label>Choose a ZIP to upload: </label>
        <input type="file" 
          id="zip" 
          name="zip-upload"  
          onChange={(e)=>uploadZipHandler(e.target.files![0])}
      />
      </div>

      <div>
        <label>Choose multiple files to upload: </label>
        <input type="file" 
          id="files" 
          name="files-upload"  
          multiple
          onChange={(e)=>uploadFilesHandler([...e.target.files!])}
        />
      </div>

      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

      <div ref={mapContainer} className="map-container"></div>

      
    </div>
  )
}

export default App
