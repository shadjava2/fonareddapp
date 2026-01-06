#!/bin/bash

# Script d'entrée pour le conteneur Electron
set -e

echo "🚀 Démarrage de Fonaredd App (Electron)"

# Vérifier que les exécutables existent
if [ ! -f "./Fonaredd App.AppImage" ]; then
    echo "❌ Exécutable Electron non trouvé"
    exit 1
fi

# Rendre l'exécutable... exécutable
chmod +x "./Fonaredd App.AppImage"

# Variables d'environnement pour Electron
export DISPLAY=${DISPLAY:-:0}
export ELECTRON_DISABLE_SANDBOX=1

# Démarrer l'application
echo "▶️ Lancement de l'application..."
exec "./Fonaredd App.AppImage" "$@"
