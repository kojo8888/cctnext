import Head from "next/head";
import { ArrowDownCircle } from "react-feather";
import React, { useState } from "react";
import {
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Typography,
} from "@mui/material";

export default function Reifendruck() {
  const [weight, setWeight] = useState(50); // Initial weight value set to 50
  const [condition, setCondition] = useState(false); // false = dry, true = wet
  const [roadType, setRoadType] = useState("tarmac"); // 'tarmac', 'gravel', or 'MTB'
  const [tireSize, setTireSize] = useState("700x25c");
  const [calculatedPressure, setCalculatedPressure] = useState(null); // State for showing the calculated pressure

  // Handler to update weight from slider
  const handleWeightChange = (e, newValue) => setWeight(newValue);
  const handleConditionChange = (e) => setCondition(e.target.checked);
  const handleRoadTypeChange = (e) => setRoadType(e.target.value);
  const handleTireSizeChange = (e) => setTireSize(e.target.value);

  // Function to calculate pressure based on weight, tire size, condition, and road type
  const calculatePressure = (weight, tireSize, condition, roadType) => {
    // Tire size factor (T)
    const tireSizeFactors = {
      "700x25c": 25,
      "700x28c": 28,
      "29x2.1": 60,
      "26x2.0": 55,
    };

    // Condition and road type factor (F)
    const conditionFactor = condition ? 0.95 : 1.0; // Wet = 0.95, Dry = 1.0
    const roadTypeFactors = {
      tarmac: 1.0,
      gravel: 0.9,
      MTB: 0.8,
    };

    // Get tire size factor
    const T = tireSizeFactors[tireSize] || 25; // default to 700x25c if not found
    // Get road type factor
    const F = conditionFactor * (roadTypeFactors[roadType] || 1.0); // default to 1.0 for tarmac

    // Calculate pressure
    const pressure = (weight / T) * F + 4.2;
    return pressure.toFixed(1); // return 2 decimal places
  };

  // Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    const pressure = calculatePressure(weight, tireSize, condition, roadType);
    setCalculatedPressure(pressure);
  };

  return (
    <div className="font-mono mt-10 mx-auto text-center max-w-lg px-10">
      <Head>
        <title>Reifendruck</title>
        <meta
          name="description"
          content="Tool zum Berechnen des Reifendrucks"
          key="desc"
        />
        <meta property="og:title" content="Reifendruck" />
        <meta
          property="og:description"
          content="Tool zum Berechnen des Reifendrucks"
        />
        <meta
          property="og:image"
          content="https://www.customcyclingtracks.com/Logo.png"
        />
      </Head>
      <div className="mb-9">
        <p className="flex justify-center mt-6">
          <ArrowDownCircle color="black" />
        </p>
        <p className="mt-9 text-3xl font-extrabold text-gray-900 tracking-tight">
          Reifendruck!!!
        </p>

        <p className="mt-9 mb-9 text-xl font-extrabold text-gray-900 tracking-tight">
          Wie viel bar, wann und wo?
        </p>
      </div>
      <div className="px-6 py-3">
        <form
          onSubmit={handleSubmit}
          style={{ maxWidth: "500px", margin: "auto", padding: "20px" }}
        >
          {/* Weight Slider */}
          <div className="form-group">
            <Typography gutterBottom variant="h6">
              Weight (kg): {weight}
            </Typography>
            <Slider
              value={weight}
              onChange={handleWeightChange}
              aria-labelledby="weight-slider"
              valueLabelDisplay="auto"
              step={1}
              min={50}
              max={100}
            />
          </div>

          {/* Wet/Dry Condition Switch */}
          <FormControlLabel
            control={
              <Switch checked={condition} onChange={handleConditionChange} />
            }
            label={`Condition: ${condition ? "Wet" : "Dry"}`}
            style={{ marginTop: "20px" }}
          />

          {/* Road Type Select */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="road-type-label">Road Type</InputLabel>
            <Select
              labelId="road-type-label"
              id="road-type-select"
              value={roadType}
              onChange={handleRoadTypeChange}
              label="Road Type"
            >
              <MenuItem value="tarmac">Tarmac</MenuItem>
              <MenuItem value="gravel">Gravel</MenuItem>
              <MenuItem value="MTB">MTB</MenuItem>
            </Select>
          </FormControl>

          {/* Tire Size Dropdown */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="tire-size-label">Tire Size</InputLabel>
            <Select
              labelId="tire-size-label"
              id="tire-size-select"
              value={tireSize}
              onChange={handleTireSizeChange}
              label="Tire Size"
            >
              <MenuItem value="700x25c">700x25c</MenuItem>
              <MenuItem value="700x28c">700x28c</MenuItem>
              <MenuItem value="29x2.1">29x2.1</MenuItem>
              <MenuItem value="26x2.0">26x2.0</MenuItem>
            </Select>
          </FormControl>

          {/* Submit Button */}
          <Button
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            style={{ marginTop: "20px" }}
          >
            Berechnen
          </Button>
        </form>

        {/* Display calculated pressure */}
        {calculatedPressure && (
          <div className="mt-6">
            <Typography variant="h5" color="primary">
              Empfohlener Reifendruck: {calculatedPressure} bar
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}
