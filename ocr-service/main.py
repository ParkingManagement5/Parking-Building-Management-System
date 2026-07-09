import re
from functools import lru_cache
from typing import Iterable

import cv2
import easyocr
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile


app = FastAPI(title="ParkSmart OCR Service")

VALID_PROVINCES = {
    "11", "12", "14", "15", "16", "17", "18", "19",
    "20", "21", "22", "23", "24", "25", "26", "27", "28", "29",
    "30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
    "40", "41", "43", "47", "48", "49",
    "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
    "60", "61", "62", "63", "64", "65", "66", "67", "68", "69",
    "70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
    "80", "81", "82", "83", "84", "85", "86", "88", "89",
    "90", "92", "93", "94", "95", "97", "98", "99",
}
SPECIAL_SERIES = ("CD", "HC", "KT", "LD", "MK", "NG", "NN", "QT", "T")
SERIES_PATTERN = r"(?:[A-Z]\d|[A-Z]{1,2})"
PLATE_PATTERN = re.compile(
    rf"(?<![A-Z0-9])(\d{{2}})[-.]?({SERIES_PATTERN})[-.]?(\d{{4}}|\d{{5}}|\d{{3}}[.]\d{{2}})(?![A-Z0-9])"
)


@lru_cache(maxsize=1)
def get_reader():
    return easyocr.Reader(["en"], gpu=False)


@app.on_event("startup")
def warm_easyocr():
    get_reader()


def normalize_plate(text: str | None) -> str | None:
    if not text:
        return None

    compact = (
        text.upper()
        .replace(" ", "")
        .replace("I", "1")
        .replace("O", "0")
    )
    compact = re.sub(r"[^A-Z0-9.-]", "", compact)

    for province, series, serial in PLATE_PATTERN.findall(compact):
        serial = serial.replace(".", "")
        if not is_supported_plate(province, series, serial):
            continue
        prefix = format_prefix(province, series)
        if len(serial) == 5:
            return f"{prefix}-{serial[:3]}.{serial[3:]}"
        return f"{prefix}-{serial}"

    return None


def is_supported_plate(province: str, series: str, serial: str) -> bool:
    if province not in VALID_PROVINCES:
        return False
    if len(serial) not in (4, 5):
        return False
    if series in SPECIAL_SERIES:
        return len(serial) == 5
    return bool(re.fullmatch(SERIES_PATTERN, series))


def format_prefix(province: str, series: str) -> str:
    return f"{province}-{series}" if len(series) > 1 else f"{province}{series}"


def decode_image(image_bytes: bytes):
    buffer = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image")
    return image


def crop_likely_plate(image):
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    white_mask = cv2.inRange(hsv, np.array([0, 0, 145]), np.array([180, 90, 255]))
    contours, _ = cv2.findContours(white_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    image_area = image.shape[0] * image.shape[1]
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < image_area * 0.04:
            continue
        ratio = w / max(h, 1)
        if 1.2 <= ratio <= 6.5:
            candidates.append((area, x, y, w, h))

    if not candidates:
        return image

    _, x, y, w, h = max(candidates, key=lambda item: item[0])
    pad = int(max(w, h) * 0.04)
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(image.shape[1], x + w + pad)
    y2 = min(image.shape[0], y + h + pad)
    return image[y1:y2, x1:x2]


def preprocess_variants(image) -> Iterable[np.ndarray]:
    plate = crop_likely_plate(image)
    if plate.shape[1] > 900:
        ratio = 900 / plate.shape[1]
        plate = cv2.resize(plate, None, fx=ratio, fy=ratio, interpolation=cv2.INTER_AREA)

    yield plate

    scale = max(1.5, min(3.0, 1000 / max(plate.shape[1], 1)))
    enlarged = cv2.resize(plate, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(enlarged, cv2.COLOR_BGR2GRAY)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(denoised)
    _, otsu = cv2.threshold(clahe, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    yield clahe
    yield cv2.bitwise_not(otsu)


def ordered_text(results) -> str:
    sorted_results = sorted(
        results,
        key=lambda item: (
            min(point[1] for point in item[0]),
            min(point[0] for point in item[0]),
        ),
    )
    return " ".join(text for _, text, _ in sorted_results)


def serial_confidence(results) -> float:
    best = 0.0
    for _, text, confidence in results:
        digits = re.sub(r"\D", "", text)
        if len(digits) >= 4:
            best = max(best, float(confidence))
    return best


def read_candidates(image):
    reader = get_reader()
    candidates = []
    raw_attempts = []

    variants = list(preprocess_variants(image))
    read_modes = [{}]

    for mode_index, kwargs in enumerate(read_modes):
        for variant in variants:
            results = reader.readtext(variant, detail=1, paragraph=False, **kwargs)
            raw_text = ordered_text(results)
            if raw_text:
                raw_attempts.append(raw_text)
            plate = normalize_plate(raw_text)
            confidences = [float(conf) for _, _, conf in results]
            confidence = sum(confidences) / len(confidences) if confidences else 0.0
            if plate:
                candidate = {
                    "plate": plate,
                    "confidence": min(confidence + 0.10, 1.0),
                    "rawText": raw_text,
                    "serialConfidence": serial_confidence(results),
                }
                candidates.append(candidate)

        if candidates:
            break

    if not candidates:
        fallback_modes = [
            {
                "decoder": "greedy",
                "text_threshold": 0.25,
                "low_text": 0.1,
                "link_threshold": 0.1,
                "canvas_size": 2560,
                "mag_ratio": 1.3,
            },
            {
                "allowlist": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-",
                "decoder": "greedy",
                "text_threshold": 0.25,
                "low_text": 0.1,
                "link_threshold": 0.1,
                "canvas_size": 2560,
                "mag_ratio": 1.3,
            },
        ]
        for kwargs in fallback_modes:
            for variant in variants:
                results = reader.readtext(variant, detail=1, paragraph=False, **kwargs)
                raw_text = ordered_text(results)
                if raw_text:
                    raw_attempts.append(raw_text)
                plate = normalize_plate(raw_text)
                confidences = [float(conf) for _, _, conf in results]
                confidence = sum(confidences) / len(confidences) if confidences else 0.0
                if plate:
                    candidates.append(
                        {
                            "plate": plate,
                            "confidence": min(confidence + 0.10, 1.0),
                            "rawText": raw_text,
                            "serialConfidence": serial_confidence(results),
                        }
                    )
            if candidates:
                break

    return candidates, " ".join(raw_attempts[:3])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recognize")
async def recognize(image: UploadFile = File(...)):
    image_bytes = await image.read()
    decoded = decode_image(image_bytes)
    candidates, raw_text = read_candidates(decoded)

    if not candidates:
        return {"plate": None, "confidence": None, "rawText": raw_text}

    best = max(candidates, key=lambda item: (item["serialConfidence"], item["confidence"]))
    best.pop("serialConfidence", None)
    return best
