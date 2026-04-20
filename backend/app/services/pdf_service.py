from langchain_text_splitters import RecursiveCharacterTextSplitter
import io
import anyio

class PDFService:
    @staticmethod
    async def extract_text(file_content: bytes) -> str:
        return await anyio.to_thread.run_sync(PDFService._extract_text_sync, file_content)

    @staticmethod
    def _extract_text_sync(file_content: bytes) -> str:
        import pypdf
        try:
            if not file_content:
                return ""
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                extr = page.extract_text()
                if extr:
                    text += extr + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""

    @staticmethod
    async def extract_text_with_pages(file_content: bytes) -> list[dict]:
        return await anyio.to_thread.run_sync(PDFService._extract_text_with_pages_sync, file_content)

    @staticmethod
    def _extract_text_with_pages_sync(file_content: bytes) -> list[dict]:
        import pypdf
        try:
            if not file_content:
                return []
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
            pages = []
            for i, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text:
                    pages.append({"page": i + 1, "text": text.strip()})
            return pages
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return []

    @staticmethod
    async def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[str]:
        return await anyio.to_thread.run_sync(PDFService._chunk_text_sync, text, chunk_size, chunk_overlap)

    @staticmethod
    def _chunk_text_sync(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        return text_splitter.split_text(text)
