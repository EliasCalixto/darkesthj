# darkesthj web

Sitio de darkesthj servido con Flask para desarrollo local y congelado como HTML estático para GitHub Pages.

## Requisitos

- Python 3.11+
- `pip`

Instala dependencias:

```bash
python -m venv .venv
source .venv/bin/activate  # En Windows usa .venv\Scripts\activate
pip install -r requirements.txt
```

## Desarrollo local

```bash
flask --app app --debug run
```

El sitio quedará disponible en `http://127.0.0.1:5000/`.

## Construir para GitHub Pages

```bash
python freeze.py
```

El comando genera la versión estática dentro de `docs/`. Sube ese directorio al repositorio (asegúrate de incluir `docs/CNAME` para el dominio personalizado). GitHub Pages debe apuntar al folder `docs` en la rama principal.

## Estructura

- `app.py`: rutas y datos del carrusel.
- `templates/`: vistas Jinja.
- `static/`: estilos e imágenes expuestas por Flask.
- `freeze.py`: script que congela la app a HTML estático.
- `docs/`: salida estática lista para publicar.
