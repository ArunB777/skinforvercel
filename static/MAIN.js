document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("preview");
  const classifyBtn = document.getElementById("classify-btn");
  const modelSelect = document.getElementById("model-select");

  const HF_API_URL = "https://arunbaigra-skinlesionai.hf.space/predict"; // 🔹 Your Space's predict endpoint
  // No HF_API_TOKEN needed here—it's handled in your backend's Secrets

  // Drag & Drop
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleImage(fileInput.files[0]);
    }
  });

  // File input
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) handleImage(e.target.files[0]);
  });

  function handleImage(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
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
    const modelChoice = modelSelect.value; // Assuming modelSelect is a <select> element
    if (!file || !modelChoice) {
      alert("Please upload an image and select a model.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model_choice", modelChoice);

    fetch(HF_API_URL, {
      method: "POST",
      body: formData,
    })
      .then(response => {
        if (!response.ok) throw new Error("Server error: " + response.status);
        return response.json();
      })
      .then(data => {
        // Show results (matches your FastAPI response structure)
        document.getElementById("result-section").style.display = "block";
        document.getElementById("predicted-class").textContent = data.predicted_class || "-";
        document.getElementById("confidence-score").textContent = data.confidence_score ? `${data.confidence_score}%` : "-";
        document.getElementById("prediction-time").textContent = data.prediction_time || "-";

        if (data.class_probs && data.class_names) {
          const ctx = document.getElementById("probs-chart").getContext("2d");
          if (window.probChart) window.probChart.destroy();

          window.probChart = new Chart(ctx, {
            type: "bar",
            data: {
              labels: data.class_names,
              datasets: [{
                label: "Probability (%)",
                data: data.class_probs.map(p => (p * 100).toFixed(2)),
                backgroundColor: "rgba(33, 22, 192, 0.6)"
              }]
            },
            options: {
              scales: { y: { beginAtZero: true, max: 100 } },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (context) => context.raw + " %"
                  }
                },
                legend: { display: false }
              }
            }
          });
        }

        if (data.heatmap) {
          document.getElementById("heatmap").src = data.heatmap;
        }
      })
      .catch(err => {
        console.error("HF Fetch error:", err);
        alert("Prediction failed: " + err.message);
      });
  });
});
