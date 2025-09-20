document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("preview");
  const classifyBtn = document.getElementById("classify-btn");
  const modelSelect = document.getElementById("model-select");
  const heatmapImg = document.getElementById("heatmap");
  const HF_API_URL = "https://arunbaigra-skinlesionai.hf.space/predict";

  // Drag & Drop
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault(); dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) handleImage(e.dataTransfer.files[0]);
  });

  // File input
  fileInput.addEventListener("change", e => { if (e.target.files.length) handleImage(e.target.files[0]); });

  function handleImage(file) {
    if (!file.type.startsWith("image/")) return alert("Please upload an image file.");
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = "block";
      resetResults();
    };
    reader.readAsDataURL(file);
  }

  function resetResults() {
    document.getElementById("result-section").style.display = "none";
    document.getElementById("predicted-class").textContent = "-";
    document.getElementById("confidence-score").textContent = "-";
    document.getElementById("prediction-time").textContent = "-";
    heatmapImg.src = "";
    if (window.probChart) window.probChart.destroy();
  }

  classifyBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    const modelChoice = modelSelect.value;
    if (!file || !modelChoice) return alert("Please upload an image and select a model.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model_choice", modelChoice);

    try {
      const res = await fetch(HF_API_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error: " + res.status);
      const data = await res.json();

      document.getElementById("result-section").style.display = "block";
      document.getElementById("predicted-class").textContent = data.predicted_class || "-";
      document.getElementById("confidence-score").textContent = data.confidence_score ? `${data.confidence_score}%` : "-";
      document.getElementById("prediction-time").textContent = data.prediction_time_seconds ? `${data.prediction_time_seconds}s` : "-";

      // Grad-CAM heatmap
      if (data.heatmap_image) heatmapImg.src = "data:image/png;base64," + data.heatmap_image;

      // Bar chart
      const ctx = document.getElementById("probs-chart").getContext("2d");
      const labels = Object.keys(data.all_class_probabilities);
      const probs = Object.values(data.all_class_probabilities);

      if (window.probChart) window.probChart.destroy();
      window.probChart = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "Probability (%)", data: probs, backgroundColor: "rgba(33, 22, 192, 0.6)" }] },
        options: { scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw + " %" } } } }
      });

    } catch (err) {
      console.error("HF Fetch error:", err);
      alert("Prediction failed: " + err.message);
    }
  });
});
