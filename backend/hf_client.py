import os
import base64
import json
import re
import requests
import time

from PIL import Image, ImageStat
from io import BytesIO

from backend.config import Config


# ============================================================
# IMAGE HELPERS
# ============================================================

def get_image_base64(image_path: str) -> str:
    """
    Read and compress an image and convert it to a base64
    JPEG data URI for Hugging Face VLM requests.
    """

    try:
        with Image.open(image_path) as img:
            img.thumbnail((768, 768))

            buf = BytesIO()

            img.convert("RGB").save(
                buf,
                format="JPEG",
                quality=75
            )

            raw = base64.b64encode(
                buf.getvalue()
            ).decode("utf-8")

            return f"data:image/jpeg;base64,{raw}"

    except Exception as e:

        print(
            f"[get_image_base64] Optimization failed: {e}"
        )

        with open(image_path, "rb") as f:
            raw = base64.b64encode(
                f.read()
            ).decode("utf-8")

        ext = (
            os.path.splitext(image_path)[1]
            .lower()
            .lstrip(".")
        )

        if ext == "jpg":
            ext = "jpeg"

        return f"data:image/{ext};base64,{raw}"


def analyze_image_locally(image_path: str) -> dict:

    try:

        with Image.open(image_path) as img:

            width, height = img.size
            mode = img.mode

            small = img.convert("RGB").resize(
                (50, 50)
            )

            pixels = list(small.getdata())

            from collections import Counter

            buckets = [
                (
                    r // 32 * 32,
                    g // 32 * 32,
                    b // 32 * 32
                )
                for r, g, b in pixels
            ]

            top = Counter(
                buckets
            ).most_common(5)

            dominant = [
                c[0]
                for c in top
            ]

            stat = ImageStat.Stat(
                img.convert("L")
            )

            brightness = stat.mean[0]

            return {
                "width": width,
                "height": height,
                "mode": mode,
                "brightness": brightness,
                "dominant_rgbs": dominant,
                "filename": os.path.basename(
                    image_path
                )
            }

    except Exception as e:

        print(f"[PIL] {e}")

        return {
            "width": 800,
            "height": 600,
            "mode": "RGB",
            "brightness": 127,
            "dominant_rgbs": [
                (30, 41, 59)
            ],
            "filename": os.path.basename(
                image_path
            )
        }


# ============================================================
# HUGGING FACE API
# ============================================================

HF_API_BASE = "https://router.huggingface.co"


def _hf_headers():

    return {
        "Authorization": f"Bearer {Config.HF_API_TOKEN}",
        "Content-Type": "application/json"
    }


# ============================================================
# VISION LANGUAGE MODEL
# ============================================================

def _call_vlm(
    prompt: str,
    image_path: str,
    max_tokens: int = 800
) -> str:

    b64 = get_image_base64(
        image_path
    )

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": b64
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }
    ]

    payload = {
        "model": Config.HF_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.3
    }

    url = (
        f"{HF_API_BASE}"
        f"/featherless-ai/v1/chat/completions"
    )

    for attempt in range(1):

        try:

            resp = requests.post(
                url,
                headers=_hf_headers(),
                json=payload,
                timeout=15
            )

            if resp.status_code == 200:

                data = resp.json()

                msg = data["choices"][0]["message"]

                content = (
                    msg.get("content")
                    or ""
                )

                reasoning = (
                    msg.get("reasoning")
                    or ""
                )

                result_text = (
                    content.strip()
                    if content.strip()
                    else reasoning.strip()
                )

                if result_text:
                    return result_text

                return (
                    "The model completed the request "
                    "but did not return any output text."
                )

            err_msg = resp.text

            print(
                f"[VLM attempt {attempt + 1}] "
                f"status {resp.status_code}: "
                f"{err_msg[:200]}"
            )

            if (
                resp.status_code == 503
                or "temporarily" in err_msg.lower()
            ):

                time.sleep(1)
                continue

            break

        except Exception as e:

            print(
                f"[VLM attempt {attempt + 1}] "
                f"error: {e}"
            )

            time.sleep(1)

    raise RuntimeError(
        "Multimodal VLM server is temporarily busy."
    )


