"""
OCR Text Extraction Model
=========================
Extracts text from scanned PDFs and images using Tesseract OCR.

Supports:
    - Scanned PDF files (single or multi-page)
    - Image files: PNG, JPG, JPEG, TIFF, BMP
    - Batch processing of multiple files
    - Output to console, .txt, or .json

Requirements:
    pip install pytesseract Pillow pdf2image pypdf
    sudo apt-get install tesseract-ocr poppler-utils   # Linux
    brew install tesseract poppler                      # macOS
"""

import os
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional

try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    from pdf2image import convert_from_path
except ImportError as e:
    raise ImportError(
        f"Missing dependency: {e}\n"
        "Run: pip install pytesseract Pillow pdf2image"
    )


# ─────────────────────────────────────────────
#  Data model
# ─────────────────────────────────────────────

@dataclass
class PageResult:
    page_number: int
    text: str
    confidence: float          # mean OCR confidence (0–100)
    word_count: int


@dataclass
class ExtractionResult:
    source_file: str
    file_type: str             # "pdf" | "image"
    total_pages: int
    pages: list[PageResult] = field(default_factory=list)
    full_text: str = ""
    average_confidence: float = 0.0
    success: bool = True
    error: Optional[str] = None

    def summary(self) -> str:
        lines = [
            f"File      : {self.source_file}",
            f"Type      : {self.file_type}",
            f"Pages     : {self.total_pages}",
            f"Words     : {len(self.full_text.split())}",
            f"Confidence: {self.average_confidence:.1f}%",
            f"Status    : {'✓ OK' if self.success else '✗ FAILED'}",
        ]
        if self.error:
            lines.append(f"Error     : {self.error}")
        return "\n".join(lines)


# ─────────────────────────────────────────────
#  Image pre-processing helpers
# ─────────────────────────────────────────────

def preprocess_image(img: Image.Image) -> Image.Image:
    """
    Enhance scanned image quality before OCR:
      1. Convert to greyscale
      2. Sharpen edges
      3. Boost contrast
    These steps noticeably improve Tesseract accuracy on low-quality scans.
    """
    img = img.convert("L")                          # greyscale
    img = img.filter(ImageFilter.SHARPEN)           # sharpen
    img = ImageEnhance.Contrast(img).enhance(2.0)   # boost contrast
    return img


# ─────────────────────────────────────────────
#  Core OCR logic
# ─────────────────────────────────────────────

def ocr_image(img: Image.Image, page_number: int = 1) -> PageResult:
    """Run Tesseract on a single PIL image and return a PageResult."""
    processed = preprocess_image(img)

    # Get plain text
    text: str = pytesseract.image_to_string(processed, lang="eng").strip()

    # Get per-word confidence scores
    data = pytesseract.image_to_data(
        processed, output_type=pytesseract.Output.DICT
    )
    confidences = [
        int(c) for c in data["conf"] if str(c).isdigit() and int(c) >= 0
    ]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    return PageResult(
        page_number=page_number,
        text=text,
        confidence=round(avg_conf, 2),
        word_count=len(text.split()),
    )


def extract_from_pdf(pdf_path: str, dpi: int = 200) -> ExtractionResult:
    """Convert each PDF page to an image, then OCR it."""
    result = ExtractionResult(
        source_file=pdf_path,
        file_type="pdf",
        total_pages=0,
    )
    try:
        images = convert_from_path(pdf_path, dpi=dpi)
        result.total_pages = len(images)

        for i, img in enumerate(images, start=1):
            print(f"  OCR page {i}/{result.total_pages} …")
            page_result = ocr_image(img, page_number=i)
            result.pages.append(page_result)

        _finalize(result)

    except Exception as exc:
        result.success = False
        result.error = str(exc)

    return result


def extract_from_image(image_path: str) -> ExtractionResult:
    """OCR a single image file."""
    result = ExtractionResult(
        source_file=image_path,
        file_type="image",
        total_pages=1,
    )
    try:
        img = Image.open(image_path)
        page_result = ocr_image(img, page_number=1)
        result.pages.append(page_result)
        _finalize(result)

    except Exception as exc:
        result.success = False
        result.error = str(exc)

    return result


