"use client";
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

const LocationPicker = ({ onLocationConfirm }) => {
  const [position, setPosition] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const LocationMarker = () => {
    const map = useMap();
    useEffect(() => {
      if (position) {
        map.setView(position, 13); // Center the map on the new position
      }
    }, [map, position]);

    useMapEvents({
      click(e) {
        setPosition(e.latlng);
      },
    });

    return position === null ? null : (
      <Marker position={position}></Marker>
    );
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}`);
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });
      } else {
        alert('No results found');
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
      alert('An error occurred while searching for the location.');
    }
  };

  const clearPosition = () => {
    setPosition(null);
    setSearchTerm('');
  };

  const confirmPosition = () => {
    if (position) {
      onLocationConfirm(`${position.lat},${position.lng}`);
    } else {
      alert('No position selected to confirm.');
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row mb-2 gap-2">
        <input 
          type="text" 
          placeholder="Search for a location"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-r-none"
        />
        <div className="flex gap-1">
          <button 
            onClick={handleSearch} 
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg sm:rounded-none hover:bg-blue-600"
          >
            Search
          </button>
          <button 
            onClick={clearPosition} 
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg sm:rounded-r-lg sm:rounded-l-none hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>
      <MapContainer 
        center={[11.0080177, 76.9501661]} 
        zoom={13} 
        style={{ height: '300px', width: '100%' }}
        className="mb-2 rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
      </MapContainer>
      <button 
        onClick={confirmPosition} 
        className="w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"
      >
        Confirm Location
      </button>
    </div>
  );
};

export default LocationPicker;