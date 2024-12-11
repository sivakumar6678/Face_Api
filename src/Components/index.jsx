import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognitionApp.css';

function FaceRecognitionApp() {
  const [currentView, setCurrentView] = useState(''); // Can be 'register', 'identify', or ''
  const [capturedFace, setCapturedFace] = useState(null);
  const [formData, setFormData] = useState({ name: '', age: '', rollNo: '', branch: '', year: '' });
  const [captureMessage, setCaptureMessage] = useState('');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [userData, setUserData] = useState([]);
  const [identificationMessage, setIdentificationMessage] = useState('');
  const [matchResult, setMatchResult] = useState(null);

  const videoRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setIsCameraOn(true);
      setCameraStatus('capturing');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
      setCameraStatus('idle');
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi.detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections) {
      setCapturedFace(detections.descriptor);
      setCaptureMessage('Face captured successfully!');
      stopCamera(); // Close the camera once face is captured
    } else {
      setCaptureMessage('No face detected, try again!');
    }
  };

  const retryCapture = () => {
    setCapturedFace(null);
    setCaptureMessage('');
    startCamera();
  };

  const cancelCapture = () => {
    setCapturedFace(null);
    setCaptureMessage('');
    stopCamera();
  };

  const registerUser = () => {
    if (!formData.name || !formData.age || !formData.rollNo || !formData.branch || !formData.year || !capturedFace) {
      setCaptureMessage('Please fill in all details and capture your face!');
      return;
    }

    const newUser = {
      ...formData,
      faceEmbedding: capturedFace,
    };

    setUserData((prev) => [...prev, newUser]);
    setCaptureMessage('User Registered Successfully!');
    setFormData({ name: '', age: '', rollNo: '', branch: '', year: '' });
    setCapturedFace(null);
    stopCamera();
  };

  const identifyFace = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi.detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections) {
      const labeledDescriptors = userData.map(
        (user) => new faceapi.LabeledFaceDescriptors(user.name, [user.faceEmbedding])
      );
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // Threshold of 0.6

      const bestMatch = faceMatcher.findBestMatch(detections.descriptor);
      if (bestMatch) {
        setMatchResult(bestMatch);
        setIdentificationMessage(`Match found: ${bestMatch.label}`);
        stopCamera();
      } else {
        setIdentificationMessage('No match found!');
        setMatchResult(null);
        stopCamera();
      }
    } else {
      setIdentificationMessage('No face detected!');
    }
  };

  const loadModels = async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
  };

  useEffect(() => {
    loadModels();
  }, []);

  const renderMainView = () => (
    <div className="main-container">
      <h1>Face Recognition App</h1>
      <button onClick={() => setCurrentView('register')}>Register User</button>
      <button onClick={() => setCurrentView('identify')}>Identify User</button>
    </div>
  );

  const renderRegistrationView = () => (
    <div className="form-container">
      <h2>Register New User</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="age">Age:</label>
          <input
            type="number"
            id="age"
            name="age"
            placeholder="Age"
            value={formData.age}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="rollNo">Roll No:</label>
          <input
            type="text"
            id="rollNo"
            name="rollNo"
            placeholder="Roll No"
            value={formData.rollNo}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="branch">Branch:</label>
          <input
            type="text"
            id="branch"
            name="branch"
            placeholder="Branch"
            value={formData.branch}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="year">Year:</label>
          <input
            type="text"
            id="year"
            name="year"
            placeholder="Year"
            value={formData.year}
            onChange={handleInputChange}
            required
          />
        </div>
        {cameraStatus === 'idle' && (
          <button type="button" onClick={startCamera}>
            Register Face
          </button>
        )}

        {cameraStatus === 'capturing' && (
          <>
            <button type="button" onClick={captureFace}>
              Capture Face
            </button>
            <button type="button" onClick={retryCapture}>
              Retry
            </button>
            <button type="button" onClick={cancelCapture}>
              Cancel
            </button>
          </>
        )}

        {captureMessage && <div className="capture-message">{captureMessage}</div>}

        {capturedFace && (
          <button type="button" onClick={registerUser}>
            Register User
          </button>
        )}
      </form>
      <button onClick={() => setCurrentView('')}>Back</button>
    </div>
  );

  const renderIdentificationView = () => (
    <div className="identification-container">
      <h2>Identify User</h2>
      {cameraStatus === 'idle' && (
        <button onClick={startCamera}>Start Identification</button>
      )}

      {cameraStatus === 'capturing' && (
        <>
          <button onClick={identifyFace}>Identify Face</button>
          <button onClick={stopCamera}>Stop Camera</button>
        </>
      )}

      {identificationMessage && <div className="identification-message">{identificationMessage}</div>}
      {matchResult && (
        <div className="match-result">
          <h3>Matched User</h3>
          <p>Name: {matchResult.label}</p>
        </div>
      )}
      <button onClick={() => setCurrentView('')}>Back</button>
    </div>
  );

  return (
    <div className="app-container">
      {currentView === '' && renderMainView()}
      {currentView === 'register' && renderRegistrationView()}
      {currentView === 'identify' && renderIdentificationView()}
      <div className="video-container " style={{ display: isCameraOn ? 'block' : 'none' }}>
      <span class="loader" >
        <video ref={videoRef} width="480" height="480" 
              style={{
                display: isCameraOn ? 'block' : 'none',
                borderRadius: '50%',
              }} autoPlay muted />

      </span>
      </div>
    </div>
  );
}

export default FaceRecognitionApp;