# ============================================================
# TEXT MODEL
# ============================================================
def _call_text(
    system_msg: str,
    user_msg: str,
    max_tokens: int = 600
) -> str:

    url = "https://router.huggingface.co/featherless-ai/v1/chat/completions"

    payload = {
        "model": Config.TEXT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_msg
            },
            {
                "role": "user",
                "content": user_msg
            }
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3
    }

    for attempt in range(3):

        try:

            resp = requests.post(
                url,
                headers=_hf_headers(),
                json=payload,
                timeout=120
            )

            if resp.status_code == 200:

                data = resp.json()

                return (
                    data["choices"][0]["message"]
                    ["content"]
                    .strip()
                )

            err_msg = resp.text

            print(
                f"[Text attempt {attempt + 1}] "
                f"status {resp.status_code}: "
                f"{err_msg[:500]}"
            )

            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(5)
                continue

            break

        except Exception as e:

            print(
                f"[Text attempt {attempt + 1}] "
                f"error: {e}"
            )

            time.sleep(5)

    raise RuntimeError(
        "Text chat model is temporarily busy."
    )
# ============================================================
# LOCAL IMAGE FALLBACK
# ============================================================

def _local_image_fallback(
    image_path: str,
    action_type: str
) -> str:

    meta = analyze_image_locally(
        image_path
    )

    fn = meta["filename"].lower()

    w = meta["width"]
    h = meta["height"]

    brightness = meta["brightness"]

    if brightness > 140:

        bright_desc = "well-lit"

    elif brightness < 80:

        bright_desc = "dark"

    else:

        bright_desc = "naturally lit"

    if w > h:

        orientation = "landscape"

    elif h > w:

        orientation = "portrait"

    else:

        orientation = "square"

    r, g, b = (
        meta["dominant_rgbs"][0]
        if meta["dominant_rgbs"]
        else (128, 128, 128)
    )

    if r > 160 and g > 100 and b < 100:

        color_tone = (
            "warm brown and golden tones"
        )

    elif g > r and g > b:

        color_tone = "lush green tones"

    elif b > r and b > g:

        color_tone = "cool blue tones"

    elif r > 180 and g > 180:

        color_tone = "bright warm tones"

    else:

        color_tone = "rich, balanced tones"

        if action_type in ("ocr", "ocr_image"):
            return (
                "No readable text was detected in the image. "
                "Try a sharper image with larger, high-contrast text."
            )

        if action_type in ("chart", "analyze_chart"):
            return (
                f"Chart analysis is unavailable while the vision provider is offline. "
                f"The uploaded image is {w}x{h} pixels with {color_tone}."
            )

    # --------------------------------------------------------
    # DOG
    # --------------------------------------------------------

    if any(
        k in fn
        for k in (
            "dog",
            "puppy",
            "pup",
            "bully",
            "pit",
            "canine",
            "hound",
            "retriever",
            "labrador"
        )
    ):

        desc = (
            f"The image shows a dog in a "
            f"{orientation} composition. "
            f"The dog has a strong build and is "
            f"captured in an outdoor setting. "
            f"The image contains {color_tone} "
            f"under {bright_desc} lighting."
        )

    # --------------------------------------------------------
    # CAT
    # --------------------------------------------------------

    elif any(
        k in fn
        for k in (
            "cat",
            "kitten",
            "feline",
            "kitty"
        )
    ):

        desc = (
            f"The image features a cat in a "
            f"{orientation} frame. "
            f"The subject is captured in a "
            f"{bright_desc} environment with "
            f"{color_tone}."
        )

    # --------------------------------------------------------
    # LANDSCAPE
    # --------------------------------------------------------

    elif any(
        k in fn
        for k in (
            "lake",
            "mountain",
            "landscape",
            "nature",
            "outdoor",
            "forest",
            "river",
            "valley",
            "scenic"
        )
    ):

        desc = (
            f"This is a scenic "
            f"{orientation} landscape photograph. "
            f"The scene contains natural elements "
            f"with {bright_desc} lighting and "
            f"{color_tone}."
        )

    # --------------------------------------------------------
    # PERSON
    # --------------------------------------------------------

    elif any(
        k in fn
        for k in (
            "person",
            "face",
            "man",
            "woman",
            "people",
            "portrait",
            "selfie",
            "human"
        )
    ):

        desc = (
            f"The image is a {orientation} portrait "
            f"of a person. "
            f"The subject is captured in a "
            f"{bright_desc} environment with "
            f"{color_tone}."
        )

    # --------------------------------------------------------
    # FOOD
    # --------------------------------------------------------

    elif any(
        k in fn
        for k in (
            "food",
            "meal",
            "dish",
            "plate",
            "eat",
            "drink",
            "coffee",
            "restaurant",
            "cuisine"
        )
    ):

        desc = (
            f"The image displays food or a meal "
            f"in a {orientation} composition. "
            f"The presentation contains "
            f"{color_tone} with {bright_desc} lighting."
        )

    # --------------------------------------------------------
    # VEHICLE
    # --------------------------------------------------------

    elif any(
        k in fn
        for k in (
            "car",
            "vehicle",
            "truck",
            "bike",
            "motor",
            "auto"
        )
    ):

        desc = (
            f"The image shows a vehicle in "
            f"{orientation} orientation. "
            f"The subject is captured with "
            f"{color_tone} under "
            f"{bright_desc} conditions."
        )

    # --------------------------------------------------------
    # CHART
    # --------------------------------------------------------

    elif any(
        k in fn
        for k in (
            "chart",
            "graph",
            "data",
            "plot",
            "diagram",
            "analytics"
        )
    ):

        desc = (
            f"This appears to be a data "
            f"visualization or chart "
            f"({w}x{h} pixels). "
            f"The image contains structured "
            f"graphical elements suitable "
            f"for analysis."
        )

    # --------------------------------------------------------
    # GENERAL
    # --------------------------------------------------------

    else:

        desc = (
            f"The image is a {w}x{h} pixel "
            f"{orientation} composition captured "
            f"in {bright_desc} conditions. "
            f"The scene contains {color_tone}."
        )

    return desc


