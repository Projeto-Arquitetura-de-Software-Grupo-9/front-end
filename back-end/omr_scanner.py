#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Geração e Correção de Provas (SGP Católica SC / Correge)
Motor Real em Python + OpenCV para Leitura de QR Code e Reconhecimento Óptico de Marcações (OMR).
Sem dados simulados: retorna exclusivamente o que foi detectado opticamente na imagem da câmera.
"""

import sys
import json
import base64
import re
from typing import Dict, Any, Optional, Tuple, List

import cv2
import numpy as np

LETTERS = ["A", "B", "C", "D", "E"]


def decode_base64_image(image_base64: str) -> Optional[np.ndarray]:
    """Converte uma string Base64 (Data URL ou pura) em matriz OpenCV (BGR)."""
    if not image_base64:
        return None
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None


def parse_qr_payload(raw_text: str) -> Dict[str, Any]:
    """
    Interpreta o payload real do QR Code impresso na prova ou cartão-resposta.
    """
    raw_text = (raw_text or "").strip()
    if not raw_text:
        return {}

    try:
        parsed = json.loads(raw_text)
        if isinstance(parsed, dict):
            key_str = str(parsed.get("k") or "").upper().strip()
            embedded_key: Dict[str, str] = {}
            for idx, ch in enumerate(key_str):
                if ch in LETTERS:
                    embedded_key[str(idx + 1)] = ch

            return {
                "raw": raw_text,
                "app": parsed.get("app", "CORREGE"),
                "examCode": parsed.get("code") or parsed.get("exam"),
                "versionLetter": (parsed.get("ver") or parsed.get("vId") or "A")
                .upper()
                .replace("VER-", ""),
                "nominal": bool(parsed.get("nominal", True)),
                "studentRegistration": parsed.get("std") or parsed.get("registration"),
                "totalQuestions": int(parsed.get("q") or len(embedded_key) or 0),
                "embeddedAnswerKey": embedded_key,
            }
    except Exception:
        pass

    ver_match = re.search(r"V=([A-Z])", raw_text, re.IGNORECASE)
    if ver_match:
        return {
            "raw": raw_text,
            "app": "CORREGE",
            "versionLetter": ver_match.group(1).upper(),
            "nominal": True,
        }

    return {"raw": raw_text}


def detect_qr_code(img: np.ndarray) -> Tuple[Optional[str], Dict[str, Any]]:
    """
    Detecta e decodifica o QR Code na imagem capturada pela câmera usando OpenCV.
    Retorna (None, {}) caso nenhum QR Code real esteja visível no quadro.
    """
    detector = cv2.QRCodeDetector()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    candidates = [
        gray,
        enhanced,
        otsu,
        img,
        cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 51, 10
        ),
    ]

    h, w = gray.shape[:2]
    if h > 200 and w > 200:
        # Região superior direita (posição do QR Code no cabeçalho A4)
        top_right = gray[0 : int(h * 0.55), int(w * 0.35) : w]
        candidates.insert(1, top_right)
        candidates.append(
            cv2.resize(top_right, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_CUBIC)
        )
        candidates.append(
            cv2.resize(gray, None, fx=0.6, fy=0.6, interpolation=cv2.INTER_AREA)
        )

    for candidate in candidates:
        try:
            data, _, _ = detector.detectAndDecode(candidate)
            if data and data.strip():
                clean = data.strip()
                return clean, parse_qr_payload(clean)
        except Exception:
            continue

    return None, {}


def order_corner_points(pts: np.ndarray) -> np.ndarray:
    """Ordena 4 pontos: [top-left, top-right, bottom-right, bottom-left]."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def warp_sheet_perspective(img: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    Procura o contorno quadrilátero da folha A4 na imagem da câmera e aplica
    transformação de perspectiva (1000x1414).
    """
    target_w, target_h = 1000, 1414
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)

    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    img_area = img.shape[0] * img.shape[1]

    for c in contours:
        area = cv2.contourArea(c)
        if area < img_area * 0.35:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            pts = approx.reshape(4, 2).astype("float32")
            rect = order_corner_points(pts)
            dst = np.array(
                [
                    [0, 0],
                    [target_w - 1, 0],
                    [target_w - 1, target_h - 1],
                    [0, target_h - 1],
                ],
                dtype="float32",
            )
            M = cv2.getPerspectiveTransform(rect, dst)
            return cv2.warpPerspective(img, M, (target_w, target_h)), True

    return cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA), False


def detect_bubbles_via_contours(
    img: np.ndarray, total_questions: int
) -> Tuple[Dict[int, str], List[float]]:
    """
    Procura contornos circulares de alternativas (A, B, C, D, E) na imagem via OpenCV.
    Agrupa as bolhas por linha/coluna e mede a densidade real de tinta dentro de cada círculo.
    Retorna apenas as questões onde uma bolha realmente foi preenchida acima do limiar óptico.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 9
    )

    contours, _ = cv2.findContours(
        thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    bubble_candidates = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w < 14 or w > 65 or h < 14 or h > 65:
            continue
        aspect = w / float(h)
        if aspect < 0.72 or aspect > 1.38:
            continue
        area = cv2.contourArea(c)
        peri = cv2.arcLength(c, True)
        if peri == 0:
            continue
        circularity = 4 * np.pi * (area / (peri * peri))
        if circularity < 0.45:
            continue
        bubble_candidates.append((x, y, w, h, c))

    if len(bubble_candidates) < 5:
        return {}, []

    # Ordena de cima para baixo
    bubble_candidates.sort(key=lambda b: b[1])

    # Agrupa candidatos que estão na mesma faixa horizontal (mesmo Y aproximado)
    rows: List[List[Tuple[int, int, int, int, Any]]] = []
    for b in bubble_candidates:
        placed = False
        for row in rows:
            avg_y = sum(item[1] for item in row) / len(row)
            avg_h = sum(item[3] for item in row) / len(row)
            if abs(b[1] - avg_y) <= max(12, avg_h * 0.65):
                row.append(b)
                placed = True
                break
        if not placed:
            rows.append([b])

    # Extrai grupos horizontais de 5 bolhas (A, B, C, D, E)
    question_groups: List[Tuple[int, float, List[Tuple[int, int, int, int, Any]]]] = []
    img_w = img.shape[1]

    for row in rows:
        row.sort(key=lambda b: b[0])
        if len(row) == 5:
            col_idx = 0 if row[0][0] < img_w * 0.5 else 1
            avg_y = sum(item[1] for item in row) / 5.0
            question_groups.append((col_idx, avg_y, row))
        elif len(row) == 10:
            left_group = row[:5]
            right_group = row[5:10]
            avg_y_l = sum(item[1] for item in left_group) / 5.0
            avg_y_r = sum(item[1] for item in right_group) / 5.0
            question_groups.append((0, avg_y_l, left_group))
            question_groups.append((1, avg_y_r, right_group))

    # Ordena primeiro pela coluna (esquerda=0, direita=1) e depois de cima para baixo (Y)
    question_groups.sort(key=lambda g: (g[0], g[1]))

    detected: Dict[int, str] = {}
    confidences: List[float] = []

    for q_idx, (_, _, group) in enumerate(question_groups[:total_questions]):
        q_num = q_idx + 1
        scores: List[Tuple[str, float]] = []

        for l_idx, (x, y, w, h, _) in enumerate(group):
            if l_idx >= len(LETTERS):
                break
            letter = LETTERS[l_idx]
            roi = thresh[y : y + h, x : x + w]
            if roi.size == 0:
                scores.append((letter, 0.0))
                continue
            mask = np.zeros(roi.shape, dtype="uint8")
            cv2.circle(mask, (w // 2, h // 2), max(4, min(w, h) // 2 - 2), 255, -1)
            masked = cv2.bitwise_and(roi, roi, mask=mask)
            fill_ratio = cv2.countNonZero(masked) / float(max(1, cv2.countNonZero(mask)))
            scores.append((letter, fill_ratio))

        scores.sort(key=lambda s: s[1], reverse=True)
        if len(scores) >= 2:
            best_letter, best_score = scores[0]
            second_score = scores[1][1]
            contrast = best_score - second_score
            # Exige preenchimento real de tinta (mínimo 30% de área escura e contraste claro)
            if best_score >= 0.30 and contrast >= 0.08:
                detected[q_num] = best_letter
                confidences.append(min(0.99, 0.70 + contrast))

    return detected, confidences


def detect_omr_bubbles(
    warped_img: np.ndarray, total_questions: int = 10
) -> Tuple[Dict[int, str], float]:
    """
    Executa busca óptica real pelas respostas marcadas na folha:
    1) Primeiro via detecção de contornos circulares (funciona em fotos diretas de provas/gabaritos).
    2) Complementa com leitura na grade A4 alinhada, exigindo limiar estrito de tinta (> 30% preenchido)
       para jamais inventar respostas em questões em branco.
    """
    contour_answers, contour_confs = detect_bubbles_via_contours(
        warped_img, total_questions
    )

    gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 35, 11
    )

    h, w = thresh.shape[:2]
    grid_top = int(h * 0.35)
    grid_bottom = int(h * 0.85)
    grid_left = int(w * 0.08)
    grid_right = int(w * 0.92)

    num_cols = 2 if total_questions <= 40 else (3 if total_questions <= 75 else 4)
    per_col = int(np.ceil(total_questions / num_cols))
    col_width = (grid_right - grid_left) / num_cols

    answers: Dict[int, str] = dict(contour_answers)
    confidences: List[float] = list(contour_confs)

    for q_idx in range(total_questions):
        q_num = q_idx + 1
        if q_num in answers:
            continue

        col = q_idx // per_col
        row = q_idx % per_col
        usable_h = max(120, min(grid_bottom - grid_top, per_col * 42))
        row_h = usable_h / max(1, per_col)
        cy = int(grid_top + (row + 0.65) * row_h)

        col_x_start = grid_left + col * col_width
        bubbles_start_x = col_x_start + col_width * 0.18
        bubbles_end_x = col_x_start + col_width * 0.86
        step_x = (bubbles_end_x - bubbles_start_x) / 4.0

        fill_scores: List[Tuple[str, float]] = []
        radius = max(8, int(min(row_h * 0.32, step_x * 0.34)))

        for l_idx, letter in enumerate(LETTERS):
            cx = int(bubbles_start_x + l_idx * step_x)
            y1, y2 = max(0, cy - radius), min(h, cy + radius)
            x1, x2 = max(0, cx - radius), min(w, cx + radius)

            roi = thresh[y1:y2, x1:x2]
            if roi.size == 0:
                fill_scores.append((letter, 0.0))
                continue

            mask = np.zeros(roi.shape, dtype="uint8")
            cv2.circle(
                mask,
                (roi.shape[1] // 2, roi.shape[0] // 2),
                radius,
                255,
                -1,
            )
            masked = cv2.bitwise_and(roi, roi, mask=mask)
            total_pixels = max(1, cv2.countNonZero(mask))
            filled_pixels = cv2.countNonZero(masked)
            ratio = filled_pixels / float(total_pixels)
            fill_scores.append((letter, ratio))

        fill_scores.sort(key=lambda x: x[1], reverse=True)
        best_letter, best_score = fill_scores[0]
        second_score = fill_scores[1][1] if len(fill_scores) > 1 else 0.0
        contrast = best_score - second_score

        # Somente registra resposta se realmente houver bolha preenchida acima do limiar óptico
        if best_score >= 0.30 and contrast >= 0.08:
            answers[q_num] = best_letter
            confidences.append(min(0.99, 0.70 + contrast))

    avg_confidence = float(np.mean(confidences)) * 100.0 if confidences else 0.0
    return answers, round(avg_confidence, 1)


def grade_exam(
    marked_answers: Dict[Any, str],
    official_answer_key: Dict[Any, str],
    total_questions: int = 10,
    max_score: float = 10.0,
) -> Dict[str, Any]:
    """
    Corrige a prova confrontando estritamente as respostas detectadas com o gabarito oficial.
    Questões não marcadas permanecem como None (0 pontos).
    """
    norm_marked: Dict[int, str] = {}
    for k, v in (marked_answers or {}).items():
        if v is None or str(v).strip() == "":
            continue
        try:
            norm_marked[int(k)] = str(v).upper().strip()
        except Exception:
            pass

    norm_key: Dict[int, str] = {}
    for k, v in (official_answer_key or {}).items():
        if v is None or str(v).strip() == "":
            continue
        try:
            norm_key[int(k)] = str(v).upper().strip()
        except Exception:
            pass

    total_q = max(1, int(total_questions or len(norm_key) or 10))
    points_per_question = float(max_score) / total_q
    correct_count = 0
    details = []

    for q_num in range(1, total_q + 1):
        chosen = norm_marked.get(q_num, None)
        correct = norm_key.get(q_num, "A")
        is_correct = bool(chosen is not None and chosen == correct)
        if is_correct:
            correct_count += 1

        details.append(
            {
                "questionNumber": q_num,
                "questionId": f"q-{q_num}",
                "chosen": chosen,
                "correct": correct,
                "isCorrect": is_correct,
                "score": round(points_per_question, 2) if is_correct else 0.0,
            }
        )

    total_score = round((correct_count / total_q) * float(max_score), 1)

    return {
        "correctCount": correct_count,
        "totalQuestions": total_q,
        "totalScore": total_score,
        "maxScore": float(max_score),
        "details": details,
    }


def process_omr_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processa requisições reais vindas da API:
      - action == "scan": Decodifica QR Code via OpenCV + procura marcações reais nas bolhas.
      - action == "grade": Corrige as respostas contra o gabarito oficial.
    """
    action = payload.get("action", "scan")
    total_questions = int(payload.get("totalQuestions") or 10)
    max_score = float(payload.get("maxScore") or 10.0)
    official_key = payload.get("officialAnswerKey") or {}
    version_letter = str(payload.get("versionLetter") or "A").upper()

    if action == "grade":
        marked = payload.get("markedAnswers") or {}
        grading = grade_exam(marked, official_key, total_questions, max_score)
        return {
            "success": True,
            "engine": "python-opencv-omr",
            "versionLetter": version_letter,
            "markedAnswers": {
                str(d["questionNumber"]): d["chosen"]
                for d in grading["details"]
                if d["chosen"] is not None
            },
            "grading": grading,
        }

    # Action: "scan"
    image_b64 = payload.get("imageBase64", "")
    img = decode_base64_image(image_b64)

    if img is None:
        return {
            "success": False,
            "error": "Imagem inválida ou não fornecida para leitura.",
        }

    # 1. Decodifica o QR Code na imagem da câmera
    qr_raw, qr_info = detect_qr_code(img)
    detected_version = qr_info.get("versionLetter") or version_letter
    if qr_info.get("totalQuestions"):
        total_questions = int(qr_info["totalQuestions"])

    # Se o QR Code trouxe o gabarito embutido ("k"), usa como referência caso não tenha sido enviado
    if qr_info.get("embeddedAnswerKey") and not official_key:
        official_key = qr_info["embeddedAnswerKey"]

    # 2. Alinha a folha e procura as bolhas realmente marcadas à caneta
    warped, page_aligned = warp_sheet_perspective(img)
    detected_answers, confidence = detect_omr_bubbles(warped, total_questions)

    # 3. Calcula o resultado com base apenas nas respostas realmente encontradas
    grading = grade_exam(detected_answers, official_key, total_questions, max_score)

    return {
        "success": True,
        "engine": "python-opencv-omr",
        "qrDetected": bool(qr_raw),
        "qrRaw": qr_raw,
        "qrData": qr_info,
        "pageAligned": page_aligned,
        "versionLetter": detected_version,
        "confidence": confidence,
        "markedAnswers": {str(k): v for k, v in detected_answers.items()},
        "grading": grading,
    }


if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input) if raw_input.strip() else {}
        result = process_omr_request(data)
        sys.stdout.write(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        sys.stdout.write(
            json.dumps(
                {
                    "success": False,
                    "error": f"Erro no motor OMR Python: {str(exc)}",
                },
                ensure_ascii=False,
            )
        )
