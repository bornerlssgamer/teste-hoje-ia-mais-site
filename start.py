#!/usr/bin/env python3
"""
Script de inicialização do AI Video Transcriber
"""

import os
import sys
import subprocess
from pathlib import Path


def check_dependencies():
    """Verifica se todas as dependências Python estão instaladas"""

    required_packages = {
        "fastapi": "fastapi",
        "uvicorn": "uvicorn",
        "yt-dlp": "yt_dlp",
        "faster-whisper": "faster_whisper",
        "openai": "openai"
    }

    missing_packages = []

    for display_name, import_name in required_packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append(display_name)

    if missing_packages:
        print("❌ Dependências faltando:")
        for package in missing_packages:
            print(f"   - {package}")

        print("\nInstale com:")
        print("pip install -r requirements.txt")

        return False

    print("✅ Todas as dependências estão instaladas")
    return True


def check_ffmpeg():
    """Verifica se o FFmpeg está instalado"""

    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )

        print("✅ FFmpeg detectado")
        return True

    except Exception:
        print("⚠️ FFmpeg não encontrado")

        print("Instale o FFmpeg:")

        print("Windows:")
        print("https://ffmpeg.org/download.html")

        print("Ubuntu:")
        print("sudo apt install ffmpeg")

        print("Mac:")
        print("brew install ffmpeg")

        return False


def setup_environment():
    """Configura variáveis de ambiente"""

    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️ Nenhuma OPENAI_API_KEY configurada.")
        print("Você poderá configurar a API diretamente na interface web.")

    if not os.getenv("OPENAI_BASE_URL"):
        os.environ["OPENAI_BASE_URL"] = "https://openrouter.ai/api/v1"
        print("✅ Usando OpenRouter como endpoint padrão")

    if not os.getenv("WHISPER_MODEL_SIZE"):
        os.environ["WHISPER_MODEL_SIZE"] = "base"

    print("✅ Configuração de ambiente concluída")


def main():

    production_mode = "--prod" in sys.argv or os.getenv("PRODUCTION_MODE") == "true"

    print("\n🚀 Iniciando AI Video Transcriber")

    if production_mode:
        print("🔒 Modo PRODUÇÃO ativado")
    else:
        print("🔧 Modo DESENVOLVIMENTO")

    print("=" * 50)

    if not check_dependencies():
        sys.exit(1)

    check_ffmpeg()

    setup_environment()

    print("\n🎉 Verificações concluídas")
    print("=" * 50)

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    print("\n🌐 Servidor iniciando...")
    print(f"URL local: http://localhost:{port}")
    print("Pressione CTRL+C para parar")
    print("=" * 50)

    try:

        backend_dir = Path(__file__).parent / "backend"
        os.chdir(backend_dir)

        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            host,
            "--port",
            str(port)
        ]

        if not production_mode:
            cmd.append("--reload")

        subprocess.run(cmd)

    except KeyboardInterrupt:
        print("\n👋 Servidor encerrado")

    except Exception as e:
        print("\n❌ Erro ao iniciar servidor:")
        print(e)
        sys.exit(1)


if __name__ == "__main__":
    main()
