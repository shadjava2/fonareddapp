#!/bin/bash

# Script pour générer des certificats SSL auto-signés pour le développement

set -e

SSL_DIR="./docker/nginx/ssl"
DAYS=365

echo "🔐 Génération des certificats SSL pour le développement..."

# Créer le dossier SSL s'il n'existe pas
mkdir -p "$SSL_DIR"

# Générer la clé privée
openssl genrsa -out "$SSL_DIR/key.pem" 2048

# Générer le certificat auto-signé
openssl req -new -x509 -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" -days $DAYS \
    -subj "/C=FR/ST=France/L=Paris/O=Fonaredd/OU=IT/CN=localhost"

# Ajuster les permissions
chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

echo "✅ Certificats SSL générés dans $SSL_DIR/"
echo "📋 Certificat: $SSL_DIR/cert.pem"
echo "🔑 Clé privée: $SSL_DIR/key.pem"
echo "⏰ Validité: $DAYS jours"
echo ""
echo "⚠️  ATTENTION: Ces certificats sont auto-signés et uniquement pour le développement !"
echo "   Pour la production, utilisez des certificats émis par une autorité de certification."
