document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("preview");
  const classifyBtn = document.getElementById("classify-btn");
  const modelSelect = document.getElementById("model-select");
  const resultSection = document.getElementById("result-section");
  const heatmapImg = document.getElementById("heatmap");
  const predClassEl = document.getElementById("predicted-class");
  const confidenceEl = document.getElementById("confidence-score");
  const predTimeEl = document.getElementById("prediction-time");
  const probsChartCtx = document.getElementById("probs-chart").getContext("2d");

  const HF_API_URL = "https://arunbaigra-skinlesionai.hf.space/predict";

  // --- Drag & Drop ---
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) handleImage(e.dataTransfer.files[0]);
  });

  // --- File input ---
  fileInput.addEventListener("change", (e) => { if (e.target.files.length) handleImage(e.target.files[0]); });

  function handleImage(file) {
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = "block";

      // Reset results
      resultSection.style.display = "none";
      predClassEl.textContent = "-";
      confidenceEl.textContent = "-";
      predTimeEl.textContent = "-";
      heatmapImg.src = "";
      if (window.probChart) window.probChart.destroy();
    };
    reader.readAsDataURL(file);
  }

  // --- Classify button ---
  classifyBtn.addEventListener("click", () => {
    const file = fileInput.files[0];
    const modelChoice = modelSelect.value;
    if (!file || !modelChoice) { alert("Please upload an image and select a model."); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model_choice", modelChoice);

    fetch(HF_API_URL, { method: "POST", body: formData })
      .then(res => { if (!res.ok) throw new Error("Server error: " + res.status); return res.json(); })
      .then(data => {
        // Show result section
        resultSection.style.display = "block";

        // Predicted class & confidence
        predClassEl.textContent = data.predicted_class || "-";
        confidenceEl.textContent = data.confidence_score ? `${data.confidence_score}%` : "-";

        // Prediction time
        predTimeEl.textContent = data.prediction_time_seconds ? `${data.prediction_time_seconds}s` : "-";

        // Heatmap
        if (data.heatmap_image) heatmapImg.src = "data:image/png;base64," + data.heatmap_image;

        // Bar chart
        const labels = Object.keys(data.all_class_probabilities);
        const probs = Object.values(data.all_class_probabilities);

        if (window.probChart) window.probChart.destroy();
        window.probChart = new Chart(probsChartCtx, {
          type: "bar",
          data: {
            labels: labels,
            datasets: [{
              label: "Probability (%)",
              data: probs,
              backgroundColor: "rgba(33, 22, 192, 0.6)"
            }]
          },
          options: {
    scales: {
      y: { beginAtZero: true, max: 100 },
      x: { ticks: { display: false } } // <-- hide x-axis labels
    },
    plugins: {
      tooltip: { callbacks: { label: (ctx) => ctx.raw + " %" } },
      legend: { display: false }
    }
          }
        });
      })
      .catch(err => { console.error("HF Fetch error:", err); alert("Prediction failed: " + err.message); });
  });
});
