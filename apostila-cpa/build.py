#!/usr/bin/env python3
"""Monta a apostila a partir de src/.

Gera em dist/:
  caderno.html                 página do caderno digital (publicada como Artifact; sem <!doctype>)
  Apostila-CPA-caderno.html    o mesmo caderno como arquivo HTML completo, para abrir no navegador
  apostila-pdf.html            documento que o build-pdf.cjs transforma no PDF

Uso: python3 build.py
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SRC = RAIZ / "src"
DIST = RAIZ / "dist"

# capítulos prontos, na ordem (o número precisa existir em src/capNN.html e src/dados-capNN.js)
CAPITULOS = [1]


def ler(nome: str) -> str:
    return (SRC / nome).read_text(encoding="utf-8")


def montar() -> None:
    DIST.mkdir(exist_ok=True)
    estilo = ler("estilo.css")
    simbolos = ler("simbolos.html")
    app = ler("app.js")
    dados = "\n".join(ler(f"dados-cap{n:02d}.js") for n in CAPITULOS)
    caps = {n: ler(f"cap{n:02d}.html") for n in CAPITULOS}

    casca = ler("casca.html")
    pagina = (casca.replace("/*@@ESTILO@@*/", estilo)
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

    corpo = ""
    for n, html in caps.items():
        capa = SRC / f"capa-cap{n:02d}.html"
        if capa.exists():
            corpo += capa.read_text(encoding="utf-8")
        corpo += f'<div class="folha"><div class="cap-layout">{html}</div></div>'
    pdf = (ler("casca-pdf.html").replace("/*@@ESTILO@@*/", estilo)
           .replace("/*@@IMPRESSAO@@*/", ler("impressao.css"))
           .replace("<!--@@SIMBOLOS@@-->", simbolos)
           .replace("<!--@@CORPO@@-->", corpo)
           .replace("/*@@DADOS@@*/", dados)
           .replace("/*@@APP@@*/", app))
    (DIST / "apostila-pdf.html").write_text(pdf, encoding="utf-8")

    # PDF só do resumo (2 páginas por capítulo)
    corpo_res = "".join(f'<div class="folha">{(SRC / f"resumo{n:02d}.html").read_text(encoding="utf-8")}</div>'
                        for n in CAPITULOS if (SRC / f"resumo{n:02d}.html").exists())
    res = (ler("casca-pdf.html").replace("/*@@ESTILO@@*/", estilo)
           .replace("/*@@IMPRESSAO@@*/", ler("impressao.css"))
           .replace("<!--@@SIMBOLOS@@-->", simbolos)
           .replace("<!--@@CORPO@@-->", corpo_res)
           .replace("/*@@DADOS@@*/", dados)
           .replace("/*@@APP@@*/", app)
           .replace("<title>Apostila CPA · Capítulo 1 · Sistema Financeiro Nacional</title>", "<title>Apostila CPA · Resumo do Capítulo 1</title>"))
    (DIST / "resumo-pdf.html").write_text(res, encoding="utf-8")

    for f in ("caderno.html", "Apostila-CPA-caderno.html", "apostila-pdf.html", "resumo-pdf.html"):
        print(f"{f}: {(DIST / f).stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    montar()
