import { useEffect, useRef } from "react";
import Chart from "chart.js";

export default function RitzelrechnerCharts({
  ritzelArray,
  ühValues,
  ükValues,
  VhValues,
  VkValues,
  DevhValues,
  DevkValues,
  ShValues,
  SkValues,
}) {
  const chartRef = useRef(null);
  const vhVkChartRef = useRef(null);
  const devhDevkChartRef = useRef(null);
  const shSkChartRef = useRef(null);

  useEffect(() => {
    if (chartRef && chartRef.current && ühValues.length > 0) {
      const ctx = chartRef.current.getContext("2d");
      new Chart(ctx, {
        type: "line", // Change the type as needed (line, bar, etc.)
        data: {
          labels: ritzelArray, // Assuming this is an array of labels for the X-axis
          datasets: [
            {
              label: "Übersetzung groß",
              data: ühValues, // The Y-axis data
              fill: false,
              borderColor: "rgb(75, 192, 192)",
              tension: 0.1,
            },
            {
              label: "Übersetzung klein",
              data: ükValues, // The Y-axis data
              fill: false,
              borderColor: "rgb(75, 92, 192)",
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
      if (vhVkChartRef.current) {
        const ctxVhVk = vhVkChartRef.current.getContext("2d");
        new Chart(ctxVhVk, {
          type: "line",
          data: {
            labels: ritzelArray,
            datasets: [
              {
                label: "Geschwindigkeit groß (Vh)",
                data: VhValues,
                fill: false,
                borderColor: "rgb(255, 99, 32)",
                tension: 0.1,
              },
              {
                label: "Geschwindigkeit klein (Vk)",
                data: VkValues,
                fill: false,
                borderColor: "rgb(54, 162, 35)",
                tension: 0.1,
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      }
      if (devhDevkChartRef.current) {
        const ctxDevhDevk = devhDevkChartRef.current.getContext("2d");
        new Chart(ctxDevhDevk, {
          type: "line",
          data: {
            labels: ritzelArray,
            datasets: [
              {
                label: "Entfaltung groß (Devh)",
                data: DevhValues,
                fill: false,
                borderColor: "rgb(155, 99, 132)",
                tension: 0.1,
              },
              {
                label: "Entfaltung klein (Devk)",
                data: DevkValues,
                fill: false,
                borderColor: "rgb(154, 162, 235)",
                tension: 0.1,
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      }
      if (shSkChartRef.current) {
        const ctxShSk = shSkChartRef.current.getContext("2d");
        new Chart(ctxShSk, {
          type: "line",
          data: {
            labels: ritzelArray,
            datasets: [
              {
                label: "Strecke groß (Sh)",
                data: ShValues,
                fill: false,
                borderColor: "rgb(255, 99, 132)",
                tension: 0.1,
              },
              {
                label: "Strecke klein (Sk)",
                data: SkValues,
                fill: false,
                borderColor: "rgb(54, 162, 235)",
                tension: 0.1,
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      }
    }
    // Assuming jsonData.features includes an array of objects with a name property
    const ritzels = jsonData.features
      .filter((feature) => feature.type === "Ritzel")
      .map((feature) => feature.name);
    const kettenblatts = jsonData.features
      .filter((feature) => feature.type === "Kettenblatt")
      .map((feature) => feature.name);
    setRitzelNames(ritzels);
    setKettenblattNames(kettenblatts);
  }, [
    ritzelArray,
    ühValues,
    ükValues,
    VhValues,
    VkValues,
    DevhValues,
    DevkValues,
    ShValues,
    SkValues,
  ]);

  return (
    <div className="mt-3 grid gap-3 grid-cols-1 max-w-3xl mx-auto">
      <div className="bg-white border rounded-2xl">
        <div
          className="chart-container mt-3 max-w-2xl mx-auto"
          style={{ position: "relative", height: "40vh", width: "80vw" }}
        >
          <canvas ref={chartRef}></canvas>
        </div>
        <div
          className="chart-container mt-3 max-w-2xl mx-auto"
          style={{ position: "relative", height: "40vh", width: "80vw" }}
        >
          <canvas ref={vhVkChartRef}></canvas>
        </div>
        <div
          className="chart-container mt-3 max-w-2xl mx-auto"
          style={{ position: "relative", height: "40vh", width: "80vw" }}
        >
          <canvas ref={devhDevkChartRef}></canvas>
        </div>
        <div
          className="chart-container mt-3 max-w-2xl mx-auto"
          style={{ position: "relative", height: "40vh", width: "80vw" }}
        >
          <canvas ref={shSkChartRef}></canvas>
        </div>
      </div>
    </div>
  );
}
