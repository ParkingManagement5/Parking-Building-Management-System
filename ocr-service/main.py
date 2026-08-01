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
# Cho phep 1 dau "-"/"." lac giua chu va so cua series (vd "H-7" thay vi "H7")
# - OCR/deskew doi khi doc nham 1 khe/vet xuoc nho tren bien that giua 2 ky tu
# nay thanh dau gach ngang, khien series bi hieu nham chi la "H" (1 chu), day
# ca chu so "7" xuong nhap vao serial (vd "99-H7 7060" bi doc thanh "99H-77060"
# -> ra ket qua sai "99H-770.60" thay vi dung phai la "99-H7-7060"). Series duoc
# lam sach lai (bo dau) o normalize_plate truoc khi dung.
SERIES_PATTERN = r"(?:[A-Z][-.]?\d|[A-Z]{1,2})"
PLATE_PATTERN = re.compile(
    rf"(?<![A-Z0-9])(\d{{2}})[-.]?({SERIES_PATTERN})[-.]?(\d{{4}}|\d{{5}}|\d{{3}}[.]\d{{2}})(?![A-Z0-9])"
)
# Bien 1 hang (oto: chu series don, vd "A", serial 5 so - "18A-123.45") va bien
# 2 hang (xe may: chu+so, vd "H7", serial 4 so) co the CUNG chiu dai ky tu
# (vd "18A12345" 8 ky tu co the la oto "18-A-12345" HOAC xe may "18-A1-2345"),
# regex don khong the tu phan biet chac chan — PLATE_PATTERN (chu+so truoc)
# dung khi khong biet hinh dang bien; 2 pattern rieng duoi day dung khi da biet
# ti le khung bien that (xem is_single_line trong crop_likely_plate) de uu
# tien dung huong ngay tu dau, thay vi doan mu.
CAR_SERIES_PATTERN = re.compile(
    r"(?<![A-Z0-9])(\d{2})[-.]?([A-Z]{1,2})[-.]?(\d{4}|\d{5}|\d{3}[.]\d{2})(?![A-Z0-9])"
)
MOTORBIKE_SERIES_PATTERN = re.compile(
    r"(?<![A-Z0-9])(\d{2})[-.]?([A-Z][-.]?\d)[-.]?(\d{4}|\d{5}|\d{3}[.]\d{2})(?![A-Z0-9])"
)


@lru_cache(maxsize=1)
def get_reader():
    return easyocr.Reader(["en"], gpu=False)


@app.on_event("startup")
def warm_easyocr():
    get_reader()


def normalize_plate(text: str | None, prefer_single_line: bool | None = None) -> str | None:
    if not text:
        return None

    compact = (
        text.upper()
        .replace(" ", "")
        .replace("I", "1")
        .replace("O", "0")
    )
    compact = re.sub(r"[^A-Z0-9.-]", "", compact)

    # Da biet ti le khung bien that (tu anh) thi thu dung huong truoc (oto: chu
    # series don + serial 5 so; xe may: chu+so + serial 4 so) - chi roi ve
    # PLATE_PATTERN chung (uu tien chu+so mac dinh) khi khong ro hinh dang bien.
    if prefer_single_line is True:
        patterns = (CAR_SERIES_PATTERN, MOTORBIKE_SERIES_PATTERN)
    elif prefer_single_line is False:
        patterns = (MOTORBIKE_SERIES_PATTERN, CAR_SERIES_PATTERN)
    else:
        patterns = (PLATE_PATTERN,)

    for pattern in patterns:
        for province, series, serial in pattern.findall(compact):
            series = series.replace("-", "").replace(".", "")
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


def _plate_rect_candidates(mask, image_area):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        # Anh chup nguyen xe (khong phai anh crop san bien so) thi bien so
        # chi chiem mot phan rat nho khung hinh (~1-3%), nguong 4% truoc day
        # loai bo luon vung bien so that, khien ham nay tra ve ca anh goc
        # (xe + cay + troi) thay vi crop dung vao bien so.
        if area < image_area * 0.006:
            continue
        ratio = w / max(h, 1)
        # Bien oto 1 hang dai (~3:1-5:1) nhung bien xe may 2 hang (tinh +
        # ky hieu tren, so seri duoi) gan vuong (~0.9:1-1.3:1) - can nguong
        # duoi thap hon de khong loai nham ngay tu buoc phat hien vung.
        if 0.85 <= ratio <= 6.5:
            candidates.append((area, x, y, w, h, contour))
    return candidates


def _deskew_angle(contour) -> float:
    # Camera cong co dinh chup xe di qua o goc cheo la nguyen nhan pho bien
    # gay doc sai — minAreaRect cho goc nghieng thuc te cua bien so (khac
    # boundingRect luon truc dung), dung de xoay lai truoc khi doc.
    angle = cv2.minAreaRect(contour)[-1]
    if angle < -45:
        angle += 90
    elif angle > 45:
        angle -= 90
    return angle


