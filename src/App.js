import 'mapbox-gl/dist/mapbox-gl.css';

import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Box
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SaveIcon from "@mui/icons-material/Save";
import mapboxgl from 'mapbox-gl';
import ToggleButton from '@mui/material/ToggleButton';
import TimelineIcon from '@mui/icons-material/Timeline';

mapboxgl.accessToken = 'pk.eyJ1IjoiZGVubmlzanMiLCJhIjoiY21iM3ByaW04MGVpODJscTJndmhtdzJpMiJ9.nKVReVc3h7T5JQbhFXF5fw';

// Geocode using OpenStreetMap Nominatim
async function getCoordinates(placeName) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`;
  const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await response.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

function MapboxMap({ points, showPath, onMarkerClick }) {
  const mapContainer = React.useRef(null);
  const map = React.useRef(null);
  const markers = React.useRef([]);

  // Initialize map only once
  React.useEffect(() => {
    if (!map.current && points.length) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [points[0].lng, points[0].lat],
        zoom: 5,
      });
    }
    // Cleanup on unmount
    return () => {
      if (map.current && map.current.remove) {
        try {
          map.current.remove();
        } catch (e) {}
        map.current = null;
      }
    };
  }, []); // only on mount/unmount

  // Update markers and fit bounds when points change
  React.useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Group points by rounded lat/lng
    const grouped = {};
    points.forEach((pt, idx) => {
      const lat = Math.round(pt.lat * 1e5) / 1e5;
      const lng = Math.round(pt.lng * 1e5) / 1e5;
      const key = `${lat},${lng}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...pt, idx });
    });

    // Place markers, offsetting if more than one at a location
    Object.values(grouped).forEach(group => {
      const n = group.length;
      group.forEach((pt, i) => {
        let offsetLat = pt.lat;
        let offsetLng = pt.lng;
        if (n > 1) {
          // Offset in a small circle
          const angle = (2 * Math.PI * i) / n;
          const radius = 0.01; // ~1km, adjust for your zoom/needs
          offsetLat += Math.sin(angle) * radius;
          offsetLng += Math.cos(angle) * radius;
        }

        const el = document.createElement('div');
        el.style.background = '#1976d2';
        el.style.color = 'white';
        el.style.borderRadius = '50%';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '15px';
        el.style.border = '2px solid white';
        el.innerText = (pt.idx + 1).toString();
        el.style.cursor = "pointer";
        el.onclick = () => {
          if (onMarkerClick) onMarkerClick(pt.idx);
        };

        const marker = new mapboxgl.Marker(el)
          .setLngLat([offsetLng, offsetLat])
          .addTo(map.current);
        markers.current.push(marker);
      });
    });

    // Fit bounds to all points
    if (points.length) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach(pt => bounds.extend([pt.lng, pt.lat]));
      map.current.fitBounds(bounds, { padding: 40 });
    }
  }, [points, onMarkerClick]);

  // Draw or remove the path when showPath or points change
  React.useEffect(() => {
    if (!map.current) return;

    // Remove old path if exists
    if (map.current.getLayer('itinerary-path')) {
      map.current.removeLayer('itinerary-path');
    }
    if (map.current.getSource('itinerary-path')) {
      map.current.removeSource('itinerary-path');
    }

    if (showPath && points.length > 1) {
      map.current.addSource('itinerary-path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: points.map(pt => [pt.lng, pt.lat])
          }
        }
      });
      map.current.addLayer({
        id: 'itinerary-path',
        type: 'line',
        source: 'itinerary-path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'rgba(51,173,255,0.6)', // light blue, semi-transparent
          'line-width': 2,
          'line-dasharray': [0.5, 2]
        }
      });
    }
  }, [showPath, points]);

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '600px', minWidth: 400 }} />
  );
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getTripEnd(itinerary, startDate) {
  let date = new Date(startDate);
  itinerary.forEach(seg => {
    date.setDate(date.getDate() + seg.nights);
  });
  return formatDate(date);
}