def _finalize(result: ExtractionResult) -> None:
    """Aggregate page-level results into the top-level ExtractionResult."""
    result.full_text = "\n\n--- Page {} ---\n".format(1).join(
        [p.text for p in result.pages]
    )
    if result.pages:
        result.average_confidence = round(
            sum(p.confidence for p in result.pages) / len(result.pages), 2
        )


# ─────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────

def extract(file_path: str, dpi: int = 200) -> ExtractionResult:
    """
    Auto-detect file type and extract text via OCR.

    Args:
        file_path: Path to a PDF or image file.
        dpi:       Resolution for PDF-to-image conversion (higher = better
                   quality but slower; 150–300 is a practical range).

    Returns:
        ExtractionResult with per-page text, confidence scores, and
        aggregated full_text.
    """
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_from_pdf(file_path, dpi=dpi)
    elif ext in {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"}:
        return extract_from_image(file_path)
    else:
        r = ExtractionResult(source_file=file_path, file_type="unknown", total_pages=0)
        r.success = False
        r.error = f"Unsupported file extension: '{ext}'"
        return r


def batch_extract(
    file_paths: list[str],
    dpi: int = 200,
) -> list[ExtractionResult]:
    """Extract text from multiple files and return a list of results."""
    results = []
    for path in file_paths:
        print(f"\n[Extracting] {path}")
        result = extract(path, dpi=dpi)
        print(result.summary())
        results.append(result)
    return results


# ─────────────────────────────────────────────
#  Output helpers
# ─────────────────────────────────────────────

def save_as_text(result: ExtractionResult, output_path: str) -> None:
    """Write full extracted text to a .txt file."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(result.full_text)
    print(f"Text saved → {output_path}")


def save_as_json(result: ExtractionResult, output_path: str) -> None:
    """Write structured results (all pages + metadata) to a .json file."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(asdict(result), f, indent=2, ensure_ascii=False)
    print(f"JSON saved → {output_path}")


# ─────────────────────────────────────────────
#  CLI entry point
# ─────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="OCR text extractor for scanned PDFs and images.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python ocr_extractor.py scan.pdf
  python ocr_extractor.py invoice.png --output result.txt
  python ocr_extractor.py report.pdf --format json --dpi 300
  python ocr_extractor.py a.pdf b.pdf c.png --format json
        """,
    )
    p.add_argument("files", nargs="+", help="PDF or image file(s) to process")
    p.add_argument(
        "--output", "-o",
        default=None,
        help="Output file path (auto-generated if omitted)",
    )
    p.add_argument(
        "--format", "-f",
        choices=["text", "json"],
        default="text",
        help="Output format: 'text' (plain .txt) or 'json' (structured)",
    )
    p.add_argument(
        "--dpi",
        type=int,
        default=200,
        help="DPI for PDF rendering (default: 200; higher = slower but more accurate)",
    )
    return p


def main() -> None:
    args = _build_parser().parse_args()

    results = batch_extract(args.files, dpi=args.dpi)

    for result in results:
        if not result.success:
            print(f"  [SKIP] {result.source_file}: {result.error}")
            continue

        stem = Path(result.source_file).stem
        ext = "json" if args.format == "json" else "txt"
        out_path = args.output or f"{stem}_extracted.{ext}"

        if args.format == "json":
            save_as_json(result, out_path)
        else:
            save_as_text(result, out_path)

    print("\nDone.")


# ─────────────────────────────────────────────
#  Quick demo (run directly without CLI args)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        main()
    else:
        # ── Demo: create a tiny test image and OCR it ──────────────────
        print("No file provided — running built-in demo with a generated image.\n")

        from PIL import ImageDraw, ImageFont

        # Create a white image with sample text
        demo_img = Image.new("RGB", (600, 200), color="white")
        draw = ImageDraw.Draw(demo_img)
        draw.text((20, 40),  "Invoice #: 10042",      fill="black")
        draw.text((20, 80),  "Date     : 2024-04-25", fill="black")
        draw.text((20, 120), "Amount   : $1,250.00",  fill="black")
        demo_img.save("/tmp/demo_invoice.png")

        result = extract("/tmp/demo_invoice.png")
        print("── Extraction Summary ──────────────────────")
        print(result.summary())
        print("\n── Extracted Text ──────────────────────────")
        print(result.full_text)
