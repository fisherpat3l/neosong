import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App = () => {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFileId, setProcessedFileId] = useState(null);
  const [backgroundMusicOptions, setBackgroundMusicOptions] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioMode, setAudioMode] = useState('original'); // 'original' or 'processed'
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Audio effects state
  const [effects, setEffects] = useState({
    volume: 1.0,
    pitch_shift: 0,
    reverb: false,
    echo: false,
    background_music: 'none',
    background_volume: 0.3
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchBackgroundMusic();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleEnded = () => setIsPlaying(false);
      
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [currentAudio]);

  const fetchBackgroundMusic = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/background-music`);
      const data = await response.json();
      setBackgroundMusicOptions(data.background_music);
    } catch (error) {
      console.error('Error fetching background music:', error);
    }
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileInfo(null);
      setProcessedFileId(null);
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setFileInfo(null);
      setProcessedFileId(null);
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${backendUrl}/api/upload-audio`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFileInfo(data);
        setCurrentAudio(`${backendUrl}/api/preview/${data.file_id}`);
        setAudioMode('original');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const processAudio = async () => {
    if (!fileInfo) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file_id', fileInfo.file_id);
    formData.append('effects', JSON.stringify(effects));

    try {
      const response = await fetch(`${backendUrl}/api/process-audio`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProcessedFileId(data.processed_file_id);
        setCurrentAudio(`${backendUrl}/api/preview/${data.processed_file_id}`);
        setAudioMode('processed');
      } else {
        throw new Error('Processing failed');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const switchAudioMode = (mode) => {
    if (mode === 'original' && fileInfo) {
      setCurrentAudio(`${backendUrl}/api/preview/${fileInfo.file_id}`);
      setAudioMode('original');
    } else if (mode === 'processed' && processedFileId) {
      setCurrentAudio(`${backendUrl}/api/preview/${processedFileId}`);
      setAudioMode('processed');
    }
    setIsPlaying(false);
  };

  const downloadAudio = () => {
    if (processedFileId) {
      window.open(`${backendUrl}/api/download/${processedFileId}`, '_blank');
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎵 Audio Enhancer
          </h1>
          <p className="text-xl text-blue-200">
            Transform your music with professional audio effects
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* File Upload Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Upload Your Audio</h2>
            
            <div 
              className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-4">
                  <div className="text-4xl">🎵</div>
                  <div className="text-white">
                    <p className="text-lg font-medium">{file.name}</p>
                    <p className="text-blue-200">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  
                  {!fileInfo && (
                    <button
                      onClick={uploadFile}
                      disabled={isUploading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isUploading ? 'Uploading...' : 'Upload Audio'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl">🎵</div>
                  <div className="text-white">
                    <p className="text-xl font-medium">Drop your audio file here</p>
                    <p className="text-blue-200">or click to browse</p>
                  </div>
                  <p className="text-blue-300 text-sm">
                    Supports MP3, WAV, M4A, FLAC
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Audio Player Section */}
          {currentAudio && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Audio Player</h2>
              
              <audio
                ref={audioRef}
                src={currentAudio}
                onLoadedMetadata={() => setDuration(audioRef.current.duration)}
                onTimeUpdate={() => setCurrentTime(audioRef.current.currentTime)}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="space-y-4">
                {/* Mode Toggle */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => switchAudioMode('original')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      audioMode === 'original' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/20 text-blue-200 hover:bg-white/30'
                    }`}
                    disabled={!fileInfo}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => switchAudioMode('processed')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      audioMode === 'processed' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/20 text-blue-200 hover:bg-white/30'
                    }`}
                    disabled={!processedFileId}
                  >
                    Enhanced
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div 
                    className="w-full bg-white/20 rounded-full h-2 cursor-pointer"
                    onClick={handleSeek}
                  >
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-blue-200">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={togglePlayPause}
                    className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                  >
                    {isPlaying ? '⏸️' : '▶️'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Effects Control Section */}
          {fileInfo && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Audio Effects</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Volume Control */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={effects.volume}
                    onChange={(e) => setEffects({ ...effects, volume: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-blue-200 text-sm">{Math.round(effects.volume * 100)}%</div>
                </div>

                {/* Pitch Shift */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Pitch Shift</label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={effects.pitch_shift}
                    onChange={(e) => setEffects({ ...effects, pitch_shift: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-blue-200 text-sm">{effects.pitch_shift} semitones</div>
                </div>

                {/* Background Music */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Background Music</label>
                  <select
                    value={effects.background_music}
                    onChange={(e) => setEffects({ ...effects, background_music: e.target.value })}
                    className="w-full p-2 rounded-lg bg-white/20 text-white border border-white/30"
                  >
                    {backgroundMusicOptions.map((option) => (
                      <option key={option.id} value={option.id} className="text-black">
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Background Volume */}
                {effects.background_music !== 'none' && (
                  <div className="space-y-2">
                    <label className="text-white font-medium">Background Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={effects.background_volume}
                      onChange={(e) => setEffects({ ...effects, background_volume: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-blue-200 text-sm">{Math.round(effects.background_volume * 100)}%</div>
                  </div>
                )}

                {/* Effect Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="reverb"
                      checked={effects.reverb}
                      onChange={(e) => setEffects({ ...effects, reverb: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="reverb" className="text-white">Add Reverb</label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="echo"
                      checked={effects.echo}
                      onChange={(e) => setEffects({ ...effects, echo: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="echo" className="text-white">Add Echo</label>
                  </div>
                </div>
              </div>

              {/* Process Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={processAudio}
                  disabled={isProcessing}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                >
                  {isProcessing ? 'Processing...' : '🎵 Enhance Audio'}
                </button>
              </div>
            </div>
          )}

          {/* Download Section */}
          {processedFileId && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Download Enhanced Audio</h2>
              <div className="text-center">
                <p className="text-blue-200 mb-4">Your enhanced audio is ready!</p>
                <button
                  onClick={downloadAudio}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105"
                >
                  📥 Download Enhanced Audio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;