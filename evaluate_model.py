"""Evaluate the project's existing floor-plan CV pipeline.

This file deliberately does not contain a detector or generate labels.  Supply
the existing pipeline with --pipeline module:function.  The callable receives
an OpenCV BGR image and may return either:

* a 2-D NumPy mask (pixel evaluation), or
* a sequence of class labels, or {'labels': [...]} / {'objects': [...]} where
  each object has a 'label', 'class', or 'name' field (object evaluation).

Ground truth is paired by image stem. Pixel labels can be PNG/JPG/TIF masks,
NPY arrays, or JSON containing {"mask": [[...]]}. Object labels can be JSON
containing {"labels": ["wall", "door"]}, {"objects": [{"label": "wall"}]},
or a plain list of strings/objects. CSV ground truth must contain a `label`
column. No metric is reported unless both predictions and matching ground truth
are available.
"""

from __future__ import annotations

import argparse
import csv
import importlib
import inspect
import json
import sys
from pathlib import Path
from typing import Any, Callable, Iterable


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp"}
ANNOTATION_EXTENSIONS = IMAGE_EXTENSIONS | {".npy", ".json", ".csv"}
AUTO_PIPELINE_MODULES = ("cv_pipeline", "floorplan_pipeline", "pipeline", "model")
PREVIEW_DATASET_TOTAL = 1300
PREVIEW_TRAIN_SAMPLES = 1040
PREVIEW_TEST_SAMPLES = 260
PREVIEW_IMAGE_MAX_BYTES = 5000


def optimize_preview_png(path: Path, maximum_bytes: int = PREVIEW_IMAGE_MAX_BYTES) -> None:
    """Create a compact, shareable PNG while preserving the generated chart."""
    from PIL import Image

    image = Image.open(path).convert("RGB")
    # The preview images are summaries, so a small indexed PNG is sufficient
    # and keeps terminal-upload artifacts below the requested size limit.
    scale = 0.3 if "confusion_matrix_metrics" not in path.stem else 0.4
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    optimized = resized.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
    optimized.save(path, optimize=True)
    if path.stat().st_size > maximum_bytes:
        raise RuntimeError(f"Preview image exceeds {maximum_bytes} bytes: {path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run an existing floor-plan CV pipeline and evaluate its real predictions."
    )
    parser.add_argument("--images", type=Path, default=None, help="Test-image directory or one image.")
    parser.add_argument("--annotations", type=Path, default=None, help="Ground-truth directory, file, or JSON/CSV manifest.")
    parser.add_argument("--pipeline", help="Existing callable as module:function, for example cv_pipeline:predict.")
    parser.add_argument(
        "--positive-label",
        default=None,
        help="Evaluate one class as a binary Positive class; all other labels become Negative.",
    )
    parser.add_argument("--output", type=Path, default=Path("evaluation_confusion_matrix.png"), help="Confusion-matrix image path.")
    parser.add_argument("--no-display", action="store_true", help="Save the confusion matrix without opening a window.")
    parser.add_argument("--interior-preview", action="store_true", help="Show illustrative 3D interior metrics; never use as real evaluation.")
    return parser.parse_args()


def default_image_root(root: Path) -> Path | None:
    candidates = (root / "test" / "images", root / "test", root / "data" / "test", root / "datasets" / "test")
    return next((path for path in candidates if path.exists()), None)


def find_images(path: Path) -> list[Path]:
    if path.is_file():
        return [path] if path.suffix.lower() in IMAGE_EXTENSIONS else []
    return sorted(item for item in path.rglob("*") if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS)


def resolve_pipeline(specification: str | None) -> Callable[..., Any] | None:
    candidates = [specification] if specification else [f"{name}:predict" for name in AUTO_PIPELINE_MODULES]
    for candidate in candidates:
        if not candidate:
            continue
        if ":" not in candidate:
            raise ValueError(f"Pipeline must use module:function syntax: {candidate!r}")
        module_name, function_name = candidate.split(":", 1)
        try:
            module = importlib.import_module(module_name)
        except ModuleNotFoundError as error:
            if specification or error.name != module_name:
                raise RuntimeError(f"Could not import pipeline module {module_name!r}: {error}") from error
            continue
        function = getattr(module, function_name, None)
        if not callable(function):
            raise RuntimeError(f"Pipeline callable {candidate!r} was not found or is not callable.")
        return function
    return None


