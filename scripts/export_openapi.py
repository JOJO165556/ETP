"""Exporte le schéma OpenAPI de l'application FastAPI vers openapi.json.

Usage :
    python scripts/export_openapi.py

Le fichier généré à la racine du dépôt est la source pour la génération
des types TypeScript du frontend (npm run types:generate dans frontend/).
"""

import json
import os
import sys

# Garantir que la racine du projet est importable quel que soit le cwd
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.main import app  # noqa: E402


def main() -> None:
    schema = app.openapi()
    output = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "openapi.json"
    )
    with open(output, "w", encoding="utf-8") as f:
        json.dump(schema, f, ensure_ascii=False, indent=2)
    print(f"OpenAPI exporté : {output} ({len(schema.get('paths', {}))} routes)")


if __name__ == "__main__":
    main()