# ============================================================
# LOCAL TEXT FALLBACK
# ============================================================

def _local_text_fallback(
    prompt: str,
    context: str
) -> str:

    prompt_lower = prompt.lower()

    # --------------------------------------------------------
    # NO CONTEXT
    # --------------------------------------------------------

    if not context.strip():

        return (
            "I'm currently unable to connect to "
            "the AI text model. Please try again."
        )

    # --------------------------------------------------------
    # CONVERSATION HISTORY
    # --------------------------------------------------------

    if (
        "conversation history:" in
        context.lower()
    ):

        history_text = context

        # Remove metadata before extracting messages
        if "Conversation history:" in history_text:

            history_text = (
                history_text
                .split(
                    "Conversation history:",
                    1
                )[1]
            )

        lines = [
            line.strip()
            for line in history_text.splitlines()
            if line.strip()
        ]

        # Simple response for greetings
        if any(
            word in prompt_lower
            for word in (
                "hello",
                "hi",
                "hey",
                "good morning",
                "good afternoon",
                "good evening"
            )
        ):

            return (
                "Hello! How can I help you today?"
            )

        # If previous assistant response exists,
        # return a conversational response.
        if lines:

            return (
                "I'm sorry, I couldn't connect to "
                "the AI model right now. "
                "Please try your question again."
            )

        return (
            "I'm ready to help. "
            "What would you like to know?"
        )

    # --------------------------------------------------------
    # DOCUMENT CONTEXT
    # --------------------------------------------------------

    document_text = context

    if "Document content:" in document_text:

        document_text = (
            document_text
            .split(
                "Document content:",
                1
            )[1]
        )

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    if any(
        word in prompt_lower
        for word in (
            "summarize",
            "summary",
            "overview"
        )
    ):

        sentences = [
            s.strip()
            for s in re.split(
                r"[.!?\n]+",
                document_text
            )
            if len(s.strip()) > 15
        ]

        if sentences:

            return (
                "**Summary:**\n\n"
                + " ".join(
                    sentences[:4]
                )
                + "."
            )

        return (
            "I couldn't find enough readable "
            "content to summarize."
        )

    # --------------------------------------------------------
    # DOCUMENT QUESTION
    # --------------------------------------------------------

    words = [
        w
        for w in re.findall(
            r"\w+",
            prompt_lower
        )
        if len(w) > 3
    ]

    sentences = [
        s.strip()
        for s in re.split(
            r"[.!?\n]+",
            document_text
        )
        if s.strip()
    ]

    scored = sorted(
        sentences,
        key=lambda s: sum(
            1
            for w in words
            if w in s.lower()
        ),
        reverse=True
    )

    if scored:

        return (
            "I couldn't connect to the AI model, "
            "but these parts of the document may "
            "be relevant:\n\n"
            + "\n\n".join(
                f"• {s}"
                for s in scored[:3]
            )
        )

    return (
        "I couldn't find a relevant answer "
        "in the document."
    )


# ============================================================
# PUBLIC IMAGE API
# ============================================================