def _rotate(image, angle: float):
    if abs(angle) < 1.5:
        return image
    h, w = image.shape[:2]
    matrix = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(image, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def crop_likely_plate(image):
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    image_area = image.shape[0] * image.shape[1]

    white_mask = cv2.inRange(hsv, np.array([0, 0, 145]), np.array([180, 90, 255]))
    candidates = _plate_rect_candidates(white_mask, image_area)

    if not candidates:
        # Fallback rieng cho bien mau (vang: xe kinh doanh van tai, xanh
        # duong: co quan nha nuoc, do: quan doi/ngoai giao) - CHI thu khi
        # khong tim duoc bien trang, khong gop chung mask voi trang. Da thu
        # gop chung 1 mask/candidate pool nhung mau mo rong lam lo ra vung
        # lon hon (vd vien crom sang bong tren luoi tan nhiet) thang the
        # ung vien bien so that theo tieu chi "dien tich lon nhat", gay
        # regression tren anh xe mau xanh la - nen tach rieng thanh fallback.
        yellow = cv2.inRange(hsv, np.array([15, 60, 120]), np.array([35, 255, 255]))
        blue = cv2.inRange(hsv, np.array([95, 60, 60]), np.array([130, 255, 255]))
        red = cv2.inRange(hsv, np.array([0, 70, 70]), np.array([10, 255, 255])) | \
            cv2.inRange(hsv, np.array([170, 70, 70]), np.array([180, 255, 255]))
        # Bien xe dien (nen xanh la, VN ap dung tu 2022) - tach rieng khoi cac
        # mau con lai vi ly do tuong tu: gop chung mask de bi nhieu vung xanh
        # la khac (cay, bien bao) lan at ung vien bien so that.
        green = cv2.inRange(hsv, np.array([35, 60, 60]), np.array([85, 255, 255]))
        candidates = _plate_rect_candidates(yellow | blue | red | green, image_area)

    if not candidates:
        return image, None

    _, x, y, w, h, contour = max(candidates, key=lambda item: item[0])
    # Ti le khung phat hien duoc: bien oto 1 hang dai (~3:1-5:1) svs bien xe may
    # 2 hang gan vuong (~0.9:1-1.3:1) - khoang cach 2 nhom nay rat xa nhau (1.3
    # den 3.0 khong nhom nao roi vao) nen nguong 2.0 an toan de phan biet, dung
    # lam goi y uu tien pattern doc series trong normalize_plate (xem
    # CAR_SERIES_PATTERN/MOTORBIKE_SERIES_PATTERN).
    is_single_line = (w / max(h, 1)) >= 2.0
    # Pad rong hon truoc day (0.04 -> 0.08) de xoay deskew khong bi cat mat
    # canh bien so.
    pad = int(max(w, h) * 0.08)
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(image.shape[1], x + w + pad)
    y2 = min(image.shape[0], y + h + pad)
    cropped = image[y1:y2, x1:x2]
    return _rotate(cropped, _deskew_angle(contour)), is_single_line


def preprocess_variants(plate) -> Iterable[np.ndarray]:
    # Nhan anh DA CROP san (tu crop_likely_plate) - chi lo phan resize/tang
    # cuong do, tach rieng khoi buoc crop de crop_likely_plate co the tra ve
    # them is_single_line ma khong bi vuong xung dot yield/return cua generator.
    if plate.shape[1] > 900:
        ratio = 900 / plate.shape[1]
        plate = cv2.resize(plate, None, fx=ratio, fy=ratio, interpolation=cv2.INTER_AREA)
    elif plate.shape[1] < 400:
        # Crop nho (bien so chi la 1 phan nho cua anh chup nguyen xe) can
        # phong to truoc khi doc lan dau, khong doi den bien the enlarged
        # (variant 2) moi phong to — vay se doc dung ngay tu lan dau, nhanh hon.
        ratio = 400 / max(plate.shape[1], 1)
        plate = cv2.resize(plate, None, fx=ratio, fy=ratio, interpolation=cv2.INTER_CUBIC)

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


EARLY_STOP_CONFIDENCE = 0.9


def read_candidates(image):
    reader = get_reader()
    candidates = []
    raw_attempts = []

    plate_crop, is_single_line = crop_likely_plate(image)
    variants = list(preprocess_variants(plate_crop))
    read_modes = [{}]

    for mode_index, kwargs in enumerate(read_modes):
        for variant in variants:
            results = reader.readtext(variant, detail=1, paragraph=False, **kwargs)
            raw_text = ordered_text(results)
            if raw_text:
                raw_attempts.append(raw_text)
            plate = normalize_plate(raw_text, prefer_single_line=is_single_line)
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
                # Anh ro net da doc dung ngay tu bien the dau — bo qua cac bien
                # the con lai (CLAHE/otsu) de tranh goi EasyOCR thua, do la nguyen
                # nhan chinh khien /recognize cham (~2s x 3 bien the = ~6s).
                if candidate["confidence"] >= EARLY_STOP_CONFIDENCE:
                    break

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
                plate = normalize_plate(raw_text, prefer_single_line=is_single_line)
                confidences = [float(conf) for _, _, conf in results]
                confidence = sum(confidences) / len(confidences) if confidences else 0.0
                found_confident = False
                if plate:
                    candidate = {
                        "plate": plate,
                        "confidence": min(confidence + 0.10, 1.0),
                        "rawText": raw_text,
                        "serialConfidence": serial_confidence(results),
                    }
                    candidates.append(candidate)
                    found_confident = candidate["confidence"] >= EARLY_STOP_CONFIDENCE
                if found_confident:
                    break
            if candidates:
                break

    return candidates, " ".join(raw_attempts[:3])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recognize")
def recognize(image: UploadFile = File(...)):
    # Khong dung "async def" o day: than ham chay CPU nang (EasyOCR/OpenCV)
    # dong bo, khong co await nao ben trong - neu khai bao async, no chay
    # thang tren event loop chinh va chan dung MOI request khac (ke ca
    # /health hay mot luot scan khac) cho toi khi xong, khien request den
    # sau co ve "treo vinh vien" du server van song. Dung "def" thuong de
    # FastAPI/Starlette tu dua vao threadpool rieng, khong chan event loop.
    image_bytes = image.file.read()
    decoded = decode_image(image_bytes)
    candidates, raw_text = read_candidates(decoded)

    if not candidates:
        return {"plate": None, "confidence": None, "rawText": raw_text}

    best = max(candidates, key=lambda item: (item["serialConfidence"], item["confidence"]))
    best.pop("serialConfidence", None)
    return best
