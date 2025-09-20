document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("preview");
  const classifyBtn = document.getElementById("classify-btn");
  const modelSelect = document.getElementById("model-select");

  const HF_API_URL = "https://arunbaigra-skinlesionai.hf.space/predict";

  // Drag & Drop
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault(); dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault(); dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; handleImage(fileInput.files[0]); }
  });

  // File input
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) handleImage(e.target.files[0]);
  });

  function handleImage(file) {
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = "block";
      // Reset result
      document.getElementById("result-section").style.display = "none";
      document.getElementById("predicted-class").textContent = "-";
      document.getElementById("confidence-score").textContent = "-";
      document.getElementById("prediction-time").textContent = "-";
      document.getElementById("heatmap").src = "";
    };
    reader.readAsDataURL(file);
  }

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
        document.getElementById("result-section").style.display = "block";
        document.getElementById("predicted-class").textContent = data.predicted_class || "-";
        document.getElementById("confidence-score").textContent = data.confidence_score ? `${data.confidence_score}%` : "-";
        document.getElementById("prediction-time").textContent = data.prediction_time_seconds ? `${data.prediction_time_seconds}s` : "-";

        // Heatmap
        if (data.heatmap_image) document.getElementById("heatmap").src = data.heatmap_image;

        // Bar chart
        const ctx = document.getElementById("probs-chart").getContext("2d");
        if (window.probChart) window.probChart.destroy();

        const labels = Object.keys(data.all_class_probabilities);
        const probs = Object.values(data.all_class_probabilities);

        window.probChart = new Chart(ctx, {
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
            scales: { y: { beginAtZero: true, max: 100 } },
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
