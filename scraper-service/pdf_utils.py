import fitz  # PyMuPDF

def extract_pdf_text(pdf_bytes: bytes) -> str:
    text = ""
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text("text")
    return text.strip()
