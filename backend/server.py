from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
import tempfile
import uuid
import shutil
from pathlib import Path
import logging
from typing import Optional
import json

# Audio processing imports
from pydub import AudioSegment
from pydub.effects import normalize
import librosa
import numpy as np
import scipy.signal
from scipy.io import wavfile
import soundfile as sf

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audio Enhancement API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for file storage
UPLOAD_DIR = Path("/tmp/audio_uploads")
PROCESSED_DIR = Path("/tmp/audio_processed")
BACKGROUND_DIR = Path("/app/backend/background_music")

for dir_path in [UPLOAD_DIR, PROCESSED_DIR, BACKGROUND_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Audio processing functions
def add_reverb(audio_data, sample_rate, decay=0.5, delay=0.1):
    """Add reverb effect to audio"""
    delay_samples = int(delay * sample_rate)
    reverb = np.zeros_like(audio_data)
    
    # Create multiple delayed copies with decreasing amplitude
    for i in range(1, 6):
        delay_pos = delay_samples * i
        if delay_pos < len(audio_data):
            reverb[delay_pos:] += audio_data[:-delay_pos] * (decay ** i)
    
    return audio_data + reverb * 0.3

def add_echo(audio_data, sample_rate, delay=0.3, decay=0.5):
    """Add echo effect to audio"""
    delay_samples = int(delay * sample_rate)
    echo = np.zeros_like(audio_data)
    
    if delay_samples < len(audio_data):
        echo[delay_samples:] = audio_data[:-delay_samples] * decay
    
    return audio_data + echo

def adjust_pitch(audio_data, sample_rate, pitch_shift=0):
    """Adjust pitch of audio (in semitones)"""
    if pitch_shift == 0:
        return audio_data
    
    # Use librosa for pitch shifting
    return librosa.effects.pitch_shift(
        audio_data, 
        sr=sample_rate, 
        n_steps=pitch_shift
    )

def process_audio_file(
    input_file: str,
    output_file: str,
    effects: dict,
    background_music: Optional[str] = None
):
    """Main audio processing function"""
    try:
        # Load the audio file
        audio = AudioSegment.from_file(input_file)
        
        # Convert to numpy array for processing
        audio_data = np.array(audio.get_array_of_samples(), dtype=np.float32)
        sample_rate = audio.frame_rate
        
        # Handle stereo audio
        if audio.channels == 2:
            audio_data = audio_data.reshape((-1, 2))
            audio_data = np.mean(audio_data, axis=1)  # Convert to mono for processing
        
        # Normalize audio data
        audio_data = audio_data / np.max(np.abs(audio_data))
        
        # Apply effects
        if effects.get('reverb', False):
            audio_data = add_reverb(audio_data, sample_rate)
        
        if effects.get('echo', False):
            audio_data = add_echo(audio_data, sample_rate)
        
        if effects.get('pitch_shift', 0) != 0:
            audio_data = adjust_pitch(audio_data, sample_rate, effects['pitch_shift'])
        
        # Apply volume adjustment
        volume_factor = effects.get('volume', 1.0)
        audio_data = audio_data * volume_factor
        
        # Convert back to AudioSegment
        audio_data = np.int16(audio_data * 32767)
        processed_audio = AudioSegment(
            audio_data.tobytes(),
            frame_rate=sample_rate,
            sample_width=2,
            channels=1
        )
        
        # Add background music if specified
        if background_music and background_music != 'none':
            bg_path = BACKGROUND_DIR / f"{background_music}.mp3"
            if bg_path.exists():
                background = AudioSegment.from_file(str(bg_path))
                
                # Adjust background volume
                bg_volume = effects.get('background_volume', 0.3)
                background = background - (20 - int(bg_volume * 20))  # Convert to dB
                
                # Loop background music to match main audio length
                if len(background) < len(processed_audio):
                    loops_needed = len(processed_audio) // len(background) + 1
                    background = background * loops_needed
                
                # Trim to match main audio length
                background = background[:len(processed_audio)]
                
                # Mix the audio
                processed_audio = processed_audio.overlay(background)
        
        # Normalize the final output
        processed_audio = normalize(processed_audio)
        
        # Export the processed audio
        processed_audio.export(output_file, format="mp3")
        
        return True
        
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        return False

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "audio-enhancement-api"}

@app.get("/api/background-music")
async def get_background_music():
    """Get list of available background music options"""
    try:
        # Create some default background music options
        background_options = [
            {"id": "none", "name": "No Background Music"},
            {"id": "beat1", "name": "Electronic Beat"},
            {"id": "beat2", "name": "Hip Hop Beat"},
            {"id": "ambient", "name": "Ambient Soundscape"},
            {"id": "jazz", "name": "Jazz Background"}
        ]
        
        return {"background_music": background_options}
    except Exception as e:
        logger.error(f"Error getting background music: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving background music options")

@app.post("/api/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """Upload audio file"""
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a', '.flac')):
            raise HTTPException(status_code=400, detail="Unsupported audio format")
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        upload_path = UPLOAD_DIR / f"{file_id}{file_extension}"
        
        # Save uploaded file
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get audio info
        audio = AudioSegment.from_file(str(upload_path))
        duration = len(audio) / 1000  # Convert to seconds
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "duration": duration,
            "format": file_extension[1:],  # Remove the dot
            "size": upload_path.stat().st_size
        }
        
    except Exception as e:
        logger.error(f"Error uploading audio: {str(e)}")
        raise HTTPException(status_code=500, detail="Error uploading audio file")

@app.post("/api/process-audio")
async def process_audio(
    file_id: str = Form(...),
    effects: str = Form(...)
):
    """Process audio file with effects"""
    try:
        # Parse effects JSON
        effects_data = json.loads(effects)
        
        # Find the uploaded file
        input_files = list(UPLOAD_DIR.glob(f"{file_id}.*"))
        if not input_files:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        input_file = input_files[0]
        
        # Create output file path
        output_file = PROCESSED_DIR / f"{file_id}_processed.mp3"
        
        # Process the audio
        success = process_audio_file(
            str(input_file),
            str(output_file),
            effects_data,
            effects_data.get('background_music')
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Error processing audio")
        
        return {
            "success": True,
            "processed_file_id": f"{file_id}_processed",
            "message": "Audio processed successfully"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid effects JSON")
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing audio")

@app.get("/api/download/{file_id}")
async def download_audio(file_id: str):
    """Download processed audio file"""
    try:
        file_path = PROCESSED_DIR / f"{file_id}.mp3"
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Processed audio file not found")
        
        return FileResponse(
            path=str(file_path),
            filename=f"enhanced_{file_id}.mp3",
            media_type="audio/mpeg"
        )
        
    except Exception as e:
        logger.error(f"Error downloading audio: {str(e)}")
        raise HTTPException(status_code=500, detail="Error downloading audio file")

@app.get("/api/preview/{file_id}")
async def preview_audio(file_id: str):
    """Stream audio file for preview"""
    try:
        # Check both original and processed files
        original_files = list(UPLOAD_DIR.glob(f"{file_id}.*"))
        processed_file = PROCESSED_DIR / f"{file_id}.mp3"
        
        if processed_file.exists():
            file_path = processed_file
        elif original_files:
            file_path = original_files[0]
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        return FileResponse(
            path=str(file_path),
            media_type="audio/mpeg"
        )
        
    except Exception as e:
        logger.error(f"Error previewing audio: {str(e)}")
        raise HTTPException(status_code=500, detail="Error previewing audio file")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)