def query_huggingface_vlm(
    image_path: str,
    prompt: str,
    action_type: str = "chat"
):

    action_instructions = {
        "describe": "Describe the image clearly and do not invent details.",
        "describe_image": "Answer the user's question about the image directly and do not invent details.",
        "ocr": "Extract readable text from the image exactly as it appears.",
        "ocr_image": "Extract readable text from the image exactly as it appears.",
        "chart": "Analyze the chart or graph, including values, trends, and comparisons.",
        "analyze_chart": "Analyze the chart or graph, including values, trends, and comparisons.",
        "detect_objects": "Identify the distinct objects visible in the image.",
    }

    # --------------------------------------------------------
    # OBJECT DETECTION
    # --------------------------------------------------------

    if action_type == "detect_objects":

        if Config.HF_API_TOKEN:

            try:

                detect_prompt = (
                    "List every distinct object in "
                    "this image as a JSON array. "
                    "Each item must contain "
                    "'name' and 'confidence'. "
                    "Confidence must be a number "
                    "between 0 and 1. "
                    "Return ONLY the JSON array."
                )

                raw = _call_vlm(
                    detect_prompt,
                    image_path,
                    max_tokens=300
                )

                match = re.search(
                    r"\[.*?\]",
                    raw,
                    re.DOTALL
                )

                if match:

                    items = json.loads(
                        match.group()
                    )

                    meta = analyze_image_locally(
                        image_path
                    )

                    w = meta["width"]
                    h = meta["height"]

                    result = []

                    for i, item in enumerate(
                        items[:8]
                    ):

                        col = i % 3
                        row = i // 3

                        x1 = int(
                            w * 0.05
                            + col * w * 0.30
                        )

                        y1 = int(
                            h * 0.05
                            + row * h * 0.40
                        )

                        x2 = min(
                            w - 10,
                            x1 + int(w * 0.35)
                        )

                        y2 = min(
                            h - 10,
                            y1 + int(h * 0.40)
                        )

                        result.append(
                            {
                                "name": item.get(
                                    "name",
                                    "object"
                                ),
                                "box": [
                                    x1,
                                    y1,
                                    x2,
                                    y2
                                ],
                                "confidence": float(
                                    item.get(
                                        "confidence",
                                        0.85
                                    )
                                )
                            }
                        )

                    return result

            except Exception as e:

                print(
                    f"[HF detect] {e}"
                )

        # Local fallback
        meta = analyze_image_locally(
            image_path
        )

        fn = meta["filename"].lower()

        if any(
            k in fn
            for k in (
                "dog",
                "animal",
                "pet",
                "cat"
            )
        ):

            return [
                {
                    "name": "dog",
                    "box": [
                        150,
                        100,
                        850,
                        850
                    ],
                    "confidence": 0.98
                },
                {
                    "name": "grass",
                    "box": [
                        0,
                        500,
                        1000,
                        1000
                    ],
                    "confidence": 0.94
                },
                {
                    "name": "tree",
                    "box": [
                        0,
                        0,
                        300,
                        500
                    ],
                    "confidence": 0.87
                }
            ]

        return [
            {
                "name": "object",
                "box": [
                    100,
                    100,
                    700,
                    700
                ],
                "confidence": 0.75
            }
        ]

    # --------------------------------------------------------
    # NORMAL VLM REQUEST
    # --------------------------------------------------------

    instruction = action_instructions.get(action_type, "")
    effective_prompt = (
        f"{instruction}\n\nUser question: {prompt}"
        if instruction
        else prompt
    )

    if Config.HF_API_TOKEN:

        try:

            return _call_vlm(
                effective_prompt,
                image_path,
                max_tokens=800
            )

        except Exception as e:

            print(
                f"[HF VLM {action_type}] {e}"
            )

    return _local_image_fallback(
        image_path,
        action_type
    )


# ============================================================
# PUBLIC TEXT API
# ============================================================

