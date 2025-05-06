const video = document.getElementById('camera');
const captureBtn = document.getElementById('captureBtn');
const resetBtn = document.getElementById('resetBtn');
const canvas = document.getElementById('snapshotCanvas');
const photoInner = document.getElementById('photoInner');
const downloadBtn = document.getElementById('downloadBtn');
const captionInput = document.getElementById('captionInput');
const applyCaptionBtn = document.getElementById('applyCaptionBtn');

let useFrontCamera = true;
let currentStream = null;

let currentLayout = 'single';

async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    video: {
      facingMode: useFrontCamera ? 'user' : 'environment'
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    video.srcObject = stream;
    // Apply mirror effect if front camera is used
    video.style.transform = useFrontCamera ? 'scaleX(-1)' : 'scaleX(1)';
  } catch (err) {
    console.error('Camera access error:', err);
    alert('Unable to access the camera.');
  }
}


function createFujiFrame(imageSrc, captionText = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'fuji-frame';

  const img = document.createElement('img');
  img.src = imageSrc;
  wrapper.appendChild(img);

  const caption = document.createElement('div');
  caption.className = 'fuji-caption';
  caption.textContent = captionText;
  wrapper.appendChild(caption);

  return wrapper;
}

function capturePhoto() {
  const context = canvas.getContext('2d');
  const width = video.videoWidth;
  const height = video.videoHeight;

  canvas.width = width;
  canvas.height = height;
  context.drawImage(video, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/png');
  const captionText = captionInput.value.trim();

  if (currentLayout === 'single') {
    const frame = createFujiFrame(dataUrl, captionText);
    photoInner.innerHTML = '';
    photoInner.style.display = 'flex';
    photoInner.style.flexDirection = 'column';
    photoInner.style.alignItems = 'center';
    photoInner.appendChild(frame);
  } else if (['grid', 'strip'].includes(currentLayout)) {
    if (
      (currentLayout === 'grid' && photoInner.children.length >= 4) ||
      (currentLayout === 'strip' && photoInner.children.length >= 3)
    ) {
      alert(`Max photo limit reached for ${currentLayout} layout.`);
      return;
    }

    const frame = createFujiFrame(dataUrl);
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Add caption...';
    input.className = 'grid-caption-input';
    input.addEventListener('input', () => {
      const cap = frame.querySelector('.fuji-caption');
      cap.textContent = input.value;
    });

    frame.appendChild(input);
    photoInner.appendChild(frame);
  }
}

function resetPhotos() {
  photoInner.innerHTML = '';
  captionInput.value = '';
}

function switchLayout(layout) {
  currentLayout = layout;
  photoInner.innerHTML = '';
  photoInner.className = 'photo-inner'; // Reset all layout-specific classes

  if (layout === 'grid') {
    photoInner.style.display = 'grid';
    photoInner.style.gridTemplateColumns = '1fr 1fr';
    photoInner.style.gridTemplateRows = '1fr 1fr';
    photoInner.style.gap = '10px';
    photoInner.classList.add('grid-layout');
  } else if (layout === 'strip') {
    photoInner.style.display = 'flex';
    photoInner.style.flexDirection = 'column';
    photoInner.style.gap = '10px';
    photoInner.classList.add('strip-layout');
  } else {
    photoInner.style.display = 'flex';
    photoInner.style.flexDirection = 'column';
    photoInner.style.alignItems = 'center';
  }
}

function applyCaptions() {
  const text = captionInput.value.trim();
  if (!text) return;

  if (currentLayout === 'single') {
    const frame = photoInner.querySelector('.fuji-frame');
    if (frame) {
      let cap = frame.querySelector('.fuji-caption');
      if (!cap) {
        cap = document.createElement('div');
        cap.className = 'fuji-caption';
        frame.appendChild(cap);
      }
      cap.textContent = text;
    }
  }

  if (currentLayout === 'grid') {
    const frames = photoInner.querySelectorAll('.fuji-frame');
    frames.forEach((frame, i) => {
      let cap = frame.querySelector('.fuji-caption');
      if (!cap) {
        cap = document.createElement('div');
        cap.className = 'fuji-caption';
        frame.appendChild(cap);
      }
      cap.textContent = `${text} ${i + 1}`;
    });
  }
}

function downloadPhoto() {
  if (photoInner.children.length === 0) {
    alert("No photo to download.");
    return;
  }

  const tempClass = 'fuji-fixed';
  const tempWidth = currentLayout === 'grid' ? 800 : 400;
  const tempHeight = currentLayout === 'grid' ? 800 : currentLayout === 'strip' ? 1200 : 500;

  // Hide inputs if needed
  const inputs = photoInner.querySelectorAll('.grid-caption-input');
  inputs.forEach(i => i.style.display = 'none');

  const exportTarget = currentLayout === 'single'
    ? photoInner.querySelector('.fuji-frame')
    : photoInner;

  if (exportTarget) exportTarget.classList.add(tempClass);

  html2canvas(exportTarget, {
    scrollX: 0,
    scrollY: -window.scrollY,
    width: tempWidth,
    height: tempHeight,
    scale: 2 // 🔍 Higher scale = higher resolution (1 is default)
  }).then(canvas => {
    const resized = document.createElement('canvas');
    resized.width = tempWidth;
    resized.height = tempHeight;

    const ctx = resized.getContext('2d');
    ctx.drawImage(canvas, 0, 0, tempWidth, tempHeight);

    const link = document.createElement('a');
    link.download = `photobooth_${currentLayout}_${Date.now()}.png`;
    link.href = resized.toDataURL();
    link.click();

    // Cleanup
    if (exportTarget) exportTarget.classList.remove(tempClass);
    inputs.forEach(i => i.style.display = '');
  });
}

// Event Listeners
captureBtn.addEventListener('click', capturePhoto);
resetBtn.addEventListener('click', resetPhotos);
applyCaptionBtn.addEventListener('click', applyCaptions);

downloadBtn.addEventListener('click', () => {
  const inputFields = document.querySelectorAll('.fuji-frame input');
  inputFields.forEach(input => {
    input.style.display = 'none';
  });

  // Decide export layout based on currentLayout and prompt for grid
  let exportLayout = currentLayout;
  
  if (currentLayout === 'grid') {
    const userWantsStrip = confirm("Do you want to download the 4 photos as a vertical strip instead of a 2x2 grid?");
    if (userWantsStrip) exportLayout = 'strip';
  }

  const outputWidth = exportLayout === 'grid' ? 800 : (exportLayout === 'strip' ? 400 : 400);
  const outputHeight = exportLayout === 'grid' ? 800 : (exportLayout === 'strip' ? 1200 : 500);

  const exportWrapper = document.createElement('div');
  exportWrapper.style.backgroundColor = '#ffffff';
  exportWrapper.style.padding = '30px';
  exportWrapper.style.boxSizing = 'border-box';
  exportWrapper.style.width = `${outputWidth}px`;
  exportWrapper.style.height = `${outputHeight}px`;
  exportWrapper.style.position = 'absolute';
  exportWrapper.style.top = '-10000px';

  if (exportLayout === 'grid') {
    exportWrapper.style.display = 'grid';
    exportWrapper.style.gridTemplateColumns = '1fr 1fr';
    exportWrapper.style.gridTemplateRows = '1fr 1fr';
    exportWrapper.style.gap = '20px';

    const frames = photoInner.querySelectorAll('.fuji-frame');
    frames.forEach(original => {
      const clone = original.cloneNode(true);
      clone.style.width = '100%';
      clone.style.height = '100%';
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.alignItems = 'center';
      clone.style.justifyContent = 'space-between';
      clone.style.padding = '10px';
      clone.style.backgroundColor = '#fff';
      clone.style.borderRadius = '12px';

      const img = clone.querySelector('img');
      if (img) {
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '80%';
        img.style.objectFit = 'cover';
      }

      exportWrapper.appendChild(clone);
    });
  } else if (exportLayout === 'single') {
    const frame = photoInner.querySelector('.fuji-frame');
    if (frame) {
      const clone = frame.cloneNode(true);
      clone.style.width = '100%';
      clone.style.height = '100%';
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.alignItems = 'center';
      clone.style.justifyContent = 'space-between';
      clone.style.padding = '10px';
      clone.style.backgroundColor = '#fff';
      clone.style.borderRadius = '12px';

      const img = clone.querySelector('img');
      if (img) {
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '80%';
        img.style.objectFit = 'cover';
      }

      exportWrapper.appendChild(clone);
    }
  } else if (exportLayout === 'strip') {
    exportWrapper.style.display = 'flex';
    exportWrapper.style.flexDirection = 'column';
    exportWrapper.style.gap = '10px';

    const frames = photoInner.querySelectorAll('.fuji-frame');
    frames.forEach(original => {
      const clone = original.cloneNode(true);
      clone.style.width = '100%';
      clone.style.height = '100%';
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.alignItems = 'center';
      clone.style.justifyContent = 'space-between';
      clone.style.padding = '10px';
      clone.style.backgroundColor = '#fff';
      clone.style.borderRadius = '12px';

      const img = clone.querySelector('img');
      if (img) {
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '80%';
        img.style.objectFit = 'cover';
      }

      exportWrapper.appendChild(clone);
    });
  }

  document.body.appendChild(exportWrapper);

  html2canvas(exportWrapper, {
    width: outputWidth,
    height: outputHeight,
    scale: 1,
    scrollX: 0,
    scrollY: -window.scrollY
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `photobooth_${exportLayout}_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    document.body.removeChild(exportWrapper);

    inputFields.forEach(input => {
      input.style.display = 'block';
    });
  });
});


document.querySelectorAll('.layout-btn').forEach(btn => {
  btn.addEventListener('click', () => switchLayout(btn.dataset.layout));
});
document.getElementById('switchCameraBtn').addEventListener('click', () => {
  useFrontCamera = !useFrontCamera;
  startCamera();
});

startCamera();