function toIsoDate(dateStr) {
  // Converts MM-DD-YYYY to YYYY-MM-DD
  if (!dateStr) return "";
  const [mm, dd, yyyy] = dateStr.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function App() {
  const [itinerary, setItinerary] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNights, setNewNights] = useState("");
  const [showPath, setShowPath] = useState(true);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For scrolling to table rows
  const rowRefs = useRef([]);

  // Load default JSON on mount
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/itinerary_default.json")
      .then(res => res.json())
      .then(json => {
        setItinerary(json.map(item => ({
          ...item,
          nights: Number(item.nights) || 1
        })));
        // Set start and end dates from the loaded data
        if (json[0]?.arrival_date) setStartDate(toIsoDate(json[0].arrival_date));
        const newStart = json[0]?.arrival_date ? toIsoDate(json[0].arrival_date) : "";
        setEndDate(getTripEnd(json, newStart));
        setLoading(false);
      })
      .catch(() => {
        setItinerary([]);
        setStartDate("");
        setEndDate("");
        setError("Failed to load itinerary_default.json");
        setLoading(false);
      });
  }, []);

  // Calculate arrival/departure dates for each segment
  const segments = [];
  let current = itinerary[0]?.arrival_date
    ? new Date(toIsoDate(itinerary[0].arrival_date))
    : new Date(startDate);

  itinerary.forEach((item, idx) => {
    const arrival = idx === 0
      ? new Date(toIsoDate(item.arrival_date))
      : new Date(current);

    const departure = new Date(arrival);
    departure.setDate(arrival.getDate() + Number(item.nights) || 1);

    segments.push({
      ...item,
      arrival: formatDate(arrival),
      departure: formatDate(departure)
    });

    current = departure;
  });

  // Calculate summary
  const totalDays = Math.max(
    0,
    Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
  );
  const assigned = itinerary.reduce((sum, item) => sum + item.nights, 0);

  // Handlers
  const handleStartDateChange = (e) => setStartDate(e.target.value);
  const handleEndDateChange = (e) => setEndDate(e.target.value);

  const handleNightsChange = (idx, value) => {
    const nights = Math.max(1, parseInt(value) || 1);
    const newItinerary = itinerary.map((item, i) =>
      i === idx ? { ...item, nights } : item
    );
    setItinerary(newItinerary);
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const newItinerary = [...itinerary];
    [newItinerary[idx - 1], newItinerary[idx]] = [newItinerary[idx], newItinerary[idx - 1]];
    setItinerary(newItinerary);
  };

  const handleMoveDown = (idx) => {
    if (idx === itinerary.length - 1) return;
    const newItinerary = [...itinerary];
    [newItinerary[idx], newItinerary[idx + 1]] = [newItinerary[idx + 1], newItinerary[idx]];
    setItinerary(newItinerary);
  };

  const handleRemove = (idx) => {
    const newItinerary = itinerary.filter((_, i) => i !== idx);
    setItinerary(newItinerary);
  };

  // Add entry with geocoding
  const handleAddEntry = async () => {
    if (!newLocation.trim() || !newNights) return;
    setAdding(true);
    const coords = await getCoordinates(newLocation.trim());
    setAdding(false);
    if (
      !coords ||
      typeof coords.lat !== "number" ||
      typeof coords.lng !== "number" ||
      isNaN(coords.lat) ||
      isNaN(coords.lng)
    ) {
      alert("Could not find valid coordinates for this location.");
      return;
    }
    setItinerary([
      ...itinerary,
      {
        location: newLocation.trim(),
        nights: Math.max(1, parseInt(newNights)),
        lat: coords.lat,
        lng: coords.lng
      }
    ]);
    setNewLocation("");
    setNewNights("");
  };

  const handleSave = () => {
    const data = segments.map(item => ({
      location: item.location,
      country: item.country,
      arrival_date: item.arrival,
      nights: item.nights,
      departure_date: item.departure,
      arrival_method: item.arrival_method,
      journey_time: item.journey_time,
      activities: item.activities,
      lat: item.lat,
      lng: item.lng
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "itinerary.json";
    a.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setItinerary(json.map(item => ({
          ...item,
          nights: Number(item.nights) || 1
        })));
        if (json[0]?.arrival_date) setStartDate(toIsoDate(json[0].arrival_date));
        const newStart = json[0]?.arrival_date ? toIsoDate(json[0].arrival_date) : startDate;
        setEndDate(getTripEnd(json, newStart));
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Scroll to row when marker is clicked
  const scrollToRow = idx => {
    const ref = rowRefs.current[idx];
    if (ref && ref.scrollIntoView) {
      // Only scroll the table container, not the whole page
      ref.scrollIntoView({ behavior: "smooth", block: "nearest" });
      window.setTimeout(() => {
        const tableContainer = ref.closest('.MuiTableContainer-root');
        if (tableContainer) {
          const containerRect = tableContainer.getBoundingClientRect();
          const rowRect = ref.getBoundingClientRect();
          // Remove or reduce the offset so the row is not at the very top
          const offset = rowRect.top - containerRect.top - 8; // 8px for padding
          tableContainer.scrollTop += offset - 60; // Try -8 or 0 for minimal offset
        }
      }, 300);
    }
  };

  if (loading) {
    return <Typography sx={{ mt: 4, textAlign: "center" }}>Loading itinerary...</Typography>;
  }
  if (error) {
    return <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>{error}</Typography>;
  }
  if (!itinerary.length) {
    return <Typography sx={{ mt: 4, textAlign: "center" }}>No itinerary data loaded.</Typography>;
  }

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Shadows Into Light', cursive",
          textAlign: "center",
          mb: 2,
          fontWeight: 700,
          letterSpacing: 2
        }}
      >
        Itinerary Planner
      </Typography>

      {/* Controls above table/map */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          value={startDate}
          onChange={handleStartDateChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          size="small"
          value={endDate}
          onChange={handleEndDateChange}
          InputLabelProps={{ shrink: true }}
        />
        <Typography
          className="summary"
          sx={{
            fontWeight: "bold",
            ml: 2,
            color: assigned > totalDays ? "red" : "black"
          }}
        >
          {assigned} of {totalDays} days assigned
        </Typography>
        <Button
          variant="contained"
          component="label"
          color="secondary"
          sx={{ ml: 2 }}
        >
          Upload itinerary.json
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={handleFileUpload}
          />
        </Button>
        <Button
          variant="contained"
          color="primary"
          sx={{ ml: 1 }}
          onClick={handleSave}
        >
          Download itinerary.json
        </Button>
        <ToggleButton
          value="showPath"
          selected={showPath}
          onChange={() => setShowPath(v => !v)}
          sx={{ ml: 2 }}
        >
          <TimelineIcon sx={{ mr: 1 }} />
          {showPath ? "Hide Path" : "Show Path"}
        </ToggleButton>
      </Box>

      {/* Table and Map side by side */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 3, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 400 }}>
          <TableContainer component={Paper} elevation={3} sx={{ height: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ background: "#33adff", color: "white", width: 32, textAlign: "center" }}>#</TableCell>
                  <TableCell sx={{ background: "#33adff", color: "white", minWidth: 60, maxWidth: 90, width: 80 }}>Location</TableCell>
                  <TableCell sx={{ background: "#33adff", color: "white" }}>Country</TableCell>
                  <TableCell sx={{ background: "#33adff", color: "white" }}>Arrival Date</TableCell>
                  <TableCell sx={{ background: "#33adff", color: "white" }}># Nights</TableCell>
                  <TableCell sx={{ background: "#33adff", color: "white" }}>Departure Date</TableCell>
                  <TableCell sx={{ background: "#33adff", color: "white" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {segments.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <TableRow ref={el => (rowRefs.current[idx] = el)}>
                      <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>{idx + 1}</TableCell>
                      <TableCell sx={{ minWidth: 60, maxWidth: 90, width: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.location}
                      </TableCell>
                      <TableCell>{item.country}</TableCell>
                      <TableCell>{item.arrival}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.nights}
                          inputProps={{ min: 1, style: { width: 40, textAlign: "center" } }}
                          onChange={e => handleNightsChange(idx, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>{item.departure}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleMoveUp(idx)} size="small" title="Move Up">
                          <ArrowUpwardIcon />
                        </IconButton>
                        <IconButton onClick={() => handleMoveDown(idx)} size="small" title="Move Down">
                          <ArrowDownwardIcon />
                        </IconButton>
                        <IconButton onClick={() => handleRemove(idx)} size="small" title="Delete">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ background: "#f7fbff", p: 2 }}>
                        <strong>Transport:</strong> {item.arrival_method || "—"}
                        <span style={{ marginLeft: 24 }}>
                          <strong>Transport Time:</strong> {item.journey_time || "—"}
                        </span>
                        <br />
                        <strong>Activities:</strong>
                        <ul style={{ margin: 0, paddingLeft: 24 }}>
                          {Array.isArray(item.activities) && item.activities.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add new entry form */}
          <Box className="entry-form" sx={{ mt: 4, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Enter a New Location
            </Typography>
            <TextField
              label="Location"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              sx={{ mr: 2 }}
              disabled={adding}
            />
            <TextField
              label="# Nights"
              type="number"
              value={newNights}
              onChange={e => setNewNights(e.target.value)}
              sx={{ mr: 2, width: 100 }}
              inputProps={{ min: 1 }}
              disabled={adding}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddEntry}
              disabled={adding}
            >
              {adding ? "Adding..." : "Add Location"}
            </Button>
          </Box>

          <Button
            id="saveBtn"
            variant="contained"
            color="secondary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ mt: 2, fontWeight: "bold" }}
          >
            Save to itinerary.json
          </Button>
        </Box>

        {/* Mapbox Map on the right */}
        <Box
          sx={{
            flex: 1,
            minWidth: 400,
            position: "sticky",
            top: 32,
            alignSelf: "flex-start",
            height: "600px"
          }}
        >
          <MapboxMap
            points={segments.filter(s => typeof s.lat === "number" && typeof s.lng === "number" && !isNaN(s.lat) && !isNaN(s.lng)).map(s => ({ lat: s.lat, lng: s.lng }))}
            showPath={showPath}
            onMarkerClick={scrollToRow}
          />
        </Box>
      </Box>
    </Container>
  );
}

export default App;