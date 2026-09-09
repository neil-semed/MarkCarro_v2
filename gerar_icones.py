"""
Gera os ícones do PWA do MarkCarro a partir de formas simples (não temos o
logo.png real neste momento - o repositório usa esse arquivo mas ele não foi
enviado). Design: fundo azul da marca + silhueta de carro em branco.
Se/quando tiverem o logo.png oficial, é só substituir estes PNGs pelos
gerados a partir do logo real (mantendo os mesmos nomes e tamanhos).
"""
from PIL import Image, ImageDraw

AZUL = (4, 74, 170, 255)      # #044AAA
AZUL_ESCURO = (3, 58, 133, 255)  # #033A85
BRANCO = (255, 255, 255, 255)


def desenhar_carro(draw, cx, cy, escala):
    # Silhueta simples de carro/van, centrada em (cx, cy), tamanho por "escala"
    w = 60 * escala
    h = 24 * escala
    body_top = cy - h * 0.35
    body_bottom = cy + h * 0.55

    # Carroceria (retângulo arredondado)
    draw.rounded_rectangle(
        [cx - w / 2, body_top, cx + w / 2, body_bottom],
        radius=h * 0.35, fill=BRANCO
    )
    # Cabine (trapézio simplificado via polígono)
    cab_w = w * 0.55
    cab_top = cy - h * 0.95
    draw.rounded_rectangle(
        [cx - cab_w / 2, cab_top, cx + cab_w / 2 * 0.7, body_top + h * 0.15],
        radius=h * 0.25, fill=BRANCO
    )
    # Rodas
    raio = h * 0.32
    for dx in (-w * 0.28, w * 0.28):
        draw.ellipse(
            [cx + dx - raio, body_bottom - raio * 0.6, cx + dx + raio, body_bottom + raio * 1.4],
            fill=AZUL_ESCURO
        )


def gerar(tamanho, caminho, maskable=False, fundo_transparente=False):
    img = Image.new('RGBA', (tamanho, tamanho), (0, 0, 0, 0) if fundo_transparente else AZUL)
    draw = ImageDraw.Draw(img)

    if not fundo_transparente:
        if maskable:
            # Maskable: preenche o quadrado inteiro (sem cantos arredondados),
            # o SO aplica sua própria máscara. Conteúdo fica na "safe zone"
            # central (~80%) pra não ser cortado.
            draw.rectangle([0, 0, tamanho, tamanho], fill=AZUL)
            escala = (tamanho / 100) * 0.65
        else:
            raio = tamanho * 0.22
            draw.rounded_rectangle([0, 0, tamanho, tamanho], radius=raio, fill=AZUL)
            escala = (tamanho / 100) * 0.85
    else:
        escala = (tamanho / 100) * 0.85

    desenhar_carro(draw, tamanho / 2, tamanho * 0.52, escala)

    img.save(caminho)
    print('gerado:', caminho, img.size)


gerar(192, 'icons/icon-192.png')
gerar(512, 'icons/icon-512.png')
gerar(512, 'icons/icon-maskable-512.png', maskable=True)
gerar(180, 'icons/apple-touch-icon-180.png')
gerar(32, 'icons/favicon-32.png')
