import os
import faiss
import numpy as np
import anyio
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from app.core.config import settings

class RAGService:
    def __init__(self):
        # Using a fast local model for embeddings
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.persist_dir = "vector_store"
        self.indices = {} # semester_id -> faiss index
        self.metadata = {} # semester_id -> [list of chunks]
        self._load_all()

    def _get_index_path(self, semester_id: int):
        return os.path.join(self.persist_dir, f"index_{semester_id}.faiss")

    def _get_meta_path(self, semester_id: int):
        return os.path.join(self.persist_dir, f"meta_{semester_id}.npy")

    def _load_all(self):
        if not os.path.exists(self.persist_dir):
            os.makedirs(self.persist_dir)
            return
        
        from app.core.logging import logger
        for file in os.listdir(self.persist_dir):
            if file.startswith("index_") and file.endswith(".faiss"):
                try:
                    semester_id = int(file.replace("index_", "").replace(".faiss", ""))
                    self.indices[semester_id] = faiss.read_index(self._get_index_path(semester_id))
                    if os.path.exists(self._get_meta_path(semester_id)):
                        self.metadata[semester_id] = np.load(self._get_meta_path(semester_id), allow_pickle=True).tolist()
                    else:
                        self.metadata[semester_id] = []
                except Exception as e:
                    logger.error(f"Error loading index {file}: {e}")

    def _get_index(self, semester_id: int):
        if semester_id not in self.indices:
            dimension = self.model.get_sentence_embedding_dimension()
            self.indices[semester_id] = faiss.IndexFlatL2(dimension)
            self.metadata[semester_id] = []
        return self.indices[semester_id]

    def _save(self, semester_id: int):
        faiss.write_index(self.indices[semester_id], self._get_index_path(semester_id))
        np.save(self._get_meta_path(semester_id), np.array(self.metadata[semester_id], dtype=object))

    async def add_documents(self, semester_id: int, chunks: List[Dict]):
        if not chunks:
            return
        await anyio.to_thread.run_sync(self._add_documents_sync, semester_id, chunks)

    def _add_documents_sync(self, semester_id: int, chunks: List[Dict]):
        index = self._get_index(semester_id)
        texts = [c['text'] for c in chunks]
        embeddings = self.model.encode(texts)
        index.add(np.array(embeddings).astype('float32'))
        self.metadata[semester_id].extend(chunks)
        self._save(semester_id)

    async def remove_course_documents(self, semester_id: int, course_name: str):
        """Remove all chunks associated with a specific course and rebuild index."""
        if semester_id not in self.metadata:
            return
        await anyio.to_thread.run_sync(self._remove_documents_sync, semester_id, course_name)

    def _remove_documents_sync(self, semester_id: int, course_name: str):
        if semester_id not in self.metadata:
            return
            
        # Filter out chunks for this course
        new_metadata = [c for c in self.metadata[semester_id] if c.get('course_name') != course_name]
        
        if len(new_metadata) == len(self.metadata[semester_id]):
            return # Nothing to remove
            
        self.metadata[semester_id] = new_metadata
        self._rebuild_index(semester_id)

    async def remove_document_chunks(self, semester_id: int, file_name: str):
        """Remove all chunks associated with a specific file and rebuild index."""
        if semester_id not in self.metadata:
            return
        await anyio.to_thread.run_sync(self._remove_chunks_sync, semester_id, file_name)

    def _remove_chunks_sync(self, semester_id: int, file_name: str):
        if semester_id not in self.metadata:
            return
            
        # Filter out chunks for this file
        new_metadata = [c for c in self.metadata[semester_id] if c.get('file_name') != file_name]
        
        if len(new_metadata) == len(self.metadata[semester_id]):
            return # Nothing to remove
            
        self.metadata[semester_id] = new_metadata
        self._rebuild_index(semester_id)

    def _rebuild_index(self, semester_id: int):
        # Rebuild index from current metadata
        dimension = self.model.get_sentence_embedding_dimension()
        new_index = faiss.IndexFlatL2(dimension)
        
        if self.metadata[semester_id]:
            texts = [c['text'] for c in self.metadata[semester_id]]
            embeddings = self.model.encode(texts)
            new_index.add(np.array(embeddings).astype('float32'))
            
        self.indices[semester_id] = new_index
        self._save(semester_id)

    async def search(self, semester_id: int, query: str, k: int = 3) -> List[str]:
        if semester_id not in self.indices:
            return []
        return await anyio.to_thread.run_sync(self._search_sync, semester_id, query, k)

    def _search_sync(self, semester_id: int, query: str, k: int) -> List[Dict]:
        index = self.indices[semester_id]
        query_embedding = self.model.encode([query])
        distances, indices = index.search(np.array(query_embedding).astype('float32'), k)
        
        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.metadata[semester_id]):
                # Metadata is now stored as dicts with text and sources
                results.append(self.metadata[semester_id][idx])
        return results

    async def generate_answer(self, query: str, context: List[Dict]) -> Dict:
        if not settings.AI_ENABLED:
            return {"answer": "AI disabled. Add OPENAI_API_KEY to enable.", "sources": []}
            
        # Simple Prompt Injection Guard
        injection_keywords = ["ignore", "système", "system prompt", "instruction", "tu dois"]
        if any(kw in query.lower() for kw in injection_keywords):
            return {"answer": "Désolé, votre requête contient des termes non autorisés par la politique de sécurité académique.", "sources": []}
            
        if not context:
            return {"answer": "Désolé, je n'ai pas trouvé d'informations dans les supports de cours pour répondre à votre question par rapport à ce semestre.", "sources": []}
        
        context_str = "\n---\n".join([c['text'] for c in context])
        prompt = f"""Tu es EMSI Copilot, l'assistant académique de l'EMSI. 
Réponds à la question en utilisant UNIQUEMENT le contexte fourni ci-dessous.
Si la réponse n'est pas dans le contexte, dis poliment que tu ne sais pas.
Ne fais aucune référence à tes connaissances externes.

CONTEXTE:
{context_str}

QUESTION:
{query}

RÉPONSE (en français):"""
        
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            # Use anyio.to_thread.run_sync for the OpenAI blocking call if using sync client
            answer = await anyio.to_thread.run_sync(self._generate_openai_sync, client, prompt)
            
            # Extract unique sources from context
            sources = []
            seen_sources = set()
            for c in context:
                s_key = f"{c.get('course_name')} - Page {c.get('page_number')}"
                if s_key not in seen_sources:
                    sources.append({
                        "course": c.get('course_name'),
                        "page": c.get('page_number'),
                        "text": c.get('text')[:200] + "..."
                    })
                    seen_sources.add(s_key)
            
            return {"answer": answer, "sources": sources}
        except Exception as e:
            from app.core.logging import logger
            logger.error(f"AI Generation Error: {e}")
            return {"answer": "Désolé, une erreur est survenue lors de la génération de la réponse par l'IA.", "sources": []}

    async def generate_quiz(self, semester_id: int, course_name: str) -> List[Dict]:
        if not settings.AI_ENABLED:
            return []
            
        # Get context for this course specifically
        # We need to filter metadata by course_name
        course_chunks = [c['text'] for c in self.metadata.get(semester_id, []) if c.get('course_name') == course_name]
        if not course_chunks:
            return []
            
        context_str = "\n---\n".join(course_chunks[:10]) # Use first 10 chunks for quiz
        
        prompt = f"""Tu es un professeur de l'EMSI. 
Génère un quiz de 3 questions à choix multiples (QCM) basé sur le contexte de cours fourni.
Chaque question doit avoir 4 options (A, B, C, D) et une seule bonne réponse.
Réponds UNIQUEMENT au format JSON comme ceci:
[
  {{
    "question": "Texte de la question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B"
  }}
]

CONTEXTE:
{context_str}"""
        
        try:
            from openai import OpenAI
            import json
            from app.core.logging import logger
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = await anyio.to_thread.run_sync(self._generate_openai_sync, client, prompt)
            # Find the JSON block in the response
            start = response.find('[')
            end = response.rfind(']') + 1
            if start != -1 and end != -1:
                return json.loads(response[start:end])
            return []
        except Exception as e:
            logger.error(f"Quiz Generation Error: {e}")
            return []

    def _generate_openai_sync(self, client, prompt):
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Tu es un assistant académique strict. Tu ne parles que sur la base du contexte fourni."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )
        return response.choices[0].message.content

# Global instance
rag_service = RAGService()