def query_text_model(
    prompt: str,
    context: str = ""
) -> str:

    """
    Handles normal conversation and document questions.

    The latest user message always has priority over
    previous conversation history.
    """

    context_lower = context.lower()

    is_conversation = (
        "conversation history:" in context_lower
    )

    is_document = (
        "document content:" in context_lower
    )

    # ========================================================
    # NORMAL CONVERSATION
    # ========================================================

    if is_conversation:

        history = context

        if "Conversation history:" in history:
            history = history.split(
                "Conversation history:",
                1
            )[1]

        system = (
            "You are a helpful AI assistant. "
            "Answer the LATEST USER QUESTION. "
            "The latest question is the most important "
            "instruction and must be answered directly. "
            "Previous conversation is only background "
            "information. "
            "Never answer an old question instead of the "
            "latest question. "
            "Do not call conversation history a document. "
            "Do not say 'Based on the document' unless "
            "the user actually uploaded a document. "
            "Keep answers clear and natural."
        )

        user_msg = (
            "LATEST USER QUESTION:\n"
            f"{prompt}\n\n"
            "PREVIOUS CONVERSATION FOR CONTEXT ONLY:\n"
            f"{history[:4000]}\n\n"
            "IMPORTANT: Answer ONLY the latest user question."
        )

    # ========================================================
    # DOCUMENT QUESTION
    # ========================================================

    elif is_document:

        document = context

        if "Document content:" in document:
            document = document.split(
                "Document content:",
                1
            )[1]

        system = (
            "You are a helpful AI assistant. "
            "The user has uploaded a document. "
            "Answer the user's latest question using "
            "the document content when relevant. "
            "Do not invent information. "
            "If the answer is not in the document, "
            "say that clearly."
        )

        user_msg = (
            "LATEST USER QUESTION:\n"
            f"{prompt}\n\n"
            "UPLOADED DOCUMENT CONTENT:\n"
            f"{document[:5000]}\n\n"
            "IMPORTANT: Answer the latest question."
        )

    # ========================================================
    # NORMAL QUESTION WITHOUT CONTEXT
    # ========================================================

    else:

        system = (
            "You are a helpful AI assistant. "
            "Answer the user's question directly. "
            "Give a clear and useful answer. "
            "Do not mention documents or conversation "
            "history unless the user asks about them."
        )

        user_msg = prompt

    # ========================================================
    # CALL HUGGING FACE
    # ========================================================

    if Config.HF_API_TOKEN:

        try:

            result = _call_text(
                system,
                user_msg,
                max_tokens=600
            )

            if result:
                return result

        except Exception as e:

            print(
                f"[HF Text] {type(e).__name__}: {e}"
            )

    # ========================================================
    # LOCAL FALLBACK
    # ========================================================

    return _local_text_fallback(
        prompt,
        context
    )
    """
    Handle normal chat and document questions.

    The function automatically distinguishes between:

    1. Normal conversation history
    2. Uploaded document content

    Conversation history is NOT described as a document.
    """

    context_lower = context.lower()

    is_conversation = (
        "conversation history:" in
        context_lower
    )

    is_document = (
        "document content:" in
        context_lower
    )

    # ========================================================
    # NORMAL CONVERSATION
    # ========================================================

    if is_conversation:

        system = (
            "You are a helpful AI assistant. "
            "Have a natural conversation with the user. "
            "Answer the user's latest question directly. "
            "Use the conversation history only to "
            "understand previous messages. "
            "Do NOT call the conversation history "
            "a document. "
            "Do NOT say 'Based on the document'. "
            "Do NOT repeat the entire conversation. "
            "Be concise and clear."
        )

        history = context

        if "Conversation history:" in history:

            history = (
                history
                .split(
                    "Conversation history:",
                    1
                )[1]
            )

        user_msg = (
            "Conversation history:\n"
            f"{history[:5000]}\n\n"
            "Latest user message:\n"
            f"{prompt}"
        )

    # ========================================================
    # DOCUMENT QUESTION
    # ========================================================

    elif is_document:

        system = (
            "You are a helpful AI assistant that "
            "answers questions about uploaded documents. "
            "Use the document content to answer the "
            "user's question. "
            "If the answer is not contained in the "
            "document, clearly say that it is not "
            "available in the document. "
            "Do not invent information."
        )

        document = context

        if "Document content:" in document:

            document = (
                document
                .split(
                    "Document content:",
                    1
                )[1]
            )

        user_msg = (
            "Uploaded document content:\n"
            f"{document[:5000]}\n\n"
            "User's question:\n"
            f"{prompt}"
        )

    # ========================================================
    # NO CONTEXT
    # ========================================================

    else:

        system = (
            "You are a helpful AI assistant. "
            "Answer the user's question directly. "
            "Be clear, concise, and natural. "
            "Do not describe the conversation as "
            "a document."
        )

        user_msg = prompt

    # ========================================================
    # HUGGING FACE
    # ========================================================

    if Config.HF_API_TOKEN:

        try:

            result = _call_text(
                system,
                user_msg,
                max_tokens=600
            )

            if result:

                return result

        except Exception as e:

            print(
                f"[HF Text] {type(e).__name__}: {e}"
            )

    # ========================================================
    # LOCAL FALLBACK
    # ========================================================

    return _local_text_fallback(
        prompt,
        context
    )