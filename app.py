from flask import Flask, render_template, request, redirect, url_for, session
import cv2
from ultralytics import YOLO
import base64
import os

app = Flask(__name__)
app.secret_key = 'SkinCheck_CSCKT'

# Configuration
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'jfif'}
# Model
app.config['MODEL_PATH'] = 'model/yolov8n.pt'
app.config['IMAGE_SIZE'] = 640

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Load YOLOv8 model
model = YOLO(app.config['MODEL_PATH'])

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def process_uploaded_file(file):
    """Handle file upload and processing pipeline"""
    if not file or file.filename == '':
        return None, None
    if not allowed_file(file.filename):
        return None, None
    
    try:
        # Save file
        img_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(img_path)
        
        # Process detection
        results = detect_skin_disease(img_path)
        return img_path, results
    except Exception as e:
        app.logger.error(f"File processing error: {str(e)}")
        return None, None

def detect_skin_disease(img_path):
    """Perform disease detection on uploaded image"""
    try:
        img = cv2.imread(img_path)
        if img is None:
            return []

        # Preprocess for YOLOv8
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img, (app.config['IMAGE_SIZE'], app.config['IMAGE_SIZE']))
        
        # Run prediction
        results = model.predict(img_resized)
        
        detected_conditions = []
        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                label = model.names[cls]
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                detected_conditions.append({
                    'label': label,
                    'confidence': f"{conf * 100:.1f}%",
                    'bbox': [x1, y1, x2, y2]
                })
        
        return detected_conditions
    except Exception as e:
        app.logger.error(f"Detection error: {str(e)}")
        return []

def image_to_base64(img_path):
    """Convert image file to base64 encoded string"""
    try:
        with open(img_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        app.logger.error(f"Image encoding error: {str(e)}")
        return None

def handle_upload_request():
    """Common handler for file upload routes"""
    if request.method != 'POST':
        return None
    
    if 'file' not in request.files:
        return redirect(request.url)
    
    file = request.files['file']
    img_path, results = process_uploaded_file(file)
    
    if not img_path or results is None:
        return redirect(request.url)
    
    session['img_path'] = img_path
    session['results'] = results
    return redirect(url_for('result'))

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/camera', methods=['GET', 'POST'])
def camera():
    if request.method == 'POST':
        return handle_upload_request()
    return render_template('camera.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        return handle_upload_request()
    return render_template('upload.html')

# Result Page
@app.route('/result')
def result():
    img_path = session.get('img_path')
    results = session.get('results', [])
    
    encoded_image = image_to_base64(img_path) if img_path else None
    if not encoded_image:
        return redirect(url_for('index'))
    
    return render_template('result.html', 
                         image=encoded_image, 
                         results=results)

if __name__ == '__main__':
    app.run(debug=True)
