"""
Gera os áudios da voz da abertura com o edge-tts (voz neural da Microsoft).

Uso (no seu computador, com internet):
    pip install edge-tts
    python tools/gerar_voz.py          (gera os áudios do site)
    python tools/gerar_voz.py teste    (gera amostras das vozes para comparar)

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
RATE = "-4%"                     # valores negativos = mais lenta
PITCH = "-6Hz"                   # valores negativos = mais grave

# Vozes para comparar no modo de teste (python tools/gerar_voz.py teste)
CANDIDATAS = [
    "pt-BR-FranciscaNeural",
    "pt-BR-ThalitaMultilingualNeural",
    "en-US-AvaMultilingualNeural",   # lê português com sotaque americano
    "en-US-EmmaMultilingualNeural",  # idem
]

# Os nomes dos arquivos são fixos: intro-<tema>-a e intro-<tema>-b.
FALAS = {
    "intro-classic-a": "Conectando ao arquivo central. Credenciais verificadas.",
    "intro-classic-b": "Acesso concedido. Seja bem vindo ao arquivo central.",
    "intro-doomsday-a": "Protocolo Doomsday ativo. Varredura multiversal em andamento.",
    "intro-doomsday-b": "Incursão detectada. Acesso concedido.",
}

def trechos(texto):
    """Divide em frases: cada uma é sintetizada separada, o que evita que a voz
    multilíngue "adivinhe" o idioma errado no meio do texto."""
    return [t.strip() + "." for t in texto.replace("!", ".").split(".") if t.strip()]


async def sintetizar(texto, voz, destino):
    partes = []
    for i, t in enumerate(trechos(texto)):
        tmp = pathlib.Path(str(destino) + f".{i}.tmp")
        await edge_tts.Communicate(t, voz, rate=RATE, pitch=PITCH).save(str(tmp))
        partes.append(tmp.read_bytes())
        tmp.unlink()
    destino.write_bytes(b"".join(partes))  # MP3 aceita ser concatenado


SAIDA = pathlib.Path(__file__).resolve().parent.parent / "audio"


async def teste():
    """Gera uma amostra de cada voz candidata em tools/amostras/ (não vai para o site)."""
    pasta = pathlib.Path(__file__).resolve().parent / "amostras"
    pasta.mkdir(exist_ok=True)
    texto = FALAS["intro-classic-a"] + " " + FALAS["intro-classic-b"]
    for v in CANDIDATAS:
        destino = pasta / f"{v}.mp3"
        await sintetizar(texto, v, destino)
        print("amostra:", destino)


async def main():
    SAIDA.mkdir(exist_ok=True)
    for nome, texto in FALAS.items():
        destino = SAIDA / f"{nome}.mp3"
        await sintetizar(texto, VOICE, destino)
        print("ok:", destino)


import sys
asyncio.run(teste() if sys.argv[1:] == ["teste"] else main())
