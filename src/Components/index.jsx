import React, { useState, useRef } from 'react';
import * as faceapi from 'face-api.js';

function FaceRecognitionApp() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [userData, setUserData] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '' });
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Start the camera
  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
      setIsCameraOn(true);
    }
  };

  // Register the face
  const registerFace = async () => {
    if (!formData.name || !formData.age) {
      alert("Please fill in all details!");
      return;
    }
    
    const detections = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
    
    if (detections) {
      const newUserData = {
        name: formData.name,
        age: formData.age,
        faceEmbedding: detections.descriptor,
      };
      setUserData((prevData) => [...prevData, newUserData]);
      alert("Face Registered Successfully!");
      setIsRegistering(false);
      setFormData({ name: '', age: '' });
    } else {
      alert("No face detected, try again!");
    }
  };

  // Identify a face
  const identifyFace = async () => {
    const detections = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
    
    if (detections) {
      const labeledDescriptors = userData.map(user => new faceapi.LabeledFaceDescriptors(user.name, [user.faceEmbedding]));
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

      if (bestMatch) {
        alert(`Identified as: ${bestMatch.label}`);
      } else {
        alert("No match found.");
      }
    }
  };

  // Handle button clicks
  const handleRegisterClick = () => {
    setIsRegistering(true);
    startCamera();
  };

  const handleIdentifyClick = () => {
    setIsIdentifying(true);
    startCamera();
  };

  // Load face-api models
  const loadModels = async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
  };

  React.useEffect(() => {
    loadModels();
  }, []);

  return (
    <div>
      <h1>Face Recognition App</h1>

      {!isRegistering && !isIdentifying && (
        <div>
          <button onClick={handleRegisterClick}>Register Face</button>
          <button onClick={handleIdentifyClick}>Identify Face</button>
        </div>
      )}

      {isRegistering && (
        <div>
          <h2>Register New User</h2>
          <form onSubmit={(e) => { e.preventDefault(); registerFace(); }}>
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="age"
              placeholder="Age"
              value={formData.age}
              onChange={handleInputChange}
              required
            />
            <button type="submit">Register Face</button>
          </form>
        </div>
      )}

      {isIdentifying && (
        <div>
          <h2>Identifying...</h2>
          <button onClick={identifyFace}>Start Identification</button>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          muted
          onPlay={() => {
            if (canvasRef.current) {
              const interval = setInterval(async () => {
                const detections = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
                canvasRef.current?.clear();
                faceapi.matchDimensions(canvasRef.current, videoRef.current);
                canvasRef.current?.drawDetections(detections);
              }, 100);
              return () => clearInterval(interval);
            }
          }}
        />
        <canvas ref={canvasRef} style={{ position: 'absolute' }} />
      </div>
    </div>
  );
}

export default FaceRecognitionApp;
