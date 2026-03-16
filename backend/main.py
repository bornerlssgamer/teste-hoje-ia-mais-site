from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import os
import tempfile
import asyncio
import logging
from pathlib import Path
from typing import Optional
import aiofiles
import uuid
import json
import re
import openai

from video_processor import VideoProcessor
from transcriber import Transcriber
from summarizer import Summarizer
from translator import Translator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GETVIRAU", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).parent.parent

# ── Servir frontend React (pasta dist gerada pelo Vite) ──────────────────────
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

if FRONTEND_DIST.exists():
    # Arquivos estáticos do React (JS, CSS, imagens)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")
    logger.info(f"Frontend React carregado de: {FRONTEND_DIST}")
else:
    # Fallback: servir static/ original enquanto não tem build do React
    STATIC_DIR = PROJECT_ROOT / "static"
    if STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
        logger.info("Servindo static/ original (frontend React ainda não buildado)")

TEMP_DIR = PROJECT_ROOT / "temp"
TEMP_DIR.mkdir(exist_ok=True)

video_processor = VideoProcessor()
transcriber = Transcriber()
summarizer = Summarizer()
translator = Translator()

import threading

TASKS_FILE = TEMP_DIR / "tasks.json"
tasks_lock = threading.Lock()

def load_tasks():
    try:
        if TASKS_FILE.exists():
            with open(TASKS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return {}

def save_tasks(tasks_data):
    try:
        with tasks_lock:
            with open(TASKS_FILE, 'w', encoding='utf-8') as f:
                json.dump(tasks_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Erro ao salvar tasks: {e}")

async def broadcast_task_update(task_id: str, task_data: dict):
    logger.info(f"Broadcast: {task_id}, status: {task_data.get('status')}, conexões: {len(sse_connections.get(task_id, []))}")
    if task_id in sse_connections:
        connections_to_remove = []
        for queue in sse_connections[task_id]:
            try:
                await queue.put(json.dumps(task_data, ensure_ascii=False))
            except Exception as e:
                logger.warning(f"Falha ao enviar para fila: {e}")
                connections_to_remove.append(queue)
        for queue in connections_to_remove:
            sse_connections[task_id].remove(queue)
        if not sse_connections[task_id]:
            del sse_connections[task_id]

tasks = load_tasks()
processing_urls = set()
active_tasks = {}
sse_connections = {}

def _sanitize_title_for_filename(title: str) -> str:
    if not title:
        return "untitled"
    safe = re.sub(r"[^\w\-\s]", "", title)
    safe = re.sub(r"\s+", "_", safe).strip("._-")
    return safe[:80] or "untitled"

@app.get("/")
async def read_root():
    """Retorna o frontend React ou o fallback HTML"""
    if FRONTEND_DIST.exists():
        return FileResponse(str(FRONTEND_DIST / "index.html"))
    return FileResponse(str(PROJECT_ROOT / "static" / "index.html"))

@app.post("/api/models")
async def list_models(
    base_url: str = Form(default=""),
    api_key:  str = Form(default=""),
):
    effective_key = api_key or os.getenv("OPENAI_API_KEY", "")
    effective_url = base_url.rstrip("/") or os.getenv("OPENAI_BASE_URL") or None

    if not effective_key:
        raise HTTPException(status_code=400, detail="API key é obrigatória")

    try:
        client = openai.OpenAI(api_key=effective_key, base_url=effective_url)
        resp   = await asyncio.to_thread(client.models.list)
        models = [{"id": m.id, "name": getattr(m, "name", m.id)} for m in resp.data]
        models.sort(key=lambda x: x["id"])
        return {"data": models}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/process-video")
async def process_video(
    url: str = Form(...),
    summary_language: str = Form(default="pt"),
    api_key:       str = Form(default=""),
    model_base_url: str = Form(default=""),
    model_id:      str = Form(default=""),
):
    try:
        if url in processing_urls:
            for tid, task in tasks.items():
                if task.get("url") == url:
                    return {"task_id": tid, "message": "Vídeo já está sendo processado..."}

        task_id = str(uuid.uuid4())
        processing_urls.add(url)

        tasks[task_id] = {
            "status": "processing",
            "progress": 0,
            "message": "Iniciando processamento...",
            "script": None,
            "summary": None,
            "error": None,
            "url": url
        }
        save_tasks(tasks)

        task = asyncio.create_task(process_video_task(task_id, url, summary_language, api_key, model_base_url, model_id))
        active_tasks[task_id] = task

        return {"task_id": task_id, "message": "Tarefa criada, processando..."}

    except Exception as e:
        logger.error(f"Erro ao processar vídeo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Falha: {str(e)}")

async def process_video_task(
    task_id: str,
    url: str,
    summary_language: str,
    api_key: str = "",
    model_base_url: str = "",
    model_id: str = "",
):
    try:
        tasks[task_id].update({
            "status": "processing",
            "progress": 10,
            "message": "Verificando legendas do vídeo..."
        })
        save_tasks(tasks)
        await broadcast_task_update(task_id, tasks[task_id])
        await asyncio.sleep(0.1)

        if api_key:
            effective_url = model_base_url.rstrip("/") or None
            request_summarizer = Summarizer(
                api_key=api_key,
                base_url=effective_url,
                model=model_id or None,
            )
        else:
            request_summarizer = summarizer

        subtitle_text, sub_title, sub_lang = await video_processor.fetch_subtitles(url, TEMP_DIR)

        if subtitle_text:
            video_title = sub_title
            raw_script = subtitle_text
            transcriber.last_detected_language = sub_lang

            tasks[task_id].update({
                "progress": 40,
                "message": f"Legendas encontradas ({sub_lang}), processando texto..."
            })
            save_tasks(tasks)
            await broadcast_task_update(task_id, tasks[task_id])
        else:
            tasks[task_id].update({
                "progress": 15,
                "message": "Sem legendas, baixando áudio do vídeo..."
            })
            save_tasks(tasks)
            await broadcast_task_update(task_id, tasks[task_id])

            audio_path, video_title = await video_processor.download_and_convert(url, TEMP_DIR)

            tasks[task_id].update({
                "progress": 40,
                "message": "Transcrevendo com Whisper..."
            })
            save_tasks(tasks)
            await broadcast_task_update(task_id, tasks[task_id])

            raw_script = await transcriber.transcribe(audio_path)

        try:
            short_id = task_id.replace("-", "")[:6]
            safe_title = _sanitize_title_for_filename(video_title)
            raw_md_filename = f"raw_{safe_title}_{short_id}.md"
            raw_md_path = TEMP_DIR / raw_md_filename
            with open(raw_md_path, "w", encoding="utf-8") as f:
                f.write((raw_script or "") + f"\n\nsource: {url}\n")
            tasks[task_id].update({"raw_script_file": raw_md_filename})
            save_tasks(tasks)
            await broadcast_task_update(task_id, tasks[task_id])
        except Exception as e:
            logger.error(f"Erro ao salvar transcrição raw: {e}")

        tasks[task_id].update({
            "progress": 55,
            "message": "Otimizando texto da transcrição..."
        })
        save_tasks(tasks)
        await broadcast_task_update(task_id, tasks[task_id])

        script = await request_summarizer.optimize_transcript(raw_script)
        script_with_title = f"# {video_title}\n\n{script}\n\nsource: {url}\n"

        detected_language = transcriber.get_detected_language(raw_script)
        logger.info(f"Idioma detectado: {detected_language}, idioma do resumo: {summary_language}")

        translation_content = None
        translation_filename = None
        translation_path = None

        if detected_language and translator.should_translate(detected_language, summary_language):
            tasks[task_id].update({
                "progress": 70,
                "message": "Gerando tradução..."
            })
            save_tasks(tasks)
            await broadcast_task_update(task_id, tasks[task_id])

            translation_content = await translator.translate_text(script, summary_language, detected_language)
            translation_with_title = f"# {video_title}\n\n{translation_content}\n\nsource: {url}\n"

            translation_filename = f"translation_{safe_title}_{short_id}.md"
            translation_path = TEMP_DIR / translation_filename
            async with aiofiles.open(translation_path, "w", encoding="utf-8") as f:
                await f.write(translation_with_title)

        tasks[task_id].update({
            "progress": 80,
            "message": "Gerando resumo com IA..."
        })
        save_tasks(tasks)
        await broadcast_task_update(task_id, tasks[task_id])

        summary = await request_summarizer.summarize(script, summary_language, video_title)
        summary_with_source = summary + f"\n\nsource: {url}\n"

        script_filename = f"transcript_{safe_title}_{short_id}.md"
        script_path = TEMP_DIR / script_filename
        async with aiofiles.open(script_path, "w", encoding="utf-8") as f:
            await f.write(script_with_title)

        summary_filename = f"summary_{safe_title}_{short_id}.md"
        summary_path = TEMP_DIR / summary_filename
        async with aiofiles.open(summary_path, "w", encoding="utf-8") as f:
            await f.write(summary_with_source)

        task_result = {
            "status": "completed",
            "progress": 100,
            "message": "Processamento concluído!",
            "video_title": video_title,
            "script": script_with_title,
            "summary": summary_with_source,
            "script_path": str(script_path),
            "summary_path": str(summary_path),
            "short_id": short_id,
            "safe_title": safe_title,
            "detected_language": detected_language,
            "summary_language": summary_language
        }

        if translation_content and translation_path:
            task_result.update({
                "translation": translation_with_title,
                "translation_path": str(translation_path),
                "translation_filename": translation_filename
            })

        tasks[task_id].update(task_result)
        save_tasks(tasks)
        await broadcast_task_update(task_id, tasks[task_id])

        processing_urls.discard(url)
        if task_id in active_tasks:
            del active_tasks[task_id]

    except Exception as e:
        logger.error(f"Tarefa {task_id} falhou: {str(e)}")
        processing_urls.discard(url)
        if task_id in active_tasks:
            del active_tasks[task_id]

        tasks[task_id].update({
            "status": "error",
            "error": str(e),
            "message": f"Falha: {str(e)}"
        })
        save_tasks(tasks)
        await broadcast_task_update(task_id, tasks[task_id])

@app.get("/api/task-status/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return tasks[task_id]

@app.get("/api/task-stream/{task_id}")
async def task_stream(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    async def event_generator():
        queue = asyncio.Queue()

        if task_id not in sse_connections:
            sse_connections[task_id] = []
        sse_connections[task_id].append(queue)

        try:
            current_task = tasks.get(task_id, {})
            yield f"data: {json.dumps(current_task, ensure_ascii=False)}\n\n"

            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {data}\n\n"

                    task_data = json.loads(data)
                    if task_data.get("status") in ["completed", "error"]:
                        break

                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"

        except asyncio.CancelledError:
            logger.info(f"SSE cancelado: {task_id}")
        except Exception as e:
            logger.error(f"Erro no SSE: {e}")
        finally:
            if task_id in sse_connections and queue in sse_connections[task_id]:
                sse_connections[task_id].remove(queue)
                if not sse_connections[task_id]:
                    del sse_connections[task_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    try:
        if not filename.endswith('.md'):
            raise HTTPException(status_code=400, detail="Apenas arquivos .md são suportados")

        if '..' in filename or '/' in filename or '\\' in filename:
            raise HTTPException(status_code=400, detail="Nome de arquivo inválido")

        file_path = TEMP_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")

        return FileResponse(file_path, filename=filename, media_type="text/markdown")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha no download: {str(e)}")

@app.delete("/api/task/{task_id}")
async def delete_task(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    if task_id in active_tasks:
        task = active_tasks[task_id]
        if not task.done():
            task.cancel()
        del active_tasks[task_id]

    task_url = tasks[task_id].get("url")
    if task_url:
        processing_urls.discard(task_url)

    del tasks[task_id]
    return {"message": "Tarefa cancelada e removida"}

@app.get("/api/tasks/active")
async def get_active_tasks():
    return {
        "active_tasks": len(active_tasks),
        "processing_urls": len(processing_urls),
        "task_ids": list(active_tasks.keys())
    }

# ── SPA fallback: qualquer rota não-API retorna o index.html do React ─────────
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if FRONTEND_DIST.exists():
        return FileResponse(str(FRONTEND_DIST / "index.html"))
    return FileResponse(str(PROJECT_ROOT / "static" / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
