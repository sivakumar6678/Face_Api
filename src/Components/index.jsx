import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognitionApp.css';

const VideoContainer = ({ isCameraOn, videoRef, userface }) => (
  <div className="video-container" style={{ display: isCameraOn ? 'block' : 'none' }}>
    <span className="loader" 
          style={{
            border: userface ? '10px solid green' : '10px solid red',
            boxShadow: userface ? '0 0 10px 10px green' : '0 0 10px 10px red',
          }}
    >
      <video ref={videoRef} width="480" height="480" 
            style={{
              display: isCameraOn ? 'block' : 'none',
              borderRadius: '50%',
            }} autoPlay muted />
    </span>
  </div>
);

const RegistrationInstructions = () => (
  <div className="registration-instructions">
    <h3>Face Registration Instructions:</h3>
    <ul>
      <li>Ensure your face is well-lit and clearly visible.</li>
      <li>Position your face within the camera frame.</li>
      <li>Avoid any obstructions like glasses or hats.</li>
      <li>Keep a neutral expression for better accuracy.</li>
      <li>Click "Capture Face" to register your face.</li>
    </ul>
  </div>
);

const MainView = ({ setCurrentView }) => (
  <div className="main-container">
    <h1>Face Recognition App</h1>
    <button onClick={() => setCurrentView('register')}>Register User</button>
    <button onClick={() => setCurrentView('identify')}>Identify User</button>
  </div>
);

const RegistrationView = ({
  formData,
  handleInputChange,
  cameraStatus,
  startCamera,
  captureFace,
  retryCapture,
  cancelCapture,
  captureMessage,
  capturedFace,
  registerUser,
  setCurrentView
}) => (
  <div className="form-container">
    <h2>Register New User</h2>
    <form onSubmit={(e) => e.preventDefault()}>
      {['name', 'age', 'rollNo', 'branch', 'year'].map((field) => (
        <div className="form-group" key={field}>
          <label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
          <input
            type={field === 'age' ? 'number' : 'text'}
            id={field}
            name={field}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={formData[field]}
            onChange={handleInputChange}
            required
          />
        </div>
      ))}
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

const IdentificationView = ({
  cameraStatus,
  startCamera,
  identifyFace,
  stopCamera,
  identificationMessage,
  matchResult,
  setCurrentView
}) => (
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
  const [userface, setUserFace] = useState(false);
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
      alert('Face captured successfully!');
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
    setTimeout(() => {
      stopCamera();
      setUserFace(true);
    }, 1000);
  };

  const identifyFace = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi.detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections) {
      console.log('detections', detections);
      const labeledDescriptors = userData.map(
        (user) => new faceapi.LabeledFaceDescriptors(user.name, [user.faceEmbedding])
      );
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // Threshold of 0.6

      const bestMatch = faceMatcher.findBestMatch(detections.descriptor);
      if (bestMatch.label !== 'unknown') {
        setMatchResult(bestMatch);
        setIdentificationMessage(`Match found: ${bestMatch.label}`);
        setUserFace(true);
        setTimeout(() => {
          stopCamera();
        }, 3000);
      } else {
        setIdentificationMessage('No match found!');
        alert('No face found!');
        setMatchResult(null);
        setUserFace(false);
      }
    } else {
      setIdentificationMessage('No face detected!');
      alert('No face detected!');
      setMatchResult(null);
      setUserFace(false);
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

  return (
    <div className="app-container">
      {currentView === '' && <MainView setCurrentView={setCurrentView} />}
      {currentView === 'register' && (
        <>
          <RegistrationView
            formData={formData}
            handleInputChange={handleInputChange}
            cameraStatus={cameraStatus}
            startCamera={startCamera}
            captureFace={captureFace}
            retryCapture={retryCapture}
            cancelCapture={cancelCapture}
            captureMessage={captureMessage}
            capturedFace={capturedFace}
            registerUser={registerUser}
            setCurrentView={setCurrentView}
          />
          <RegistrationInstructions />
        </>
      )}
      {currentView === 'identify' && (
        <IdentificationView
          cameraStatus={cameraStatus}
          startCamera={startCamera}
          identifyFace={identifyFace}
          stopCamera={stopCamera}
          identificationMessage={identificationMessage}
          matchResult={matchResult}
          setCurrentView={setCurrentView}
        />
      )}
      <VideoContainer isCameraOn={isCameraOn} videoRef={videoRef} userface={userface} />
    </div>
  );
}

export default FaceRecognitionApp;
