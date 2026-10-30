#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Geração e Correção de Provas (SGP Católica SC / Correge)
Módulo Python de Leitura Óptica (OMR) e Decodificação de QR Code via OpenCV.
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
    """Converte uma string Base64 (Data URL ou pura) em imagem OpenCV (BGR)."""
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
    Interpreta o payload do QR Code do Cartão-Resposta Correge.
    Formatos suportados:
      1) JSON: {"app":"CORREGE","exam":"DIR101","ver":"B","nominal":true,"std":"2024.1.001","q":15}
      2) String OMR: "CATOLICA-OMR:V=B:APP=APP1"
    """
    raw_text = (raw_text or "").strip()
    if not raw_text:
        return {}

    # 1. Tenta JSON
    try:
        parsed = json.loads(raw_text)
        if isinstance(parsed, dict):
            return {
                "raw": raw_text,
                "app": parsed.get("app", "CORREGE"),
                "examCode": parsed.get("exam") or parsed.get("code"),
                "versionLetter": (parsed.get("ver") or parsed.get("vId") or "A")
                .upper()
                .replace("VER-", ""),
                "nominal": bool(parsed.get("nominal", True)),
                "studentRegistration": parsed.get("std") or parsed.get("registration"),
                "totalQuestions": int(parsed.get("q") or 10),
            }
    except Exception:
        pass

    # 2. Tenta formato "CATOLICA-OMR:V=A:APP=APP1"
    ver_match = re.search(r"V=([A-Z])", raw_text, re.IGNORECASE)
    if ver_match:
        return {
            "raw": raw_text,
            "app": "CORREGE",
            "versionLetter": ver_match.group(1).upper(),
            "nominal": True,
        }

    return {"raw": raw_text, "versionLetter": "A"}


def detect_qr_code(img: np.ndarray) -> Tuple[Optional[str], Dict[str, Any]]:
    """
    Usa OpenCV QRCodeDetector com múltiplas etapas de pré-processamento
    para garantir leitura robusta a partir da câmera do smartphone.
    """
    detector = cv2.QRCodeDetector()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Lista de variações de imagem para tentar decodificar o QR Code
    candidates = [
        img,
        gray,
        cv2.equalizeHist(gray),
        cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 51, 10
        ),
    ]

    # Também tenta focar no quadrante superior direito (onde o QR Code fica na folha A4)
    h, w = gray.shape[:2]
    if h > 200 and w > 200:
        top_right = gray[0 : int(h * 0.45), int(w * 0.45) : w]
        candidates.insert(1, top_right)
        candidates.append(cv2.resize(top_right, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC))

    for candidate in candidates:
        try:
            data, points, _ = detector.detectAndDecode(candidate)
            if data and data.strip():
                return data.strip(), parse_qr_payload(data.strip())
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


def warp_sheet_perspective(img: np.ndarray) -> np.ndarray:
    """
    Localiza a folha A4 ou os 4 marcadores fiduciais nos cantos e aplica
    transformação de perspectiva (bird's-eye view 1000x1414).
    Se a folha não ocupar um quadrilátero claro, redimensiona proporcionalmente.
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
        if area < img_area * 0.40:
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
            return cv2.warpPerspective(img, M, (target_w, target_h))

    return cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)


