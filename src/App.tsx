import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl';
import shp from "shpjs";

function App() {
  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lng, setLng] = useState(-70.9);
  const [lat, setLat] = useState(42.35);
  const [zoom, setZoom] = useState(9);

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
  }, []);

  const updateLayer = (file: any) => {
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
    const geojson = await shp(await file.arrayBuffer());
    updateLayer(geojson);
  }

  const uploadFilesHandler = async(files: File[]) => {
    const shpFile = files.find(file => file.name.includes('.shp'));
    const dbfFile = files.find(file => file.name.includes('.dbf'));

    const geojson = shp.combine([
      shp.parseShp(await shpFile!.arrayBuffer()), 
      shp.parseDbf(await dbfFile!.arrayBuffer())
    ]);
    
    updateLayer(geojson);
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
