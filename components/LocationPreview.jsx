
"use client"; 
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS here
import L from 'leaflet'; // Import L here - it's safe inside a client component

// It's good practice to handle potential Leaflet icon issues here too
const setupLeafletIcons = () => {
    // Check if running in a browser environment before manipulating L
    if (typeof window !== 'undefined') {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }
};

const LocationPreview = ({ location }) => {
  useEffect(() => {
    setupLeafletIcons();
  }, []);

  // Add more robust validation
  if (!location?.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    console.warn("Invalid location coordinates received:", location?.coordinates);
    return <div className="h-36 flex items-center justify-center border rounded-md bg-gray-100 text-red-500 text-sm p-2">Invalid coordinates</div>;
  }

  const [lat, lng] = location.coordinates;

  // Validate that lat and lng are numbers
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    console.warn("Non-numeric coordinates received:", [lat, lng]);
    return <div className="h-36 flex items-center justify-center border rounded-md bg-gray-100 text-red-500 text-sm p-2">Invalid coordinate values</div>;
  }

  // Add a key based on coordinates to potentially help force re-renders if needed
  const mapKey = `<span class="math-inline">\{lat\}\-</span>{lng}-${Date.now()}`;

  return (
    <div className="h-36 z-[1001] rounded-md overflow-hidden mt-2">
      <MapContainer
        center={[location.coordinates[0], location.coordinates[1]]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[location.coordinates[0], location.coordinates[1]]}>
          <Popup>
            {`Lat: ${location.coordinates[0]}, Lng: ${location.coordinates[1]}`}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default LocationPreview;