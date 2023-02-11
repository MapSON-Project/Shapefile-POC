import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl';
import shp from "shpjs";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

// @ts-ignore
import * as MapboxDrawWaypoint from 'mapbox-gl-draw-waypoint';
// @ts-ignore
import dissolve from "geojson-dissolve"
import * as turf from '@turf/turf';
// @ts-ignore
import geojsonMerger from '@mapbox/geojson-merge';

function App() {
  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapDraw = useRef<MapboxDraw | null>(null);
  const [lng, setLng] = useState(-70.9);
  const [lat, setLat] = useState(42.35);
  const [zoom, setZoom] = useState(0);
  const [selected, setSelected] = useState([null,null]);
  const [newName, setNewname] = useState('')
  const selectedRef = useRef()
  selectedRef.current = selected

  useEffect(() => {
    map.current = new maplibregl.Map({
      container: mapContainer.current as any,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [lng, lat],
      zoom: zoom
    });

    let modes = MapboxDraw.modes;
    modes = MapboxDrawWaypoint.enable(modes);


    mapDraw.current = new MapboxDraw({
      modes,
      displayControlsDefault: false,
      controls: {
        trash: true
      }    
    });

    map.current.on('load', () => {
      if (!map.current?.getSource('geojson-map')) {
        map.current?.addSource('geojson-map', {
          type: 'geojson',
          data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_ports.geojson',
          tolerance: 1.2,
          generateId: true
        });

        map.current?.addSource('geojson-vertices', {
          type: 'geojson',
          data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_ports.geojson',
          tolerance: 1.2,
          generateId: true
        });
      }
    });

    map.current.on('mousemove', (e) => {
        setLat(e.lngLat.lat)
        setLng(e.lngLat.lng)
    });

    map.current.on('zoom', (e) => {
      setZoom(e.target.getZoom())
    });
  }, []);

  const updateLayer = (file: any) => {
    if (Array.isArray(file)){ 
      file = geojsonMerger.merge(file);
      console.log(file);
    }

    let source: maplibregl.GeoJSONSource = map.current?.getSource('geojson-map') as maplibregl.GeoJSONSource;
    source.setData(file);

    //remove so it can be readded later for refresh
    if(map.current?.hasControl(mapDraw.current)) {
      map.current?.removeControl(mapDraw.current)
    }

    if (!map.current?.getLayer('geojson-map-fill')) {
      map.current?.addLayer({
        id: "geojson-map-fill",
        type: "fill",
        source: 'geojson-map',
        paint: {
          "fill-opacity": [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            1,
            0.2
          ],
          "fill-color": "#12ce93",
          "fill-outline-color": "#131118"
        },
      });

      map.current?.addLayer({
        id: "region-names",
        type: "symbol",
        source: "geojson-map",
        'layout': {
          'text-field': ['case', 
            ['has', 'newName'],
            ['get', 'newName'],
            ["has", "NAME_3"], 
            ["get", "NAME_3"], 
            ["has", "NAME_2"], 
            ["get", "NAME_2"], 
            ["has", "NAME_1"],
            ["get", "NAME_1"],
            ["get", "NAME_0"]
          ],
          'text-anchor': 'center'
        }
      })

      map.current?.on('click', 'geojson-map-fill', (e) => {
        let id = e.features[0].id
        if (selectedRef.current[0] === id || selectedRef.current[1] === id){
          return
        }else{
          let arr = [ ...selectedRef.current ]
          if(arr[0] === null){
            arr[0] = id
          }else if(arr[1] === null){
            arr[1] = id
          }else{
            map.current?.setFeatureState(
              { source: 'geojson-map', id: arr[0] },
              { selected: false }
            );
            arr[0] = arr[1]
            arr[1] = id
          }
          map.current?.setFeatureState(
            { source: 'geojson-map', id: id },
            { selected: true }
          );
          setSelected(arr)
        }
      })

      const vertices = turf.flatten(file);

      // we add this down here so the layer appears above the geojson map
      map.current?.addControl(mapDraw.current)

      mapDraw.current?.deleteAll()
      mapDraw.current?.set(vertices)

    
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

  const mergeRegions = () => {
    if(selectedRef.current[0] === null || selectedRef.current[1] === null){
      alert("Please select two regions to merge")
      return
    }
    const source: maplibregl.GeoJSONSource = map.current.getSource('geojson-map');

    let geojson = source._data
    let features = geojson.features

    const newRegion = dissolve([features[selectedRef.current[0]], features[selectedRef.current[1]]])

    geojson.features[selectedRef.current[0]].properties.newName = newName
    geojson.features[selectedRef.current[0]].geometry = newRegion
    geojson.features.splice(selectedRef.current[1], 1)

    setSelected([null, null])
    setNewname('')

    for(let i=0; i<2; i++){
      map.current?.setFeatureState(
        { source: 'geojson-map', id: selectedRef.current[i] },
        { selected: false }
      );
    }

    source.setData(geojson)
  }


  const handleChange = (e) => {
    setNewname(e.target.value)
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
      <label>
        Enter name for new region:
        <input type="text" value={newName} onChange={(e)=>handleChange(e)} />
      </label>
      <button onClick={mergeRegions} >merge</button>
      {/* <button onClick={removeVertex} >Remove vertex?</button> */}
    </div>
  )
}


export default App
