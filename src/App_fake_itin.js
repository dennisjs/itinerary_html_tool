import React, { useState } from "react";
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

const initialData = [
  {
    location: "Paris",
    nights: 3,
  },
  {
    location: "Berlin",
    nights: 2,
  }
];

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

function App() {
  const [itinerary, setItinerary] = useState(initialData);
  const [startDate, setStartDate] = useState("2025-05-20");
  const [endDate, setEndDate] = useState(getTripEnd(initialData, "2025-05-20"));
  const [newLocation, setNewLocation] = useState("");
  const [newNights, setNewNights] = useState("");

  // Calculate arrival/departure dates for each segment
  const segments = [];
  let current = new Date(startDate);
  itinerary.forEach((item) => {
    const arrival = new Date(current);
    const departure = new Date(current);
    departure.setDate(arrival.getDate() + item.nights);
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

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ background: "#33adff", color: "white" }}>Location</TableCell>
              <TableCell sx={{ background: "#33adff", color: "white" }}>Arrival Date</TableCell>
              <TableCell sx={{ background: "#33adff", color: "white" }}># Nights</TableCell>
              <TableCell sx={{ background: "#33adff", color: "white" }}>Departure Date</TableCell>
              <TableCell sx={{ background: "#33adff", color: "white" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {segments.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.arrival}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={item.nights}
                    inputProps={{ min: 1, style: { width: 60 } }}
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