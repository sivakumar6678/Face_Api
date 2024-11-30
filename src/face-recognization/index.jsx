import React, { useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

function FaceRecognition() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isVideoStarted, setIsVideoStarted] = useState(false);
    const [labeledFaceDescriptors, setLabeledFaceDescriptors] = useState(null);
    const [intervalId, setIntervalId] = useState(null);
    const [stream, setStream] = useState(null);

    // Load Face API Models
    const loadModels = async () => {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
                faceapi.nets.ssdMobilenetv1.loadFromUri('/models'), // For labeled images
            ]);
            setIsModelLoaded(true);
            console.log('Face API models loaded successfully.');
        } catch (error) {
            console.error('Error loading Face API models:', error);
        }
    };

    // Load Labeled Face Descriptors
    const loadLabeledImages = async () => {
        try {
            const labels = ['Person1', 'Person2']; // Replace with your labels
            const descriptors = await Promise.all(
                labels.map(async (label) => {
                    const imgPath = `/labeled_images/${label}.jpg`; // Use correct relative path
                    const img = await faceapi.fetchImage(imgPath); // Load the image
                    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    
                    if (!detections) {
                        throw new Error(`No face detected for label: ${label}`);
                    }
                    return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
                })
            );
            setLabeledFaceDescriptors(descriptors);
            console.log('Labeled face descriptors loaded:', descriptors);
        } catch (error) {
            console.error('Error loading labeled images:', error);
        }
    };
    
    // Start the video feed
    const startVideo = async () => {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(videoStream);
            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
                videoRef.current.play();
                setIsVideoStarted(true);
                console.log('Webcam access granted.');
            }
        } catch (error) {
            console.error('Error accessing webcam:', error);
            if (error.name === 'NotAllowedError') {
                alert('Webcam access denied. Please allow camera permissions in your browser settings.');
            } else if (error.name === 'NotFoundError') {
                alert('No webcam found. Please connect a webcam and try again.');
            } else {
                alert('An unexpected error occurred. Please try again.');
            }
        }
    };

    // Stop the video feed
    const stopVideo = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setIsVideoStarted(false);
        if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
        }
        console.log('Webcam stopped.');
    };

    // Detect faces and identify them
    const detectFaces = async () => {
        if (isModelLoaded && labeledFaceDescriptors && videoRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const displaySize = { width: video.videoWidth, height: video.videoHeight };

            faceapi.matchDimensions(canvas, displaySize);
            const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

            const detectionInterval = setInterval(async () => {
                try {
                    const detections = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks()
                        .withFaceDescriptors();

                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);

                    resizedDetections.forEach((detection) => {
                        const match = faceMatcher.findBestMatch(detection.descriptor);
                        const box = detection.detection.box;
                        const text = match.toString();

                        // Draw bounding box and label
                        const drawBox = new faceapi.draw.DrawBox(box, { label: text });
                        drawBox.draw(canvas);
                    });

                    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                } catch (error) {
                    console.error('Error during face detection:', error);
                }
            }, 100);

            setIntervalId(detectionInterval);
        }
    };

    return (
        <div style={{ position: 'relative', textAlign: 'center', marginTop: '20px' }}>
            {!isVideoStarted ? (
                <button
                    onClick={async () => {
                        await loadModels();
                        await loadLabeledImages();
                        await startVideo();
                        detectFaces();
                    }}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginRight: '10px',
                    }}
                >
                    Start Video
                </button>
            ) : (
                <button
                    onClick={stopVideo}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px',
                    }}
                >
                    Stop Video
                </button>
            )}
            <div style={{ display: isVideoStarted ? 'block' : 'none' }}>
                <video
                    ref={videoRef}
                    width="720"
                    height="560"
                    autoPlay
                    muted
                    style={{
                        borderRadius: '10px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        background: '#000',
                    }}
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: '10px',
                    }}
                />
            </div>
        </div>
    );
}

export default FaceRecognition;
