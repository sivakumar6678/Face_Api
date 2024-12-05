import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import Modal from 'react-modal';
import './FaceRecognitionApp.css';

Modal.setAppElement('#root');

function FaceRecognitionApp() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [userData, setUserData] = useState([]); // Store multiple users
  const [formData, setFormData] = useState({ name: '', age: '', rollNo: '', branch: '', year: '' });
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setIsCameraOn(true);
    } else {
      setModalMessage('Camera not supported in this browser!');
      setIsModalOpen(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) {
      setModalMessage("Camera is not active!");
      setIsModalOpen(true);
      return;
    }

    const detections = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections) {
      const canvas = canvasRef.current;
      const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawDetections(canvas, resizedDetections);

      return detections.descriptor; // Return the face descriptor for registration
    } else {
      setModalMessage("No face detected, please try again!");
      setIsModalOpen(true);
      return null;
    }
  };

  const registerUser = async () => {
    if (!formData.name || !formData.age || !formData.rollNo || !formData.branch || !formData.year) {
      setModalMessage('Please fill in all details!');
      setIsModalOpen(true);
      return;
    }

    const faceDescriptor = await captureFace();

    if (faceDescriptor) {
      const newUser = {
        ...formData,
        faceDescriptor, // Store the face descriptor
      };

      setUserData((prev) => [...prev, newUser]);
      setModalMessage('User Registered Successfully!');
      setIsModalOpen(true);

      // Reset form and state
      setFormData({ name: '', age: '', rollNo: '', branch: '', year: '' });
      stopCamera();
      setIsRegistering(false);
    }
  };

  const identifyFace = async () => {
    setLoading(true);
    if (!isCameraOn) await startCamera();

    const detections = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections) {
      const labeledDescriptors = userData.map((user) =>
        new faceapi.LabeledFaceDescriptors(user.name, [user.faceDescriptor])
      );

      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // Adjust threshold if needed
      const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

      if (bestMatch && bestMatch.label !== 'unknown') {
        setModalMessage(`Identified as: ${bestMatch.label}`);
      } else {
        setModalMessage('No match found.');
      }
    } else {
      setModalMessage('No face detected, try again!');
    }

    setLoading(false);
    setIsModalOpen(true);
    stopCamera();
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

      {loading && <div className="loading-indicator">Loading models...</div>}

      {!isRegistering && !isIdentifying && (
        <div className="button-container">
          <button onClick={() => setIsRegistering(true)}>Register Face</button>
          <button onClick={() => setIsIdentifying(true)}>Identify Face</button>
        </div>
      )}

      {isRegistering && (
        <div className="form-container">
          <h2>Register New User</h2>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} required />
            <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleInputChange} required />
            <input type="text" name="rollNo" placeholder="Roll No" value={formData.rollNo} onChange={handleInputChange} required />
            <input type="text" name="branch" placeholder="Branch" value={formData.branch} onChange={handleInputChange} required />
            <input type="text" name="year" placeholder="Year" value={formData.year} onChange={handleInputChange} required />
            <button type="button" onClick={startCamera}>Start Camera</button>
            <button type="button" onClick={registerUser}>Register User</button>
            <button type="button" onClick={() => { setIsRegistering(false); stopCamera(); }}>Cancel</button>
          </form>
        </div>
      )}

      {isIdentifying && (
        <div className="identifying-container">
          <h2>Identify User</h2>
          <button onClick={identifyFace}>Start Identification</button>
          <button type="button" onClick={() => { setIsIdentifying(false); stopCamera(); }}>Cancel</button>
        </div>
      )}

      <div className="video-container" style={{ position: 'relative' }}>
        <video ref={videoRef} width="640" height="480" autoPlay muted />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      </div>

      <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} contentLabel="Notification">
        <h2>{modalMessage}</h2>
        <button onClick={() => setIsModalOpen(false)}>Close</button>
      </Modal>
    </div>
  );
}

export default FaceRecognitionApp;
