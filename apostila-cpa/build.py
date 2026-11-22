#!/usr/bin/env python3
"""Monta a apostila a partir de src/.

Gera em dist/:
  caderno.html                   página do caderno digital (publicada como Artifact; sem <!doctype>)
  Apostila-CPA-caderno.html      o mesmo caderno como arquivo HTML completo, para abrir no navegador
  apostila-pdf-capNN.html        documento de cada capítulo que o build-pdf.cjs transforma em PDF
  resumo-pdf-capNN.html          resumo de 2 páginas de cada capítulo, para o PDF do resumo

Uso: python3 build.py
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SRC = RAIZ / "src"
DIST = RAIZ / "dist"

# capítulos prontos, na ordem: número -> título (usado no <title> e no rodapé do PDF)
CAPITULOS = {
    1: "Sistema Financeiro Nacional",
    2: "Política econômica e indicadores",
    3: "Matemática financeira",
    4: "Regulação e infraestrutura de mercado",
    5: "Renda fixa",
}


def ler(nome: str) -> str:
    return (SRC / nome).read_text(encoding="utf-8")


def documento_pdf(titulo: str, corpo: str, estilo: str, simbolos: str, dados: str, app: str) -> str:
    return (ler("casca-pdf.html").replace("/*@@ESTILO@@*/", estilo)
            .replace("/*@@IMPRESSAO@@*/", ler("impressao.css"))
            .replace("<!--@@SIMBOLOS@@-->", simbolos)
            .replace("<!--@@CORPO@@-->", corpo)
            .replace("/*@@DADOS@@*/", dados)
            .replace("/*@@APP@@*/", app)
            .replace("<!--@@TITULO@@-->", titulo))


def montar() -> None:
    DIST.mkdir(exist_ok=True)
    estilo = ler("estilo.css")
    simbolos = ler("simbolos.html")
    app = ler("app.js")
    dados = "\n".join(ler(f"dados-cap{n:02d}.js") for n in CAPITULOS)
    caps = {n: ler(f"cap{n:02d}.html") for n in CAPITULOS}

    pagina = (ler("casca.html").replace("/*@@ESTILO@@*/", estilo)
              .replace("<!--@@SIMBOLOS@@-->", simbolos)
              .replace("/*@@DADOS@@*/", dados)
              .replace("/*@@APP@@*/", app))
    for n, html in caps.items():
        pagina = pagina.replace(f"<!--@@CAP{n:02d}@@-->", html)
        resumo = SRC / f"resumo{n:02d}.html"
        if resumo.exists():
            pagina = pagina.replace(f"<!--@@RESUMO{n:02d}@@-->", resumo.read_text(encoding="utf-8"))
    (DIST / "caderno.html").write_text(pagina, encoding="utf-8")

    completo = ("<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n"
                "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
                "</head>\n<body>\n" + pagina + "\n</body>\n</html>\n")
    (DIST / "Apostila-CPA-caderno.html").write_text(completo, encoding="utf-8")
    saidas = ["caderno.html", "Apostila-CPA-caderno.html"]

    for n, html in caps.items():
        titulo = CAPITULOS[n]
        capa = SRC / f"capa-cap{n:02d}.html"
        corpo = (capa.read_text(encoding="utf-8") if capa.exists() else "") + \
            f'<div class="folha"><div class="cap-layout">{html}</div></div>'
        nome = f"apostila-pdf-cap{n:02d}.html"
        (DIST / nome).write_text(documento_pdf(f"Apostila CPA · Capítulo {n} · {titulo}", corpo, estilo, simbolos, dados, app), encoding="utf-8")
        saidas.append(nome)
        resumo = SRC / f"resumo{n:02d}.html"
        if resumo.exists():
            nome = f"resumo-pdf-cap{n:02d}.html"
            corpo = f'<div class="folha">{resumo.read_text(encoding="utf-8")}</div>'
            (DIST / nome).write_text(documento_pdf(f"Apostila CPA · Resumo do Capítulo {n}", corpo, estilo, simbolos, dados, app), encoding="utf-8")
            saidas.append(nome)

    for f in saidas:
        print(f"{f}: {(DIST / f).stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    montar()
