import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import Modal from 'react-modal';
import './FaceRecognitionApp.css'; // Assuming you have a CSS file for styles

Modal.setAppElement('#root');

function FaceRecognitionApp() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [userData, setUserData] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '' });
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
      setIsCameraOn(true);
    }
  };

  const registerFace = async () => {
    if (!formData.name || !formData.age) {
      setModalMessage("Please fill in all details!");
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    const detections = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
    
    if (detections) {
      const newUserData = {
        name: formData.name,
        age: formData.age,
        faceEmbedding: detections.descriptor,
      };
      setUserData((prevData) => [...prevData, newUserData]);
      setModalMessage("Face Registered Successfully!");
      setIsRegistering(false);
      setFormData({ name: '', age: '' });
    } else {
      setModalMessage("No face detected, try again!");
    }
    setLoading(false);
    setIsModalOpen(true);
  };

  const identifyFace = async () => {
    setLoading(true);
    const detections = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
    
    if (detections) {
      const labeledDescriptors = userData.map(user => new faceapi.LabeledFaceDescriptors(user.name, [user.faceEmbedding]));
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

      if (bestMatch) {
        setModalMessage(`Identified as: ${bestMatch.label}`);
      } else {
        setModalMessage("No match found.");
      }
    } else {
      setModalMessage("No face detected, try again!");
    }
    setLoading(false);
    setIsModalOpen(true);
  };

  const handleRegisterClick = () => {
    setIsRegistering(true);
    startCamera();
  };

  const handleIdentifyClick = () => {
    setIsIdentifying(true);
    startCamera();
  };

  const loadModels = async () => {
    setLoading(true);
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    setLoading(false);
  };

  useEffect(() => {
    loadModels();
  }, []);

  return (
    <div className="app-container">
      <h1>Face Recognition App</h1>

      {loading && <div className="loading-indicator">Loading...</div>}

      {!isRegistering && !isIdentifying && (
        <div className="button-container">
          <button onClick={handleRegisterClick}>Register Face</button>
          <button onClick={handleIdentifyClick}>Identify Face</button>
        </div>
      )}

      {isRegistering && (
        <div className="form-container">
          <h2>Register New User</h2>
          <form onSubmit={(e) => { e.preventDefault(); registerFace(); }}>
            <input
              type="text"
              name="name"
              placeholder="Name"
              value ={formData.name}
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
        <div className="identifying-container">
          <h2>Identifying...</h2>
          <button onClick={identifyFace}>Start Identification</button>
        </div>
      )}

      <div className="video-container" style={{ position: 'relative' }}>
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

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Notification"
      >
        <h2>{modalMessage}</h2>
        <button onClick={() => setIsModalOpen(false)}>Close</button>
      </Modal>
    </div>
  );
}

export default FaceRecognitionApp;