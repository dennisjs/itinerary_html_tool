import React, { useState, useEffect } from "react";
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
  Stack,
  Box
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SaveIcon from "@mui/icons-material/Save";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";


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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        // fallback or error handling
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

  // Update end date when itinerary or startDate changes
  //React.useEffect(() => {
  //  setEndDate(getTripEnd(itinerary, startDate));
  //}, [itinerary, startDate]);

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

  const handleAddEntry = () => {
    if (!newLocation.trim() || !newNights) return;
    setItinerary([
      ...itinerary,
      { location: newLocation.trim(), nights: Math.max(1, parseInt(newNights)) }
    ]);
    setNewLocation("");
    setNewNights("");
  };

  const handleSave = () => {
    const data = segments.map(item => ({
      location: item.location,
      arrival_date: item.arrival,
      nights: item.nights,
      departure_date: item.departure
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
          nights: Number(item.nights) || 1 // ensure nights is a number
        })));
        // Set start date to first arrival_date if present
        if (json[0]?.arrival_date) setStartDate(toIsoDate(json[0].arrival_date));
        const newStart = json[0]?.arrival_date ? toIsoDate(json[0].arrival_date) : startDate;
        setEndDate(getTripEnd(json, newStart));
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Show loading or error messages before rendering the main UI
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
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
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
      </Box>

        <Box sx={{ mb: 2 }}>
            <Button
                variant="contained"
                component="label"
                color="secondary"
                sx={{ mr: 2 }}
            >
                Upload itinerary.json
                <input
                type="file"
                accept="application/json"
                hidden
                onChange={handleFileUpload}
                />
            </Button>
        </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ background: "#33adff", color: "white", minWidth: 80, maxWidth: 120, width: 100  }}>Location</TableCell>
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
                <TableRow>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>{item.country}</TableCell>
                  <TableCell>{item.arrival}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleNightsChange(idx, item.nights - 1)}
                        disabled={item.nights <= 1}
                        aria-label="decrease nights"
                      >
                        <RemoveCircleIcon />
                      </IconButton>
                      <TextField
                        type="number"
                        size="small"
                        value={item.nights}
                        inputProps={{ min: 1, style: { width: 40, textAlign: "center" } }}
                        onChange={e => handleNightsChange(idx, e.target.value)}
                        sx={{ mx: 1 }}
                      />
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleNightsChange(idx, Number(item.nights) + 1)}
                        aria-label="increase nights"
                      >
                        <AddCircleIcon />
                      </IconButton>
                    </Box>
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
                  <TableCell colSpan={6} sx={{ background: "#f7fbff", p: 2 }}>
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
        />
        <TextField
          label="# Nights"
          type="number"
          value={newNights}
          onChange={e => setNewNights(e.target.value)}
          sx={{ mr: 2, width: 100 }}
          inputProps={{ min: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddEntry}
        >
          Add Location
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
    </Container>
  );
}

export default App;