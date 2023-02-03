import { useEffect, useState } from 'react'
import './App.css'
import { MapContainer, TileLayer, GeoJSON  } from 'react-leaflet';
import shp from "shpjs";

function App() {
  const [count, setCount] = useState(0)
  const [geojson, setGeojson] = useState(null)
  const position = [51.505, -0.09]

  useEffect(() => {
    if (geojson) console.log(geojson);
  }, [geojson]);

  const uploadHandler = async(file: File) => {
    const geojsn = await shp(await file.arrayBuffer());
    console.log(geojsn);
    setGeojson(geojsn);
    console.log(geojson);
  }

  var Geojson = null;
  if (geojson) {
    Geojson = <GeoJSON data={geojson} />
  }

  return (
    <div>
    <input type="file" 
        id="myFile" 
        name="filename"  
        onChange={(e)=>uploadHandler(e.target.files![0])}
      />
    <MapContainer center={position} zoom={3}>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {Geojson}
  </MapContainer>
  </div>
  )
}

export default App