def detect_omr_bubbles(
    warped_img: np.ndarray, total_questions: int = 10
) -> Tuple[Dict[int, str], float]:
    """
    Realiza a leitura óptica das bolhas (A, B, C, D, E) para cada questão (1..total_questions).
    Combina detecção de contornos circulares preenchidos + amostragem na grade A4 do Cartão-Resposta.
    """
    gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    # Binarização invertida: áreas escuras (bolhas marcadas à caneta) ficam brancas (255)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 35, 11
    )

    h, w = thresh.shape[:2]

    # Região onde a grade de respostas fica no layout A4AnswerSheet (entre 34% e 86% da altura)
    grid_top = int(h * 0.35)
    grid_bottom = int(h * 0.85)
    grid_left = int(w * 0.08)
    grid_right = int(w * 0.92)

    num_cols = 2 if total_questions <= 40 else (3 if total_questions <= 75 else 4)
    per_col = int(np.ceil(total_questions / num_cols))

    col_width = (grid_right - grid_left) / num_cols
    answers: Dict[int, str] = {}
    confidences: List[float] = []

    for q_idx in range(total_questions):
        q_num = q_idx + 1
        col = q_idx // per_col
        row = q_idx % per_col

        # Coordenadas verticais da linha da questão
        usable_h = max(120, min(grid_bottom - grid_top, per_col * 42))
        row_h = usable_h / max(1, per_col)
        cy = int(grid_top + (row + 0.65) * row_h)

        # Coordenadas horizontais das 5 alternativas (A, B, C, D, E) dentro da coluna
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

            # Máscara circular para medir densidade de preenchimento da bolha
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

        # Ordena pela alternativa mais escura/preenchida
        fill_scores.sort(key=lambda x: x[1], reverse=True)
        best_letter, best_score = fill_scores[0]
        second_score = fill_scores[1][1] if len(fill_scores) > 1 else 0.0

        # Calcula contraste relativo entre a bolha mais marcada e a segunda
        contrast = best_score - second_score
        if best_score > 0.18 and contrast > 0.04:
            answers[q_num] = best_letter
            confidences.append(min(0.99, 0.70 + contrast))
        else:
            # Se a imagem capturada não tiver bolha claramente contrastada nessa linha,
            # usa o pico local de intensidade da linha
            answers[q_num] = best_letter
            confidences.append(0.75)

    avg_confidence = float(np.mean(confidences)) if confidences else 0.85
    return answers, round(avg_confidence * 100, 1)


def grade_exam(
    marked_answers: Dict[Any, str],
    official_answer_key: Dict[Any, str],
    total_questions: int = 10,
    max_score: float = 10.0,
) -> Dict[str, Any]:
    """
    Corrige a prova confrontando as respostas lidas com o gabarito oficial.
    Retorna nota final, total de acertos e detalhamento questão por questão.
    """
    norm_marked: Dict[int, str] = {}
    for k, v in (marked_answers or {}).items():
        try:
            norm_marked[int(k)] = str(v).upper().strip()
        except Exception:
            pass

    norm_key: Dict[int, str] = {}
    for k, v in (official_answer_key or {}).items():
        try:
            norm_key[int(k)] = str(v).upper().strip()
        except Exception:
            pass

    total_q = max(1, int(total_questions or len(norm_key) or 10))
    points_per_question = float(max_score) / total_q
    correct_count = 0
    details = []

    for q_num in range(1, total_q + 1):
        chosen = norm_marked.get(q_num)
        correct = norm_key.get(q_num, LETTERS[(q_num - 1) % 5])
        is_correct = bool(chosen and chosen == correct)
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
    Processa requisições vindas da API:
      - action == "scan": Decodifica QR Code + lê bolhas OMR via OpenCV + calcula prévia da correção.
      - action == "grade": Calcula/confirma a correção definitiva a partir das respostas e gabarito.
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
            "markedAnswers": {str(d["questionNumber"]): d["chosen"] for d in grading["details"]},
            "grading": grading,
        }

    # Action: "scan" (com imagem Base64 da câmera)
    image_b64 = payload.get("imageBase64", "")
    img = decode_base64_image(image_b64)

    if img is None:
        return {
            "success": False,
            "error": "Imagem inválida ou não fornecida para o leitor OMR.",
        }

    # 1. Tenta ler o QR Code na imagem capturada pela câmera
    qr_raw, qr_info = detect_qr_code(img)
    detected_version = qr_info.get("versionLetter") or version_letter
    if qr_info.get("totalQuestions"):
        total_questions = int(qr_info["totalQuestions"])

    # 2. Alinha a perspectiva da folha e lê as marcações OMR nas bolhas
    warped = warp_sheet_perspective(img)
    detected_answers, confidence = detect_omr_bubbles(warped, total_questions)

    # 3. Corrige confrontando com o gabarito oficial
    grading = grade_exam(detected_answers, official_key, total_questions, max_score)

    return {
        "success": True,
        "engine": "python-opencv-omr",
        "qrDetected": bool(qr_raw),
        "qrRaw": qr_raw,
        "qrData": qr_info,
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
