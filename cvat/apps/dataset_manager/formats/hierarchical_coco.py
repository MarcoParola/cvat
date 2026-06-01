# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Hierarchical COCO format exporter and importer.

Extends the standard COCO format with a `parent_id` field in each annotation,
enabling export/import of hierarchical (parent-child) relationships between
annotations. The format is fully compatible with standard COCO tools —
the `parent_id` field is simply ignored by tools that don't support it.

Output JSON structure:
{
    "images": [...],
    "annotations": [
        {
            "id": 1,
            "image_id": 0,
            "category_id": 1,
            "segmentation": [[...]],
            "bbox": [x, y, w, h],
            "area": float,
            "iscrowd": 0,
            "parent_id": null | int,   // <-- hierarchy field
            "attributes": {...},
            "score": float
        },
        ...
    ],
    "categories": [...],
    "info": {
        "description": "Hierarchical COCO export from CVAT",
        "version": "1.0",
        "format": "hierarchical_coco"
    }
}
"""

import json
import math
import os
import zipfile
from collections import defaultdict
from datetime import datetime
from typing import BinaryIO

from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import exporter, importer


def _cvat_shape_to_coco_annotation(shape, annotation_id, image_id, label_name_map):
    """Convert a CVAT shape dict to a COCO annotation dict with parent_id."""
    shape_type = shape.get("type", "")
    points = shape.get("points", [])
    parent_id = shape.get("parent_id", None)
    rotation = shape.get("rotation", 0)
    occluded = shape.get("occluded", False)

    # Build segmentation and bbox based on shape type
    segmentation = []
    bbox = [0, 0, 0, 0]
    area = 0.0

    if shape_type == "rectangle":
        if len(points) >= 4:
            x1, y1, x2, y2 = points[0], points[1], points[2], points[3]
            w = x2 - x1
            h = y2 - y1
            bbox = [x1, y1, w, h]
            area = w * h
            segmentation = [[x1, y1, x2, y1, x2, y2, x1, y2]]

    elif shape_type == "polygon":
        if len(points) >= 6:
            segmentation = [list(points)]
            xs = points[0::2]
            ys = points[1::2]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            bbox = [x_min, y_min, x_max - x_min, y_max - y_min]
            n = len(xs)
            area = 0.0
            for i in range(n):
                j = (i + 1) % n
                area += xs[i] * ys[j]
                area -= xs[j] * ys[i]
            area = abs(area) / 2.0

    elif shape_type == "ellipse":
        if len(points) >= 4:
            cx, cy = points[0], points[1]
            rx = abs(points[2] - cx)
            ry = abs(cy - points[3])
            bbox = [cx - rx, cy - ry, 2 * rx, 2 * ry]
            area = math.pi * rx * ry
            n_pts = 36
            seg = []
            for i in range(n_pts):
                angle = 2 * math.pi * i / n_pts
                seg.extend([cx + rx * math.cos(angle), cy + ry * math.sin(angle)])
            segmentation = [seg]

    elif shape_type == "polyline":
        if len(points) >= 4:
            segmentation = [list(points)]
            xs = points[0::2]
            ys = points[1::2]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            bbox = [x_min, y_min, x_max - x_min, y_max - y_min]
            area = 0.0

    elif shape_type == "points":
        if len(points) >= 2:
            xs = points[0::2]
            ys = points[1::2]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            margin = 2
            bbox = [x_min - margin, y_min - margin,
                    x_max - x_min + 2 * margin, y_max - y_min + 2 * margin]
            area = bbox[2] * bbox[3]
            segmentation = [list(points)]

    else:
        if points:
            segmentation = [list(points)]
            xs = [points[i] for i in range(0, len(points), 2) if i + 1 < len(points)]
            ys = [points[i] for i in range(1, len(points), 2)]
            if xs and ys:
                x_min, x_max = min(xs), max(xs)
                y_min, y_max = min(ys), max(ys)
                bbox = [x_min, y_min, x_max - x_min, y_max - y_min]
                area = bbox[2] * bbox[3]

    # Export attributes as a dict
    attributes_dict = {}
    for attr in shape.get("attributes", []):
        attributes_dict[str(attr["spec_id"])] = attr["value"]

    label_id = shape.get("label_id", 0)
    label_name = label_name_map.get(label_id, str(label_id))

    # Use the CVAT shape ID as the annotation id so parent_id references match
    cvat_shape_id = shape.get("id", annotation_id)

    annotation = {
        "id": cvat_shape_id,
        "image_id": image_id,
        "category_id": label_id,
        "category_name": label_name,
        "segmentation": segmentation,
        "bbox": [round(v, 2) for v in bbox],
        "area": round(area, 2),
        "iscrowd": 0,
        "parent_id": parent_id,
        "shape_type": shape_type,
        "occluded": occluded,
        "rotation": rotation,
        "z_order": shape.get("z_order", 0),
        "group": shape.get("group", 0),
    }

    if attributes_dict:
        annotation["attributes"] = attributes_dict

    return annotation


@exporter(name="Hierarchical COCO", ext="ZIP", version="1.0")
def _export_hierarchical_coco(dst_file, temp_dir, instance_data, save_images=False):
    """
    Export annotations in Hierarchical COCO format.
    This is a standard COCO JSON with an additional `parent_id` field
    per annotation to represent hierarchical relationships.
    """
    # Build label mapping from _label_mapping (label_id -> db_label)
    label_name_map = {}
    categories = []

    for label_id, db_label in instance_data._label_mapping.items():
        label_name_map[label_id] = db_label.name
        cat = {
            "id": label_id,
            "name": db_label.name,
            "supercategory": db_label.parent.name if db_label.parent else "none",
        }
        if db_label.color:
            cat["color"] = db_label.color
        if db_label.type:
            cat["type"] = db_label.type
        categories.append(cat)

    # Collect all shapes from the IR data (streaming-safe: iterate once)
    all_shapes = list(instance_data._annotation_ir.shapes)

    # Group shapes by frame
    shapes_by_frame = defaultdict(list)
    for shape in all_shapes:
        shapes_by_frame[shape["frame"]].append(shape)

    # Build images and annotations using frame_info
    images = []
    annotations = []
    annotation_id = 1
    seen_frames = set()

    for frame_idx, frame_info in sorted(instance_data._frame_info.items()):
        if frame_idx not in shapes_by_frame:
            continue  # Skip frames with no shapes

        seen_frames.add(frame_idx)
        abs_frame = instance_data.abs_frame_id(frame_idx)

        image_entry = {
            "id": abs_frame,
            "file_name": frame_info["path"],
            "height": frame_info["height"],
            "width": frame_info["width"],
        }
        images.append(image_entry)

        for shape in shapes_by_frame[frame_idx]:
            ann = _cvat_shape_to_coco_annotation(
                shape, annotation_id, abs_frame, label_name_map,
            )
            annotations.append(ann)
            annotation_id += 1

    # Build the final COCO structure
    coco_data = {
        "info": {
            "description": "Hierarchical COCO export from CVAT",
            "version": "1.0",
            "format": "hierarchical_coco",
            "date_created": datetime.now().isoformat(),
        },
        "images": images,
        "annotations": annotations,
        "categories": categories,
    }

    # Write JSON
    annotations_dir = os.path.join(temp_dir, "annotations")
    os.makedirs(annotations_dir, exist_ok=True)
    json_path = os.path.join(annotations_dir, "instances_default.json")

    with open(json_path, "w") as f:
        json.dump(coco_data, f, indent=2)

    # Optionally copy images
    if save_images:
        images_dir = os.path.join(temp_dir, "images")
        os.makedirs(images_dir, exist_ok=True)
        for frame_data in instance_data.group_by_frame(include_empty=True):
            if frame_data.idx in seen_frames:
                frame_data.export(images_dir)

    make_zip_archive(temp_dir, dst_file)


@importer(name="Hierarchical COCO", ext="JSON, ZIP", version="1.0")
def _import_hierarchical_coco(
    src_file: BinaryIO, temp_dir, instance_data, load_data_callback=None, **kwargs
):
    """
    Import annotations from Hierarchical COCO format.
    Reads a standard COCO JSON and maps parent_id fields to CVAT's
    hierarchical annotation structure.
    """
    # Extract or locate the JSON file
    if zipfile.is_zipfile(src_file):
        src_file.seek(0)
        with zipfile.ZipFile(src_file) as zf:
            zf.extractall(temp_dir)
        json_path = None
        for root, _dirs, files in os.walk(temp_dir):
            for f in files:
                if f.endswith(".json"):
                    json_path = os.path.join(root, f)
                    break
            if json_path:
                break
        if not json_path:
            raise ValueError("No JSON annotation file found in the ZIP archive")
    else:
        src_file.seek(0)
        json_path = os.path.join(temp_dir, "annotations.json")
        with open(json_path, "wb") as f:
            f.write(src_file.read())

    with open(json_path, "r") as f:
        coco_data = json.load(f)

    # Build category mapping: coco_cat_id -> label_name
    cat_id_to_name = {}
    for cat in coco_data.get("categories", []):
        cat_id_to_name[cat["id"]] = cat["name"]

    # Build image mapping: image_id -> image_info
    image_map = {}
    for img in coco_data.get("images", []):
        image_map[img["id"]] = img

    coco_type_to_cvat = {
        "rectangle": "rectangle",
        "polygon": "polygon",
        "polyline": "polyline",
        "points": "points",
        "ellipse": "ellipse",
    }

    # Build label name -> label_id mapping from instance_data
    labels_meta = instance_data.meta[instance_data.META_FIELD]["labels"]
    label_name_to_id = {}
    for label_info in labels_meta:
        label = label_info[1]
        label_name_to_id[label["name"]] = int(label.get("label_id", 0))

    shapes = []
    for ann in coco_data.get("annotations", []):
        image_id = ann["image_id"]
        image_info = image_map.get(image_id, {})

        label_name = cat_id_to_name.get(ann["category_id"], "unknown")
        label_id = label_name_to_id.get(label_name)
        if label_id is None:
            continue

        shape_type = ann.get("shape_type", "polygon")
        cvat_type = coco_type_to_cvat.get(shape_type, "polygon")

        points = []
        if ann.get("segmentation") and len(ann["segmentation"]) > 0:
            points = ann["segmentation"][0]
        elif ann.get("bbox"):
            x, y, w, h = ann["bbox"]
            if cvat_type == "rectangle":
                points = [x, y, x + w, y + h]
            else:
                points = [x, y, x + w, y, x + w, y + h, x, y + h]

        attributes = []
        for spec_id, value in ann.get("attributes", {}).items():
            attributes.append({"spec_id": int(spec_id), "value": str(value)})

        frame = image_info.get("id", 0)

        shape = {
            "type": cvat_type,
            "frame": frame,
            "label_id": label_id,
            "points": points,
            "occluded": ann.get("occluded", False),
            "rotation": ann.get("rotation", 0),
            "z_order": ann.get("z_order", 0),
            "group": ann.get("group", 0),
            "source": "file",
            "attributes": attributes,
            "parent_id": ann.get("parent_id"),
        }

        shapes.append((ann["id"], shape))

    for _coco_id, shape in shapes:
        instance_data.add_shape(shape)
