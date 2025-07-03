import requests
import os
import time
import unittest
import json
from pathlib import Path

class AudioEnhancementAPITest(unittest.TestCase):
    def setUp(self):
        # Get the backend URL from the frontend .env file
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    self.base_url = line.strip().split('=')[1]
                    break
        
        print(f"Using backend URL: {self.base_url}")
        
        # Create a test audio file if it doesn't exist
        self.test_file_path = '/tmp/test_audio.mp3'
        if not os.path.exists(self.test_file_path):
            self._create_test_audio_file()
        
        self.file_id = None
        self.processed_file_id = None

    def _create_test_audio_file(self):
        """Create a simple test audio file using ffmpeg"""
        try:
            # Generate a 3-second sine wave audio file
            os.system(f"ffmpeg -f lavfi -i 'sine=frequency=440:duration=3' -c:a libmp3lame -q:a 2 {self.test_file_path}")
            print(f"Created test audio file at {self.test_file_path}")
        except Exception as e:
            print(f"Error creating test audio file: {e}")
            raise

    def test_01_health_check(self):
        """Test the health check endpoint"""
        response = requests.get(f"{self.base_url}/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "audio-enhancement-api")
        print("✅ Health check endpoint working")

    def test_02_background_music(self):
        """Test the background music endpoint"""
        response = requests.get(f"{self.base_url}/api/background-music")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("background_music", data)
        self.assertIsInstance(data["background_music"], list)
        self.assertGreater(len(data["background_music"]), 0)
        print(f"✅ Background music endpoint returned {len(data['background_music'])} options")

    def test_03_upload_audio(self):
        """Test uploading an audio file"""
        with open(self.test_file_path, 'rb') as f:
            files = {'file': ('test_audio.mp3', f, 'audio/mpeg')}
            response = requests.post(f"{self.base_url}/api/upload-audio", files=files)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("file_id", data)
        self.assertIn("duration", data)
        self.assertIn("format", data)
        
        # Save file_id for later tests
        self.file_id = data["file_id"]
        print(f"✅ Upload endpoint working, file_id: {self.file_id}")

    def test_04_process_audio_basic(self):
        """Test processing an audio file with basic effects"""
        if not self.file_id:
            self.test_03_upload_audio()
        
        effects = {
            "volume": 1.2,
            "pitch_shift": 2,
            "reverb": True,
            "echo": True,
            "background_music": "beat1",
            "background_volume": 0.5
        }
        
        data = {
            'file_id': self.file_id,
            'effects': json.dumps(effects)
        }
        
        response = requests.post(f"{self.base_url}/api/process-audio", data=data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("processed_file_id", data)
        
        # Save processed_file_id for later tests
        self.processed_file_id = data["processed_file_id"]
        print(f"✅ Process audio with basic effects working, processed_file_id: {self.processed_file_id}")
        
    def test_04a_process_audio_advanced(self):
        """Test processing an audio file with advanced effects"""
        if not self.file_id:
            self.test_03_upload_audio()
        
        # Test with all the new advanced effects
        effects = {
            "volume": 1.5,            # 0-200%
            "pitch_shift": 5,         # -12 to +12 semitones
            "tempo": 1.5,             # 50% to 200% speed
            "bass_boost": 10,         # -20 to +20 dB
            "treble_boost": 5,        # -20 to +20 dB
            "fade_in": 2,             # 0-10 seconds
            "fade_out": 3,            # 0-10 seconds
            "reverb": True,           # toggle
            "echo": True,             # toggle
            "noise_reduction": True,  # toggle
            "compression": True,      # toggle
            "stereo_wide": True,      # toggle
            "background_music": "beat1",
            "background_volume": 0.5
        }
        
        data = {
            'file_id': self.file_id,
            'effects': json.dumps(effects)
        }
        
        response = requests.post(f"{self.base_url}/api/process-audio", data=data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("processed_file_id", data)
        
        # Save processed_file_id for later tests
        self.processed_file_id = data["processed_file_id"]
        print(f"✅ Process audio with advanced effects working, processed_file_id: {self.processed_file_id}")

    def test_05_preview_original(self):
        """Test previewing the original audio file"""
        if not self.file_id:
            self.test_03_upload_audio()
        
        response = requests.get(f"{self.base_url}/api/preview/{self.file_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Content-Type'], 'audio/mpeg')
        print("✅ Preview original audio endpoint working")

    def test_06_preview_processed(self):
        """Test previewing the processed audio file"""
        if not self.processed_file_id:
            self.test_04_process_audio()
        
        response = requests.get(f"{self.base_url}/api/preview/{self.processed_file_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Content-Type'], 'audio/mpeg')
        print("✅ Preview processed audio endpoint working")

    def test_07_download_processed(self):
        """Test downloading the processed audio file"""
        if not self.processed_file_id:
            self.test_04_process_audio()
        
        response = requests.get(f"{self.base_url}/api/download/{self.processed_file_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Content-Type'], 'audio/mpeg')
        self.assertIn('attachment; filename=', response.headers['Content-Disposition'])
        print("✅ Download processed audio endpoint working")

    def test_08_error_handling(self):
        """Test error handling for invalid requests"""
        # Test invalid file upload
        with open('/app/backend_test.py', 'rb') as f:
            files = {'file': ('test.txt', f, 'text/plain')}
            response = requests.post(f"{self.base_url}/api/upload-audio", files=files)
        
        self.assertEqual(response.status_code, 400)
        print("✅ Upload validation working correctly")
        
        # Test invalid file_id for processing
        data = {
            'file_id': 'invalid_id',
            'effects': json.dumps({"volume": 1.0})
        }
        
        response = requests.post(f"{self.base_url}/api/process-audio", data=data)
        self.assertEqual(response.status_code, 404)
        print("✅ Process audio error handling working correctly")
        
        # Test invalid file_id for preview
        response = requests.get(f"{self.base_url}/api/preview/invalid_id")
        self.assertEqual(response.status_code, 404)
        print("✅ Preview error handling working correctly")
        
        # Test invalid file_id for download
        response = requests.get(f"{self.base_url}/api/download/invalid_id")
        self.assertEqual(response.status_code, 404)
        print("✅ Download error handling working correctly")

    def test_09_preset_rock(self):
        """Test the Rock preset"""
        if not self.file_id:
            self.test_03_upload_audio()
        
        # Rock preset settings
        effects = {
            "volume": 1.2,
            "bass_boost": 8,
            "treble_boost": 3,
            "compression": True,
            "background_music": "beat1"
        }
        
        data = {
            'file_id': self.file_id,
            'effects': json.dumps(effects)
        }
        
        response = requests.post(f"{self.base_url}/api/process-audio", data=data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        print("✅ Rock preset processing working correctly")
        
    def test_10_preset_hip_hop(self):
        """Test the Hip Hop preset"""
        if not self.file_id:
            self.test_03_upload_audio()
        
        # Hip Hop preset settings
        effects = {
            "volume": 1.1,
            "bass_boost": 12,
            "treble_boost": -2,
            "compression": True,
            "background_music": "beat2"
        }
        
        data = {
            'file_id': self.file_id,
            'effects': json.dumps(effects)
        }
        
        response = requests.post(f"{self.base_url}/api/process-audio", data=data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        print("✅ Hip Hop preset processing working correctly")
        
    def test_11_preset_jazz(self):
        """Test the Jazz preset"""
        if not self.file_id:
            self.test_03_upload_audio()
        
        # Jazz preset settings
        effects = {
            "volume": 1.0,
            "bass_boost": 0,
            "treble_boost": 5,
            "reverb": True,
            "background_music": "jazz"
        }
        
        data = {
            'file_id': self.file_id,
            'effects': json.dumps(effects)
        }
        
        response = requests.post(f"{self.base_url}/api/process-audio", data=data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        print("✅ Jazz preset processing working correctly")
        
    def test_12_preset_ambient(self):
        """Test the Ambient preset"""
        if not self.file_id:
            self.test_03_upload_audio()
        
        # Ambient preset settings
        effects = {
            "volume": 0.9,
            "bass_boost": -3,
            "treble_boost": 2,
            "reverb": True,
            "background_music": "ambient"
        }
        
        data = {
            'file_id': self.file_id,
            'effects': json.dumps(effects)
        }
        
        response = requests.post(f"{self.base_url}/api/process-audio", data=data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        print("✅ Ambient preset processing working correctly")