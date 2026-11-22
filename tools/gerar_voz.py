"""
Gera os áudios da voz da abertura com o edge-tts (voz neural da Microsoft).

Uso (no seu computador, com internet):
    pip install edge-tts
    python tools/gerar_voz.py

Os arquivos vão para a pasta /audio. O efeito robótico é aplicado no próprio
site, então os MP3 saem "limpos". Para trocar o texto, edite FALAS abaixo e rode
de novo. Mantenha as falas curtas: A até ~3,5 s e B até ~2 s.

O edge-tts usa um serviço online não oficial da Microsoft; se um dia parar de
funcionar, o site continua normal, só sem a voz.
"""
import asyncio
import pathlib

import edge_tts

VOICE = "pt-BR-FranciscaNeural"  # outras: edge-tts --list-voices  (procure por pt-BR)
RATE = "-8%"                     # mais lenta soa mais "sistema"
PITCH = "-12Hz"                  # um pouco mais grave

# Os nomes dos arquivos são fixos: intro-<tema>-a e intro-<tema>-b.
FALAS = {
    "intro-classic-a": "Conectando ao arquivo central. Credenciais verificadas.",
    "intro-classic-b": "Acesso concedido. Bem-vindo ao arquivo.",
    "intro-doomsday-a": "Protocolo Doomsday ativo. Varredura multiversal em andamento.",
    "intro-doomsday-b": "Incursão detectada. Acesso concedido.",
}

SAIDA = pathlib.Path(__file__).resolve().parent.parent / "audio"


async def main():
    SAIDA.mkdir(exist_ok=True)
    for nome, texto in FALAS.items():
        destino = SAIDA / f"{nome}.mp3"
        await edge_tts.Communicate(texto, VOICE, rate=RATE, pitch=PITCH).save(str(destino))
        print("ok:", destino)


asyncio.run(main())
