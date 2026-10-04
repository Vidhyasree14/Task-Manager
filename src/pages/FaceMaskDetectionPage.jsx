import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Zap,
  Play,
  Square,
  Sparkles,
  Download,
  Info,
  Maximize2,
  Image as ImageIcon
} from 'lucide-react'

export default function FaceMaskDetectionPage({ onBack, initialTask }) {
  const [activeTab, setActiveTab] = useState('camera') // 'camera', 'upload', 'samples'
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [isContinuousScan, setIsContinuousScan] = useState(false)

  // Upload & processing state
  const [selectedImage, setSelectedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [result, setResult] = useState(null)

  // Video / Canvas refs
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const scanIntervalRef = useRef(null)
  const fileInputRef = useRef(null)

  // API URLs with automatic fallback
  const getApiUrl = () => {
    // Port 8001 is the dedicated AI model server
    return 'http://127.0.0.1:8001/api/mask-detect'
  }

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    setIsContinuousScan(false)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [])

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null)
    setErrorMsg(null)
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setIsCameraActive(true)
    } catch (err) {
      console.error('Camera access error:', err)
      setCameraError('Unable to access webcam. Please check browser camera permissions or try photo upload.')
      setIsCameraActive(false)
    }
  }

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Call detection API with base64 data
  const analyzeImageBase64 = async (b64Data) => {
    setIsProcessing(true)
    setErrorMsg(null)
    try {
      // First try port 8001 (AI backend), fallback to current origin if needed
      const endpoints = [
        'http://127.0.0.1:8001/api/mask-detect',
        '/api/mask-detect',
        'http://127.0.0.1:8000/api/mask-detect'
      ]

      let res = null
      let lastErr = null
      for (const ep of endpoints) {
        try {
          const resp = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: b64Data }),
          })
          if (resp.ok) {
            res = await resp.json()
            break
          }
        } catch (e) {
          lastErr = e
        }
      }

      if (!res) {
        throw new Error(lastErr?.message || 'Face mask detection server could not be reached. Make sure python backend is running.')
      }

      setResult(res)
    } catch (err) {
      console.error('Analysis error:', err)
      setErrorMsg(err.message || 'Error occurred while analyzing image')
    } finally {
      setIsProcessing(false)
    }
  }

  // Capture frame from active camera
  const captureFrame = () => {
    if (!videoRef.current || !isCameraActive) return null
    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setSelectedImage(dataUrl)
    return dataUrl
  }

  // Handle Capture button click
  const handleCaptureAndAnalyze = async () => {
    const frame = captureFrame()
    if (frame) {
      await analyzeImageBase64(frame)
    }
  }

  // Toggle continuous scan
  useEffect(() => {
    if (isContinuousScan && isCameraActive) {
      scanIntervalRef.current = setInterval(() => {
        if (!isProcessing) {
          const frame = captureFrame()
          if (frame) {
            analyzeImageBase64(frame)
          }
        }
      }, 1800)
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
  }, [isContinuousScan, isCameraActive, isProcessing])

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const b64 = event.target?.result
      setSelectedImage(b64)
      analyzeImageBase64(b64)
    }
    reader.readAsDataURL(file)
  }

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const b64 = event.target?.result
      setSelectedImage(b64)
      analyzeImageBase64(b64)
    }
    reader.readAsDataURL(file)
  }

  // Load sample image
  const handleLoadSample = async (samplePath) => {
    setIsProcessing(true)
    setErrorMsg(null)
    try {
      const resp = await fetch(samplePath)
      const blob = await resp.blob()
      const reader = new FileReader()
      reader.onload = (event) => {
        const b64 = event.target?.result
        setSelectedImage(b64)
        analyzeImageBase64(b64)
      }
      reader.readAsDataURL(blob)
    } catch (err) {
      setErrorMsg('Failed to load sample image: ' + err.message)
      setIsProcessing(false)
    }
  }

  // Determine overall badge style
  const isWithMask = result?.overall_result === 'WithMask'
  const isWithoutMask = result?.overall_result === 'WithoutMask'
  const isMixed = result?.overall_result === 'Mixed'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header / Navigation Bar */}
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              stopCamera()
              onBack()
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-sm font-medium transition border border-slate-700 shadow-sm cursor-pointer"
            title="Return to Task Manager table"
          >
            <ArrowLeft size={17} />
            <span>Back to Tasks</span>
          </button>

          <div className="h-6 w-px bg-slate-700" />

          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-semibold tracking-wide">
                TASK: 24.09.2026
              </span>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent my-0">
                AI Face Mask Detection Studio
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              PyTorch CNN Deep Learning Model • OpenCV Haar Cascade Localization
            </p>
          </div>
        </div>

        {/* Engine Status Tag */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PyTorch Engine Online</span>
          </div>
        </div>
      </header>

      {/* Main Content Studio Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Input Studio (Camera / Upload / Samples) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Mode Selector Tabs */}
          <div className="bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80 flex gap-1 shadow-md">
            <button
              onClick={() => {
                setActiveTab('camera')
                if (!isCameraActive) startCamera()
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Camera size={16} />
              <span>Webcam Capture</span>
            </button>

            <button
              onClick={() => {
                stopCamera()
                setActiveTab('upload')
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <UploadCloud size={16} />
              <span>Upload Photo</span>
            </button>

            <button
              onClick={() => {
                stopCamera()
                setActiveTab('samples')
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'samples'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Sparkles size={16} />
              <span>Demo Presets</span>
            </button>
          </div>

          {/* TAB 1: Live Webcam Stream View */}
          {activeTab === 'camera' && (
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
              <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700/80 flex items-center justify-center group">
                {/* Live Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    isCameraActive ? 'block' : 'hidden'
                  } transform -scale-x-100`}
                />

                {/* Camera Inactive Placeholder */}
                {!isCameraActive && (
                  <div className="text-center p-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
                      <Camera size={32} />
                    </div>
                    <p className="text-slate-300 font-semibold mb-1 text-sm">Webcam is currently off</p>
                    <p className="text-slate-500 text-xs max-w-xs mb-4">
                      Click below to turn on your camera and run real-time face mask detection
                    </p>
                    <button
                      onClick={startCamera}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      <Play size={16} />
                      <span>Start Camera</span>
                    </button>
                  </div>
                )}

                {/* HUD Overlay when Camera is Active */}
                {isCameraActive && (
                  <>
                    {/* Targeting Brackets */}
                    <div className="absolute inset-8 pointer-events-none border border-indigo-500/30 rounded-2xl flex items-center justify-center">
                      <div className="w-56 h-64 border-2 border-dashed border-indigo-400/60 rounded-3xl relative animate-pulse">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-900/90 text-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full border border-indigo-500/40 uppercase tracking-widest font-mono">
                          Target Zone
                        </div>
                      </div>
                    </div>

                    {/* Live Indicator */}
                    <div className="absolute top-3 left-3 bg-red-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>LIVE</span>
                    </div>

                    {/* Continuous Scan Indicator */}
                    {isContinuousScan && (
                      <div className="absolute top-3 right-3 bg-indigo-600/90 text-indigo-100 text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md border border-indigo-400/30">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Auto-Scanning</span>
                      </div>
                    )}
                  </>
                )}

                {cameraError && (
                  <div className="absolute bottom-3 left-3 right-3 bg-red-950/90 border border-red-500/40 text-red-200 text-xs p-2.5 rounded-xl text-center">
                    {cameraError}
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {isCameraActive ? (
                    <button
                      onClick={stopCamera}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Square size={14} />
                      <span>Turn Off Camera</span>
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Play size={14} />
                      <span>Enable Camera</span>
                    </button>
                  )}

                  {isCameraActive && (
                    <button
                      onClick={() => setIsContinuousScan(!isContinuousScan)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
                        isContinuousScan
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <RefreshCw size={13} className={isContinuousScan ? 'animate-spin' : ''} />
                      <span>{isContinuousScan ? 'Auto-Scan: ON' : 'Auto-Scan: OFF'}</span>
                    </button>
                  )}
                </div>

                <button
                  disabled={!isCameraActive || isProcessing}
                  onClick={handleCaptureAndAnalyze}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer ${
                    !isCameraActive || isProcessing
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-emerald-500/20 active:scale-95'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-slate-900" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={16} className="text-slate-900" />
                      <span>Capture & Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Photo Upload Option */}
          {activeTab === 'upload' && (
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 hover:border-indigo-500 bg-slate-900/60 hover:bg-slate-900/90 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition shadow-inner">
                  <UploadCloud size={32} />
                </div>
                <p className="text-slate-200 font-semibold text-sm mb-1">
                  Drag & drop an image here, or click to browse
                </p>
                <p className="text-slate-500 text-xs mb-4">
                  Supports JPG, PNG, WEBP portraits & selfies
                </p>
                <span className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-xl border border-slate-700 font-medium transition shadow-sm">
                  Choose Photo File
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Instant Demo Presets */}
          {activeTab === 'samples' && (
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-1">1-Click Test Presets</h3>
                <p className="text-xs text-slate-400">
                  Select a pre-configured sample to test the AI model without uploading:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sample 1: With Mask */}
                <div
                  onClick={() => handleLoadSample('/samples/sample_with_mask.jpg')}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500/60 rounded-2xl p-3 flex gap-3 items-center cursor-pointer transition group shadow-md"
                >
                  <img
                    src="/samples/sample_with_mask.jpg"
                    alt="Person with mask"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700 group-hover:scale-105 transition"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">Wearing Face Mask</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Surgical blue mask sample</p>
                    <span className="text-[11px] text-indigo-400 font-semibold group-hover:underline mt-1 inline-block">
                      Click to Test →
                    </span>
                  </div>
                </div>

                {/* Sample 2: Without Mask */}
                <div
                  onClick={() => handleLoadSample('/samples/sample_without_mask.jpg')}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-red-500/60 rounded-2xl p-3 flex gap-3 items-center cursor-pointer transition group shadow-md"
                >
                  <img
                    src="/samples/sample_without_mask.jpg"
                    alt="Person without mask"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700 group-hover:scale-105 transition"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-xs font-bold text-red-400">Without Face Mask</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Standard portrait no mask</p>
                    <span className="text-[11px] text-indigo-400 font-semibold group-hover:underline mt-1 inline-block">
                      Click to Test →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Model Specification Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" />
              <span>Model Architecture: <strong className="text-slate-200">MaskDetectorCNN</strong> (3 Conv + 2 FC)</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span>Inference: <strong className="text-slate-200">PyTorch CPU</strong></span>
            </div>
          </div>
        </div>

        {/* Right Side: AI Results & Visual Detection Output */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 flex flex-col gap-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 m-0">
                <Sparkles size={18} className="text-indigo-400" />
                <span>Detection Results</span>
              </h2>
              {result && (
                <span className="text-[11px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                  {result.inference_time_ms} ms
                </span>
              )}
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Active Analysis Loading Spinner */}
            {isProcessing && (
              <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <RefreshCw size={36} className="animate-spin text-indigo-400 mb-3" />
                <p className="text-sm font-bold text-slate-200">Processing with PyTorch CNN...</p>
                <p className="text-xs text-slate-500 mt-1">
                  Localizing facial regions with Haar Cascade & calculating tensor probabilities
                </p>
              </div>
            )}

            {/* Analyzed Image Display with Bounding Boxes */}
            {!isProcessing && result?.annotated_image && (
              <div className="flex flex-col gap-4">
                <div className="relative rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-inner group">
                  <img
                    src={result.annotated_image}
                    alt="Analyzed detection frame"
                    className="w-full object-contain max-h-[290px] mx-auto"
                  />
                  <a
                    href={result.annotated_image}
                    download="face_mask_detection_result.jpg"
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-700 text-xs flex items-center gap-1 transition opacity-0 group-hover:opacity-100"
                    title="Download annotated image"
                  >
                    <Download size={14} />
                  </a>
                </div>

                {/* Primary Verdict Card */}
                <div
                  className={`p-4 rounded-2xl border flex items-center gap-4 shadow-lg ${
                    isWithMask
                      ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500/40 text-emerald-100'
                      : isWithoutMask
                      ? 'bg-gradient-to-r from-rose-950/80 to-red-950/80 border-rose-500/40 text-rose-100'
                      : 'bg-gradient-to-r from-amber-950/80 to-yellow-950/80 border-amber-500/40 text-amber-100'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                      isWithMask
                        ? 'bg-emerald-500 text-slate-950'
                        : isWithoutMask
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {isWithMask ? (
                      <ShieldCheck size={28} />
                    ) : isWithoutMask ? (
                      <ShieldAlert size={28} />
                    ) : (
                      <AlertTriangle size={28} />
                    )}
                  </div>

                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      Verdict
                    </span>
                    <h3 className="text-xl font-extrabold m-0 leading-tight">
                      {isWithMask && 'WITH MASK'}
                      {isWithoutMask && 'WITHOUT MASK'}
                      {isMixed && 'MIXED COMPLIANCE'}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {isWithMask && 'Face mask is properly detected on face.'}
                      {isWithoutMask && 'No mask detected. Facial region is exposed.'}
                      {isMixed && 'Multiple individuals detected with varied mask compliance.'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      Confidence
                    </span>
                    <div className="text-2xl font-black">{result.confidence}%</div>
                  </div>
                </div>

                {/* Detailed Face Breakdown List */}
                <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-700/60 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-300 pb-1 border-b border-slate-800">
                    <span>Detected Faces ({result.faces_count})</span>
                    <span className="text-slate-400">CNN Probability</span>
                  </div>

                  {result.faces.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            f.label === 'WithMask' ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-200">
                          Face #{i + 1}: {f.label === 'WithMask' ? 'Wearing Mask' : 'No Mask'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={`font-bold ${
                            f.label === 'WithMask' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {f.confidence}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State before any capture or upload */}
            {!isProcessing && !result && (
              <div className="border border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 text-slate-500">
                  <ImageIcon size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-300 mb-1">Awaiting Image Input</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Click <strong>Capture & Analyze</strong> on webcam or upload a photo to inspect face mask status.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