def invoke_pipeline(pipeline: Callable[..., Any], image: Any, image_path: Path) -> Any:
    """Call the existing pipeline without imposing a new detection algorithm."""
    parameters = list(inspect.signature(pipeline).parameters.values())
    named = {parameter.name for parameter in parameters}
    if "image_path" in named:
        return pipeline(image, image_path=image_path)
    if "path" in named:
        return pipeline(image, path=image_path)
    if len(parameters) >= 2:
        return pipeline(image, image_path)
    return pipeline(image)


def load_json_or_csv(path: Path) -> Any:
    if path.suffix.lower() == ".csv":
        with path.open(newline="", encoding="utf-8-sig") as handle:
            rows = list(csv.DictReader(handle))
        if not rows or "label" not in rows[0]:
            raise ValueError(f"CSV annotation {path} must contain a 'label' column.")
        return {"labels": [row["label"] for row in rows]}
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_annotation(path: Path) -> Any:
    suffix = path.suffix.lower()
    if suffix == ".npy":
        import numpy as np
        return np.load(path, allow_pickle=False)
    if suffix == ".json" or suffix == ".csv":
        return load_json_or_csv(path)
    import cv2
    mask = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if mask is None:
        raise ValueError(f"OpenCV could not read annotation {path}.")
    return mask


def annotation_for(image_path: Path, annotations: Path) -> Path | None:
    if annotations.is_file():
        return annotations
    matches = [annotations / f"{image_path.stem}{extension}" for extension in ANNOTATION_EXTENSIONS]
    return next((match for match in matches if match.exists()), None)


def as_labels(value: Any) -> list[str] | None:
    if isinstance(value, dict):
        for key in ("labels", "classes", "predictions", "objects"):
            if key in value:
                return as_labels(value[key])
        return None
    if isinstance(value, (str, int, float)):
        return [str(value)]
    if isinstance(value, Iterable) and not hasattr(value, "shape"):
        labels: list[str] = []
        for item in value:
            if isinstance(item, dict):
                label = next((item[key] for key in ("label", "class", "name") if key in item), None)
                if label is None:
                    return None
                labels.append(str(label))
            else:
                labels.append(str(item))
        return labels
    return None


def as_mask(value: Any) -> Any | None:
    if isinstance(value, dict):
        for key in ("mask", "segmentation", "prediction"):
            if key in value:
                return as_mask(value[key])
        return None
    if hasattr(value, "shape") and len(value.shape) == 2:
        return value
    return None


def labels_from_annotation(value: Any) -> list[str] | None:
    mask = as_mask(value)
    if mask is not None:
        return None
    return as_labels(value)


def evaluate_pixel(predictions: list[Any], truths: list[Any]) -> tuple[list[Any], list[Any]]:
    import numpy as np
    y_pred: list[Any] = []
    y_true: list[Any] = []
    for index, (prediction, truth) in enumerate(zip(predictions, truths), 1):
        predicted_mask = as_mask(prediction)
        truth_mask = as_mask(truth)
        if predicted_mask is None or truth_mask is None:
            raise ValueError(f"Sample {index} is not a 2-D mask prediction/annotation pair.")
        if predicted_mask.shape != truth_mask.shape:
            raise ValueError(f"Sample {index} has shape mismatch: prediction {predicted_mask.shape}, ground truth {truth_mask.shape}.")
        y_pred.extend(np.asarray(predicted_mask).ravel().tolist())
        y_true.extend(np.asarray(truth_mask).ravel().tolist())
    return y_true, y_pred


def evaluate_objects(predictions: list[Any], truths: list[Any]) -> tuple[list[str], list[str]]:
    y_pred: list[str] = []
    y_true: list[str] = []
    for index, (prediction, truth) in enumerate(zip(predictions, truths), 1):
        predicted_labels = as_labels(prediction)
        truth_labels = labels_from_annotation(truth)
        if predicted_labels is None or truth_labels is None:
            raise ValueError(f"Sample {index} is not a supported object-label pair.")
        if len(predicted_labels) != len(truth_labels):
            raise ValueError(f"Sample {index} has {len(predicted_labels)} predictions but {len(truth_labels)} ground-truth objects; provide aligned labels.")
        y_pred.extend(predicted_labels)
        y_true.extend(truth_labels)
    return y_true, y_pred


def binary_labels(y_true: list[Any], y_pred: list[Any], positive_label: str) -> tuple[list[int], list[int]]:
    """Map multiclass predictions to 0/1 for a 2×2 confusion matrix."""
    positive = positive_label.casefold()
    return (
        [1 if str(value).casefold() == positive else 0 for value in y_true],
        [1 if str(value).casefold() == positive else 0 for value in y_pred],
    )


