document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("preview");
  const classifyBtn = document.getElementById("classify-btn");
  const modelSelect = document.getElementById("model-select");
  const resultBox = document.getElementById("result-box");

  // 🔑 Detect environment (local vs Hugging Face)
  const API_BASE = window.location.hostname.includes("hf.space")
    ? `${window.location.origin}/predict` // deployed on Hugging Face
    : "http://127.0.0.1:8000/predict";    // local dev

  // File drop
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragging");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    fileInput.files = e.dataTransfer.files;
    previewFile(fileInput.files[0]);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      previewFile(fileInput.files[0]);
    }
  });

  function previewFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  classifyBtn.addEventListener("click", async () => {
    if (fileInput.files.length === 0) {
      alert("Please upload an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("model_choice", modelSelect.value);

    try {
      classifyBtn.disabled = true;
      classifyBtn.textContent = "Predicting...";

      const response = await fetch(API_BASE, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      displayResult(data);
    } catch (error) {
      console.error("Error:", error);
      alert("Prediction failed. Check console for details.");
    } finally {
      classifyBtn.disabled = false;
      classifyBtn.textContent = "Classify";
    }
  });

  function displayResult(data) {
    resultBox.innerHTML = `
      <h3>Prediction Result</h3>
      <p><strong>Class:</strong> ${data.predicted_class}</p>
      <p><strong>Confidence:</strong> ${data.confidence_score}%</p>
      <p><strong>Time:</strong> ${data.prediction_time}s</p>
      ${data.heatmap ? `<img src="data:image/png;base64,${data.heatmap}" alt="Heatmap" style="max-width:100%"/>` : ""}
    `;
  }
});
