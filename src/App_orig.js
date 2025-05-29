import React, { useState } from "react";
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Stack
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";

const initialData = [
  {
    location: "Paris",
    country: "France",
    arrival_date: "2025-05-20",
    nights: 3,
    arrival_method: "Plane",
    journey_time: "2h",
    activities: ["Eiffel Tower", "Louvre"],
    lat: 48.8566,
    lng: 2.3522
  },
  {
    location: "Berlin",
    country: "Germany",
    arrival_date: "2025-05-23",
    nights: 2,
    arrival_method: "Train",
    journey_time: "4h",
    activities: ["Brandenburg Gate", "Museum Island"],
    lat: 52.52,
    lng: 13.405
  }
];

function App() {
  const [data, setData] = useState(initialData);

  // Adjust nights and recalculate arrival dates
  const adjustNights = (idx, delta) => {
    const newData = [...data];
    newData[idx].nights = Math.max(0, newData[idx].nights + delta);

    // Recalculate arrival dates for subsequent entries
    for (let i = idx + 1; i < newData.length; i++) {
      const prev = newData[i - 1];
      const prevDate = new Date(prev.arrival_date);
      prevDate.setDate(prevDate.getDate() + prev.nights);
      newData[i].arrival_date = prevDate.toISOString().slice(0, 10);
    }
    setData(newData);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Itinerary Editor
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Location</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Arrival Date</TableCell>
              <TableCell align="center">Nights</TableCell>
              <TableCell>Arrival Method</TableCell>
              <TableCell>Journey Time</TableCell>
              <TableCell>Activities</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.country}</TableCell>
                <TableCell>{item.arrival_date}</TableCell>
                <TableCell align="center">
                  <Stack direction="column" spacing={0.5} alignItems="center" justifyContent="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => adjustNights(idx, 1)}
                      aria-label="increase nights"
                    >
                      <AddCircleIcon />
                    </IconButton>
                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                      {item.nights}
                    </Typography>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => adjustNights(idx, -1)}
                      aria-label="decrease nights"
                    >
                      <RemoveCircleIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
                <TableCell>{item.arrival_method}</TableCell>
                <TableCell>{item.journey_time}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {item.activities.map((a, i) => (
                      <Chip key={i} label={a} variant="outlined" />
                    ))}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default App;