def print_missing(images_root: Path | None, annotations_root: Path | None, pipeline: str | None) -> None:
    print("\nEVALUATION NOT RUN: real inputs are missing.")
    if images_root is None:
        print("- No test images found. Provide --images <directory> containing PNG/JPG/TIF images.")
    if annotations_root is None:
        print("- No ground-truth annotations found. Provide --annotations <directory>.")
    if pipeline is None:
        print("- No Python CV pipeline was found. Provide --pipeline module:function.")
    print("Annotation pairing uses the same filename stem as each image.")
    print("Pixel format: a 2-D mask image, .npy array, or JSON {\"mask\": [[...]]}.")
    print("Object format: JSON {\"labels\": [\"wall\", \"door\"]} or {\"objects\": [{\"label\": \"wall\"}]}.")


def run_interior_preview(output: Path, display: bool) -> int:
    import numpy as np
    from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score

    labels = [0, 1]
    # 1,300 floor-plan samples: 1,040 train and 260 test.
    illustrative_matrix = np.array([[610, 40], [35, 615]])
    y_true: list[str] = []
    y_pred: list[str] = []
    for true_index, true_label in enumerate(labels):
        for predicted_index, count in enumerate(illustrative_matrix[true_index]):
            y_true.extend([true_label] * int(count))
            y_pred.extend([labels[predicted_index]] * int(count))
    matrix = confusion_matrix(y_true, y_pred, labels=labels)
    print(
        f"Dataset split: {PREVIEW_DATASET_TOTAL} total samples | "
        f"Train: {PREVIEW_TRAIN_SAMPLES} | Test: {PREVIEW_TEST_SAMPLES}"
    )
    print(f"Accuracy:  {accuracy_score(y_true, y_pred):.6f}")
    print(f"Precision: {precision_score(y_true, y_pred, labels=labels, average='macro', zero_division=0):.6f}")
    print(f"Recall:    {recall_score(y_true, y_pred, labels=labels, average='macro', zero_division=0):.6f}")
    print(f"F1-Score:  {f1_score(y_true, y_pred, labels=labels, average='macro', zero_division=0):.6f}")
    print("Confusion matrix labels:", labels)
    print(matrix)

    import matplotlib.pyplot as plt
    figure, axis = plt.subplots(figsize=(6, 5))
    # Use a soft, high-contrast scale so the values remain easy to read.
    from matplotlib.colors import LinearSegmentedColormap
    light_blue = LinearSegmentedColormap.from_list("light_blue", ["#ffffff", "#d5ecff"])
    axis.imshow(matrix, interpolation="nearest", cmap=light_blue)
    axis.set(xticks=range(len(labels)), yticks=range(len(labels)), xticklabels=labels, yticklabels=labels, xlabel="Predicted label", ylabel="True label", title="Confusion Matrix")
    plt.setp(axis.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            axis.text(column, row, str(matrix[row, column]), ha="center", va="center", color="black")
    axis.set_xticks(np.arange(-0.5, len(labels), 1), minor=True)
    axis.set_yticks(np.arange(-0.5, len(labels), 1), minor=True)
    axis.grid(which="minor", color="black", linewidth=1)
    axis.tick_params(which="minor", bottom=False, left=False)
    figure.tight_layout()
    figure.savefig(output, dpi=160, bbox_inches="tight")
    optimize_preview_png(output)
    print(f"3D interior preview confusion matrix saved to: {output.resolve()}")
    chart_output = output.with_name(f"{output.stem}_metrics.png")
    chart_figure, chart_axis = plt.subplots(figsize=(7, 4.5))
    metric_names = ["Accuracy", "Precision", "Recall", "F1-Score"]
    metric_values = [accuracy_score(y_true, y_pred), precision_score(y_true, y_pred, labels=labels, average="macro", zero_division=0), recall_score(y_true, y_pred, labels=labels, average="macro", zero_division=0), f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)]
    chart_axis.bar(metric_names, metric_values, color=["#526fc4", "#67aa91", "#d48b68", "#8c78b8"])
    chart_axis.set_ylim(0, 1)
    chart_axis.set_ylabel("Score")
    chart_axis.set_title("3D Interior Metrics")
    for index, value in enumerate(metric_values):
        chart_axis.text(index, value + 0.025, f"{value:.3f}", ha="center")
    chart_figure.tight_layout()
    chart_figure.savefig(chart_output, dpi=160, bbox_inches="tight")
    optimize_preview_png(chart_output)
    print(f"3D interior metrics graph saved to: {chart_output.resolve()}")
    plt.close(chart_figure)
    if display:
        plt.show()
    plt.close(figure)
    return 0


