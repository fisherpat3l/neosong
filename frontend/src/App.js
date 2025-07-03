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
    tempo: 1.0,
    reverb: false,
    echo: false,
    bass_boost: 0,
    treble_boost: 0,
    noise_reduction: false,
    compression: false,
    stereo_wide: false,
    background_music: 'none',
    background_volume: 0.3,
    fade_in: 0,
    fade_out: 0
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

          {/* Audio Effects & Controls - Always visible after upload */}
          {fileInfo && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">🎛️ Audio Effects & Modifications</h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setEffects({
                      volume: 1.0,
                      pitch_shift: 0,
                      tempo: 1.0,
                      reverb: false,
                      echo: false,
                      bass_boost: 0,
                      treble_boost: 0,
                      noise_reduction: false,
                      compression: false,
                      stereo_wide: false,
                      background_music: 'none',
                      background_volume: 0.3,
                      fade_in: 0,
                      fade_out: 0
                    })}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    🔄 Reset All
                  </button>
                  <div className="text-white">
                    <span className="text-sm">Original: {fileInfo.duration?.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                {/* Tempo Control */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Tempo</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={effects.tempo}
                    onChange={(e) => setEffects({ ...effects, tempo: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-blue-200 text-sm">{Math.round(effects.tempo * 100)}%</div>
                </div>

                {/* Bass Boost */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Bass Boost</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={effects.bass_boost}
                    onChange={(e) => setEffects({ ...effects, bass_boost: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-blue-200 text-sm">{effects.bass_boost > 0 ? '+' : ''}{effects.bass_boost} dB</div>
                </div>

                {/* Treble Boost */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Treble Boost</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={effects.treble_boost}
                    onChange={(e) => setEffects({ ...effects, treble_boost: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-blue-200 text-sm">{effects.treble_boost > 0 ? '+' : ''}{effects.treble_boost} dB</div>
                </div>

                {/* Fade In */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Fade In</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={effects.fade_in}
                    onChange={(e) => setEffects({ ...effects, fade_in: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-blue-200 text-sm">{effects.fade_in}s</div>
                </div>

                {/* Fade Out */}
                <div className="space-y-2">
                  <label className="text-white font-medium">Fade Out</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={effects.fade_out}
                    onChange={(e) => setEffects({ ...effects, fade_out: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-blue-200 text-sm">{effects.fade_out}s</div>
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
              </div>

              {/* Effect Toggles */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="reverb"
                    checked={effects.reverb}
                    onChange={(e) => setEffects({ ...effects, reverb: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="reverb" className="text-white">🎭 Reverb</label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="echo"
                    checked={effects.echo}
                    onChange={(e) => setEffects({ ...effects, echo: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="echo" className="text-white">🔊 Echo</label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="noise_reduction"
                    checked={effects.noise_reduction}
                    onChange={(e) => setEffects({ ...effects, noise_reduction: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="noise_reduction" className="text-white">🔇 Noise Reduction</label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="compression"
                    checked={effects.compression}
                    onChange={(e) => setEffects({ ...effects, compression: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="compression" className="text-white">🎚️ Compression</label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="stereo_wide"
                    checked={effects.stereo_wide}
                    onChange={(e) => setEffects({ ...effects, stereo_wide: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="stereo_wide" className="text-white">🎵 Stereo Wide</label>
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Quick Presets</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setEffects({
                      ...effects,
                      volume: 1.2,
                      bass_boost: 8,
                      treble_boost: 3,
                      compression: true,
                      background_music: 'beat1'
                    })}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all"
                  >
                    🎸 Rock
                  </button>
                  <button
                    onClick={() => setEffects({
                      ...effects,
                      volume: 1.1,
                      bass_boost: 12,
                      treble_boost: -2,
                      compression: true,
                      background_music: 'beat2'
                    })}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all"
                  >
                    🎤 Hip Hop
                  </button>
                  <button
                    onClick={() => setEffects({
                      ...effects,
                      volume: 1.0,
                      bass_boost: 0,
                      treble_boost: 5,
                      reverb: true,
                      background_music: 'jazz'
                    })}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
                  >
                    🎷 Jazz
                  </button>
                  <button
                    onClick={() => setEffects({
                      ...effects,
                      volume: 0.9,
                      bass_boost: -3,
                      treble_boost: 2,
                      reverb: true,
                      background_music: 'ambient'
                    })}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all"
                  >
                    🌙 Ambient
                  </button>
                </div>
              </div>

              {/* Process Button - More prominent */}
              <div className="mt-8 text-center">
                <button
                  onClick={processAudio}
                  disabled={isProcessing}
                  className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {isProcessing ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing Audio...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <span>🎵</span>
                      <span>Apply Effects & Enhance Audio</span>
                    </span>
                  )}
                </button>
                <p className="text-blue-200 text-sm mt-2">
                  Click to apply all selected effects and modifications
                </p>
              </div>
            </div>
          )}

          {/* Download Section - Always visible after processing */}
          {processedFileId && (
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-lg rounded-2xl p-8 border border-green-400/30">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">✅ Audio Enhancement Complete!</h2>
                <p className="text-green-200 mb-6">Your enhanced audio is ready for download</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={downloadAudio}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <span className="flex items-center space-x-2">
                      <span>📥</span>
                      <span>Download Enhanced Audio</span>
                    </span>
                  </button>
                  <button
                    onClick={() => switchAudioMode('processed')}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <span>🎵</span>
                      <span>Play Enhanced Version</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Analysis Section */}
          {fileInfo && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">📊 Audio Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{fileInfo.duration?.toFixed(1)}s</div>
                  <div className="text-blue-200 text-sm">Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{fileInfo.format?.toUpperCase()}</div>
                  <div className="text-blue-200 text-sm">Format</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{(fileInfo.size / 1024 / 1024).toFixed(1)}MB</div>
                  <div className="text-blue-200 text-sm">File Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{processedFileId ? 'Enhanced' : 'Original'}</div>
                  <div className="text-blue-200 text-sm">Status</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;