# 3D Virtual Tour and Interior Planning Platform using Computer Vision

## Floor-plan recognition service (Dual AI: Google Gemini + OpenAI)

The import UI accepts `.rvt`, `.ifc`, `.skp`, `.dwg`, `.dxf`, `.pdf`, `.jpg`, `.png`, and `.webp` plans. The FastAPI service directly analyzes plan images and PDFs using **Google Gemini Multimodal AI** (`gemini-3.8-flash`, `gemini-3.7-flash`, etc.) and **OpenAI Vision** (`gpt-4o`, `gpt-4o-mini`), returning structured walls, room polygons, doors, and windows.

### Automated Testing
To run the full automated test suite (backend AI tests, FastAPI contract tests, TypeScript checks, and Vite build verification):
```powershell
npm test
# or:
python run_all_tests.py
```

### Environment Configuration
Configure both AI engines in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Running Services
Run the backend and frontend in separate terminals:
```powershell
# Terminal 1 - Backend FastAPI Service
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend React + Vite
npm run dev
```


3D Virtual Tour and Interior Planning Platform using Computer Vision is a React + Vite real-estate prototype with a Blueprint3D floor-plan editor, 3D room tours, property workflows, local demo persistence, and an evaluation-preview display.

## Requirements

- Node.js 18 or newer
- npm
- Python 3.10 or newer only for `evaluate_model.py`

## Install and Start

From the project directory:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

For a production build and local preview:

```powershell
npm run build
npm run preview
```

## Main Features

- Buyer, builder, owner, and administrator demo profiles
- Property marketplace and saved local browser state
- Blueprint3D 2D floor-plan editing
- Three.js 3D room tours
- Furniture, wall, floor, save, and load workflows
- Property upload and review queue
- EMI calculator
- 3D interior metrics and graph showcase

## Important Project Paths

```text
src/                         React application and Blueprint3D source
public/blueprint3d/          Browser Blueprint3D runtime and plans
public/models/               Furniture model assets
public/rooms/                Room textures and thumbnails
vendor/blueprint3d/          Vendored upstream Blueprint3D source
home*_design.blueprint3d     Example serialized floor plans
evaluate_model.py            Real evaluator and opt-in preview evaluator
interior_confusion_matrix.png
interior_confusion_matrix_metrics.png
                             Generated showcase charts
```

## Evaluation Commands

### 3D Interior Preview

This command prints the current showcase values and creates both graphs:

```powershell
python evaluate_model.py --interior-preview --no-display --output interior_confusion_matrix.png
```

Current illustrative preview output:

```text
Accuracy:  0.783333
Precision: 0.791667
Recall:    0.783333
F1-Score:  0.783069
```

Generated files:

- `interior_confusion_matrix.png`
- `interior_confusion_matrix_metrics.png`

The preview values and matrix are explicitly illustrative placeholders. They are not measured model results.

### Real Computer-Vision Evaluation

The normal evaluator never fabricates scores. It requires a real Python pipeline, test images, and matching ground-truth annotations:

```powershell
python evaluate_model.py `
  --images test/images `
  --annotations test/annotations `
  --pipeline cv_pipeline:predict `
  --no-display
```

Expected annotation pairing uses the same filename stem:

```text
test/images/plan_001.png
test/annotations/plan_001.png
```

Pixel-level annotations may be mask images, `.npy` arrays, or JSON in this form:

```json
{"mask": [[0, 1], [1, 0]]}
```

Object-level annotations may use:

```json
{"labels": ["wall", "door", "room"]}
```

The real evaluator calculates Accuracy, Precision, Recall, F1-Score, a classification report, and a confusion matrix only when valid predictions and annotations are available.

## CubiCasa5K 

The upstream CubiCasa5K contains a floor-plan model implementation, but it does not include the complete 5,000-sample dataset or final evaluation checkpoint. The official dataset is approximately 5.47 GB and must be downloaded separately. CubiCasa5K is an external benchmark and is not the Blueprint3D model used by this frontend.

Blueprint3D itself is an editor and renderer. It does not contain a trained computer-vision detector, annotations, or model-evaluation data.

## Browser Data

The prototype stores demo properties, designs, and sessions in `localStorage`. Clear the site storage in the browser to reset local demo state.

## Technology

- React 19
- TypeScript
- Vite
- Three.js
- Blueprint3D
- Python, OpenCV, scikit-learn, and matplotlib for evaluation tooling