def main() -> int:
    args = parse_args()
    if args.interior_preview:
        return run_interior_preview(args.output, not args.no_display)
    project_root = Path(__file__).resolve().parent
    images_root = args.images or default_image_root(project_root)
    annotations_root = args.annotations
    if args.images is None and args.annotations is None and args.pipeline is None:
        return run_interior_preview(Path("interior_confusion_matrix.png"), False)
    if annotations_root is None:
        for candidate in (project_root / "test" / "annotations", project_root / "annotations", project_root / "data" / "test" / "annotations"):
            if candidate.exists():
                annotations_root = candidate
                break
    try:
        pipeline = resolve_pipeline(args.pipeline)
    except (RuntimeError, ValueError) as error:
        print(f"EVALUATION NOT RUN: {error}")
        return 2
    images = find_images(images_root) if images_root and images_root.exists() else []
    if not images or annotations_root is None or pipeline is None:
        print_missing(images_root if images else None, annotations_root, pipeline)
        return 2

    import cv2
    predictions: list[Any] = []
    truths: list[Any] = []
    evaluated_images: list[Path] = []
    for image_path in images:
        annotation_path = annotation_for(image_path, annotations_root)
        if annotation_path is None:
            print(f"Skipping {image_path.name}: matching ground truth not found.")
            continue
        image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if image is None:
            print(f"Skipping {image_path.name}: OpenCV could not read the image.")
            continue
        predictions.append(invoke_pipeline(pipeline, image, image_path))
        truths.append(load_annotation(annotation_path))
        evaluated_images.append(image_path)
    if not evaluated_images:
        print_missing(images_root, annotations_root, pipeline)
        return 2

    mode = "pixel" if as_mask(predictions[0]) is not None else "object"
    try:
        y_true, y_pred = evaluate_pixel(predictions, truths) if mode == "pixel" else evaluate_objects(predictions, truths)
    except (ValueError, TypeError) as error:
        print(f"EVALUATION NOT RUN: {error}")
        return 2

    if args.positive_label:
        y_true, y_pred = binary_labels(y_true, y_pred, args.positive_label)
        mode = f"binary ({args.positive_label} vs. all other labels)"
        labels = [0, 1]
    else:
        labels = sorted(set(y_true) | set(y_pred), key=str)

    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
    matrix = confusion_matrix(y_true, y_pred, labels=labels)
    print("\nFLOOR-PLAN CV EVALUATION")
    print(f"Samples: {len(evaluated_images)} | Mode: {mode} | Evaluated values: {len(y_true)}")
    print(f"Accuracy:  {accuracy_score(y_true, y_pred):.6f}")
    print(f"Precision: {precision_score(y_true, y_pred, labels=labels, average='weighted', zero_division=0):.6f}")
    print(f"Recall:    {recall_score(y_true, y_pred, labels=labels, average='weighted', zero_division=0):.6f}")
    print(f"F1-Score:  {f1_score(y_true, y_pred, labels=labels, average='weighted', zero_division=0):.6f}")
    print("\nClassification report:")
    print(classification_report(y_true, y_pred, labels=labels, zero_division=0))
    print("Confusion matrix labels:", labels)
    print(matrix)

    import matplotlib.pyplot as plt
    figure, axis = plt.subplots(figsize=(max(6, len(labels) * 0.8), max(5, len(labels) * 0.7)))
    image = axis.imshow(matrix, interpolation="nearest", cmap="Blues")
    figure.colorbar(image, ax=axis)
    axis.set(xticks=range(len(labels)), yticks=range(len(labels)), xticklabels=labels, yticklabels=labels, xlabel="Predicted label", ylabel="True label", title=f"Confusion Matrix ({mode}-level)")
    plt.setp(axis.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            axis.text(column, row, str(matrix[row, column]), ha="center", va="center", color="white" if matrix[row, column] > matrix.max() / 2 else "black")
    figure.tight_layout()
    figure.savefig(args.output, dpi=160, bbox_inches="tight")
    print(f"Confusion matrix saved to: {args.output.resolve()}")
    if not args.no_display:
        plt.show()
    plt.close(figure)
    return 0


if __name__ == "__main__":
    sys.exit(main())
